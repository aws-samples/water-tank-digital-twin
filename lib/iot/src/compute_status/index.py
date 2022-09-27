# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component:
- process flow meters filtered value to detect a leak.

An average moving window is used to transmit the middle value once average window size is reached


Script's attributes:
0: Log level
1: Update frequency
2: Sensors list
3: Computation list
4: Inbound IPC topic
5: Outbound IPC topic prefix
6: Minium level resistance
7: Maximum level resistance
8: Water Tank Capacity Simulation
"""
import traceback

from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage,
    GetConfigurationRequest,
    GetConfigurationResponse
)
import json
import logging
from threading import Timer, Event
import sys
import functools
import os

COMPONENT_NAME = os.environ.get('COMPONENT_NAME')

args = sys.argv[1:]

# Set up logging
logging.basicConfig()
log = logging.getLogger()
log.setLevel(args[0])


def callback(func, sensor=None):
    @functools.wraps(func)
    def wrapper(data):
        return functools.partial(func, data)(sensor)
    return wrapper


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    return False


class ComputeStatus:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.sensors = self.load_config("sensors")
            self.computes = self.load_config("computes")
            self.ipc_in = self.load_config("ipc_in_prefix")
            self.ipc_out = self.load_config("ipc_out_prefix")
            self.ohms_min_level = int(self.load_config("ohms_min_level"))
            self.ohms_max_level = int(self.load_config("ohms_max_level"))
            self.capacity = int(self.load_config("capacity"))
            self.amps_activity_threshold = int(self.load_config("amps_activity_threshold"))
            self.leak_delta = int(self.load_config("leak_delta"))
            # self.state_switch_threshold = int(self.load_config("state_switch_threshold"))

            self.state_counter = 0
            self.leak_state = 2
            self.state_reported = False
            # Tank Water Volume
            self.volume = 0

            # BUG
            self.pump_active = [1, 1]

            # IPC storage
            self.listeners = {}

            # data filtering variables
            self.precedent_value = {}
            self.value_avg = {}
            # Register to IPC
            for sensor in self.sensors:
                self.precedent_value[sensor] = 0
                log.debug("#### Store {} listener".format(sensor))
                self.listeners[sensor] = callback(self.value_update, sensor)
                log.debug("#### IPC Subscribe binary: {}".format(sensor))
                topic = "{}{}".format(self.ipc_in, sensor)
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners[sensor],
                    on_stream_error=error_handler
                )

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            log.error("###### __init__ catch : {} ".format(traceback.format_exc()))

    def load_config(self, key):
        try:
            temp = self.gg_client.get_configuration(
                component_name=self.component_name,
                key_path=[key]).value[key]
            log.debug("#### Received from config for {} : {}".format(key, temp))
            return temp

        except Exception:
            log.error("#### Reading configuration error : {}".format(traceback.format_exc()))

    def lazy_loop(self):
        Timer(5, self.lazy_loop).start()

    # Transmit the value over IPC
    def transmit_update(self, topic, value):
        try:
            log.info("###### transmit_update topic : {}".format(topic))
            self.gg_client.publish_to_topic(
                topic=topic,
                publish_message=PublishMessage(
                    binary_message=BinaryMessage(
                        message=str(value)
                    )
                )
            )

        except Exception:
            print(traceback.format_exc())

    # check if we have a leak only on flow sensor 2 data
    def check_status(self):
        try:
            leak = False
            # first flow sensor always have full flow. Second have full flow if no leak
            # State :
            # 1 : Leak
            # 2 : Run
            # 3 : Idle
            status = 3

            if 1 in self.pump_active:
                status = 1 if int(self.precedent_value["flow_meter_1"]) - int(self.precedent_value["flow_meter_2"]) > int(self.leak_delta) and int(self.precedent_value["flow_meter_1"]) > 1 else 2
            else:
                status = 3

            self.transmit_update(
                self.ipc_out + "leak",
                status
            )

        except Exception:
            print(traceback.format_exc())

    def check_pump_activity(self, sensor):
        try:

            pump_number = int(sensor.split("_")[-1])

            # check if amps sensors are above thresholds # bug value in precedent
            new_state = 1 if int(self.precedent_value[sensor]) > int(self.amps_activity_threshold) else 0
            log.info("#### {} active? {} current: {}, threshold: {}".format(sensor, new_state, self.precedent_value[sensor], self.amps_activity_threshold))

            sensor = "pump_{}_active".format(pump_number)
            if not new_state == self.pump_active[pump_number-1]:
                self.transmit_update(
                    self.ipc_out + sensor,
                    new_state
                )

            self.pump_active[pump_number-1] = new_state

        except Exception:
            print(traceback.format_exc())

    def check_volume_level(self):
        try:
            level_meter_resistance = int(self.precedent_value["ohms_meter"])
            log.info("#### volume_computation : {}".format(level_meter_resistance))

            if (level_meter_resistance <= self.ohms_min_level) and (self.ohms_max_level < self.ohms_min_level):
                scale = ((self.ohms_min_level - level_meter_resistance) / (
                    (self.ohms_min_level - self.ohms_max_level)))

                volume = round(self.capacity * scale, 2)

                self.volume = volume
                self.transmit_update(
                    self.ipc_out + "volume_level",
                    volume
                )
                log.info("#### volume : {}".format(volume))
            log.info("#### Debug volume : {} < {} = {}".format(level_meter_resistance , self.ohms_min_level, level_meter_resistance < self.ohms_min_level))

        except Exception:
            print(traceback.format_exc())

    # receive an led array values
    def value_update(self, data, sensor=None):
        updated_value = data.binary_message.message.decode('utf-8')
        log.info("#### value update for {} : {}".format(sensor, updated_value))

        if sensor not in self.sensors:
            log.error("Sensor {} not configured!".format(sensor))
            return

        self.precedent_value[sensor] = updated_value

        if sensor in ["amps_meter_1", "amps_meter_2"]:
            self.check_pump_activity(sensor)
        elif sensor in ["ohms_meter"]:
            self.check_volume_level()

        # send alarm at each update (pump2 does not have flow meter sensors)
        self.check_status()


compute_status = ComputeStatus()
Event().wait()
