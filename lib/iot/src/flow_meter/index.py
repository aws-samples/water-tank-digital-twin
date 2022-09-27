# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component process raw flow meter data and filter them.
An average window is stored to transmit the middle value once average window size is reached


Script's attributes:
0: Log level
1: Thing Name
2: Update frequency
3: Sensors list
4: Inbound IPC topic
5: Outbound IPC topic prefix
6: Flow activity threshold
7: Averaging size for filtering window

"""
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
    def wrapper(data):
        return functools.partial(func, data)(sensor)
    return wrapper


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    return False


class FlowMeter:
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
            self.avg_size = int(self.load_config("avg_size"))

            # IPC storage
            self.listeners = {}

            # data filtering variables
            self.precedent_value = {}
            self.value_avg = {}

            # Register to IPC
            for sensor in self.sensors:
                self.precedent_value[sensor] = 0
                self.value_avg[sensor] = []
                self.listeners[sensor] = callback(self.value_update, sensor)
                topic = "{}{}".format(self.ipc_in, sensor)
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners[sensor],
                    on_stream_error=error_handler
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
            self.gg_client.publish_to_topic(
                topic=topic,
                publish_message=PublishMessage(
                    binary_message=BinaryMessage(
                        message=str(value)
                    )
                )
            )

        except Exception:
            log.error("#### transmit update error : {}".format(traceback.format_exc()))

    # filter the raw value with an average window
    def filter_value(self, updated_value, sensor):
        try:
            # if len(self.value_avg[sensor]) < int(self.avg_size):
            #     self.value_avg[sensor].append(updated_value)
            # else:
            #     log.info("#### Filtered value: {} from {}".format(self.value_avg[sensor][-1], self.value_avg[sensor]))
            #     self.value_avg[sensor].sort()
            #     self.transmit_update(
            #         self.ipc_out + sensor,
            #         self.value_avg[sensor][int(self.avg_size / 2)]
            #     )
            #     del self.value_avg[sensor][:]
            self.transmit_update(
                self.ipc_out + sensor,
                updated_value
            )
        except Exception:
            log.error("#### Filter value : {}".format(traceback.format_exc()))

    # receive an led array values
    def value_update(self, data, sensor=None):
        try:
            updated_value = data.binary_message.message.decode('utf-8')
            log.info("#### value_update: {} ".format(updated_value))

            if sensor not in self.sensors:
                log.error("Sensor {} not configured!".format(sensor))
                return

            # report all the time
            # if self.precedent_value[sensor] != updated_value:

            self.precedent_value[sensor] = updated_value
            self.filter_value(updated_value, sensor)
            return

        except Exception:
            log.error("#### value update error : {}".format(traceback.format_exc()))


flow_meter = FlowMeter()
Event().wait()
