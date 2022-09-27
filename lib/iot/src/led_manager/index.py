# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import traceback
from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage
)
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
    def wrapper(value):
        return functools.partial(func, value)(sensor)
    return wrapper


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    return False


class LedManager:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.sensors = self.load_config("sensors")
            self.ipc_in = self.load_config("ipc_in_prefix")
            self.ipc_out = self.load_config("ipc_out_prefix")

            # IPC storage
            self.listeners = {}

            # data filtering variables
            self.precedent_value = {}

            # pumps override BUG
            self.pump_1_overright = 0
            self.pump_2_overright = 0
            self.leak_overright = 0

            # Register to IPC
            for sensor in self.sensors:
                self.precedent_value[sensor] = 0
                self.listeners[sensor] = callback(self.value_update, sensor)
                topic = "{}{}".format(self.ipc_in, sensor)
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners[sensor],
                    on_stream_error=error_handler
                )

            # Transmit command for led init

            current_state = [1, 1, 2, 2, 1, 4, 4, 4]
            topic = "{}led_manager".format(self.ipc_out)
            self.transmit_update(
                topic,
                current_state
            )
            self.leds_state = current_state[:]

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            log.error("#### Init Error : {}".format(traceback.format_exc()))

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

    # receive an led array values
    """
   Led array
       0	Watertank powered	Start all orange, then 1st led green 
       1	Greengrass started	Green when greengrass started
       2	Manual Pump 1 ON/OFF		Green when power usage detected
       3	Manual Pump 2 ON/OFF		Green when power usage detected
       4	Leak OFF/ON		    Red when there is leak 
       5	Remote leak control	Green when not activated
       6	Remote Override Blue Remote override. (should be activated manually 1st to pump)
       7	Remote Override	Blue Remote override. (should be activated manually 1st to pump)

       //Color: , green, red, blue , amzn
   """
    # Transmit the value over IPC
    def transmit_update(self, topic, value):
        try:
            self.gg_client.publish_to_topic(
                topic=topic,
                publish_message=PublishMessage(
                    binary_message=BinaryMessage(
                        message=str(value)
                    )
                )
            )

        except Exception:
            log.error("#### transmit_update error : {}".format(traceback.format_exc()))

    def value_update(self, value, sensor=None):
        try:
            log.info("##### Value received {} {}".format(sensor, value))
            updated_value = int(value.binary_message.message.decode('utf-8'))
            log.debug("#### value: {}".format(updated_value))

            if sensor not in self.sensors:
                log.error("Sensor {} not configured!".format(sensor))
                return

            current_state = self.leds_state[:]
            log.info("##### old state {}".format(current_state))

            # String led_color[5] ={"000000","00FF00","FF0000","0000FF","FF9900"} ;
            if sensor == "pump_1_active":
                # red if pump active else green
                current_state[2] = 1 if updated_value == 1 else 2
                # red if pump active else (blue if overright active else green )
                current_state[6] = 1 if updated_value == 1 else 3 if self.pump_1_overright == 1 else 2
            elif sensor == "pump_2_active":
                current_state[3] = 1 if updated_value == 1 else 2
                current_state[7] = 1 if updated_value == 1 else 3 if self.pump_2_overright == 1 else 2
            elif sensor == "leak":
                current_state[4] = 2 if updated_value == 1 else 1
            elif sensor == "leak_overright":
                self.leak_overright = updated_value
                current_state[5] = 3 if int(self.leak_overright) == 1 else 2
            elif sensor == "pump_1_overright":
                self.pump_1_overright = updated_value
                current_state[6] = 3 if int(self.pump_1_overright) == 1 else 2
            elif sensor == "pump_2_overright":
                self.pump_2_overright = updated_value
                current_state[7] = 3 if int(self.pump_2_overright) == 1 else 2

            log.info("##### new state {} {}".format(self.leds_state, current_state))

            if not self.leds_state == current_state:
                log.debug("#### updating led array : {}".format(current_state))
                topic = "{}led_manager".format(self.ipc_out)
                self.transmit_update(
                    topic,
                    current_state
                )
                self.leds_state = current_state[:]

            log.debug("#### Led state: {}".format(self.leds_state))
            return

        except Exception:
            log.error("#### value update error : {}".format(traceback.format_exc()))


led_manager = LedManager()

Event().wait()
