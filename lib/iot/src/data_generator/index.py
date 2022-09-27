# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component process raw amper meter data and filter them.
An average window is stored to transmit the middle value once average window size is reached


Script's attributes:
0: Log level
1: Update frequency
2: Sensor's list
3: Command's list
4: Simulated IPC Topic message for hardware sensors on Arduino board
5: Command mqtt topic to control the simulation
6: Simulated IPC Topic message for Temperatire sensor on Raspberru
"""
import traceback
from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage,
    QOS
)
import logging
from threading import Timer, Event
import sys
import random
import functools
import os

COMPONENT_NAME = os.environ.get('COMPONENT_NAME')

args = sys.argv[1:]

# Set up logging
logging.basicConfig()
log = logging.getLogger()
log.setLevel(args[0])

def mqtts_callback(func, cmd=None):
    try:
        @functools.wraps(func)
        def wrapper(topic, value):
            return functools.partial(func, topic, value)(cmd)
        return wrapper

    except Exception:
        print(traceback.format_exc())


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    exit(2)


def generate_data(range_min, range_max):
    # log.debug("Generating data within {} and {}".format(range_min, range_max))
    return random.randint(range_min, range_max)


class DataGenerator:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.sensors = self.load_config("sensors")
            self.controls = self.load_config("controls")
            self.ipc_out_serial = self.load_config("serial_simulation_ipc_topic")
            self.mqtts_cmd_topic = self.load_config("mqtts_cmd_prefix")
            self.ipc_out_temperature = self.load_config("temperature_simulation_ipc_topic")

            # IPC storage
            self.precedent_value = {}
            self.leak_requested_state = 0
            self.pump_1_requested_state = 0
            self.pump_2_requested_state = 0

            # Register to MQTTS command
            for cmd in self.controls:
                log.debug("#### Command {} listener".format(cmd))
                self.precedent_value[cmd] = 0
                # topic : digital-twin/mqtts/simulation/cmd/[leak, pump_1_overright, pump_2_overright]
                topic = "{}{}".format(self.mqtts_cmd_topic, cmd)
                self.gg_client.subscribe_to_iot_core(
                    topic_name=topic,
                    qos=QOS.AT_LEAST_ONCE,
                    on_stream_event=self.value_update
                )

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            print(traceback.format_exc())

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
            log.debug("sending update {} to {}".format(topic, value))
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

    # receive a led array values
    def start_generation(self):
        try:
            # todo add parameters for range
            ohms_meter = generate_data(704, 736)
            amps_meter_1 = generate_data(525, 527) if self.pump_1_requested_state == 0 else generate_data(611, 615)
            amps_meter_2 = generate_data(525, 527) if self.pump_2_requested_state == 0 else generate_data(611, 615)
            flow_meter_1 = generate_data(0, 13) if self.leak_requested_state == 0 else generate_data(15, 20)
            # control if a leak is requested. If so, ensure flow 2 is more than 1/2 flow 1
            flow_meter_2 = generate_data(abs(flow_meter_1-3 if flow_meter_1 > 3 else flow_meter_1), flow_meter_1) if self.leak_requested_state == 0 else generate_data(abs(int(flow_meter_1/3)), int(flow_meter_1/3)+1)

            temp_data = generate_data(13, 30)
            self.transmit_update(self.ipc_out_temperature, temp_data)

            update_data = "{},{},{},{},{}".format(
                ohms_meter,
                amps_meter_1,
                amps_meter_2,
                flow_meter_1,
                flow_meter_2
            )

            self.transmit_update(self.ipc_out_serial, update_data)

        except OSError as err:
            log.error(err)

        finally:
            # Asynchronously schedule this function to be run again in 100 ms
            Timer(self.frequency, self.start_generation).start()

    # receive an led array values
    def value_update(self, data):
        # ####### 2 :  data : IoTCoreMessage(message=MQTTMessage(topic_name='digital-twin/mqtts/simulation/cmd/leak', payload=b'0')) ####
        # print("####### 2 :  data : {} #### ".format(data))
        cmd = data.message.topic_name.split('/')[-1]
        updated_value = data.message.payload.decode('utf-8')
        # ### topic: digital-twin/mqtts/simulation/cmd/leak, command: leak, value:0.
        log.debug("#### topic: {}, command: {}, value:{}".format(data.message.topic_name, cmd, updated_value))

        if cmd not in self.controls:
            log.error("Command {} not configured!".format(cmd))
            return None

        if self.precedent_value[cmd] != updated_value:
            self.precedent_value[cmd] = updated_value
            self.state_update(cmd, updated_value)
        return None

    def state_update(self, cmd, requested_state):
        log.debug("#### requested_state : {}".format(requested_state))
        if cmd == "leak":
            self.leak_requested_state = int(requested_state)

        if cmd == "pump_1":
            self.pump_1_requested_state = int(requested_state)

        if cmd == "pump_2":
            self.pump_2_requested_state = int(requested_state)


data_generator = DataGenerator()

data_generator.start_generation()
Event().wait()
