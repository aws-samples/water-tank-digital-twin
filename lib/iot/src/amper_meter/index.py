# Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
# Licensed under the Amazon Software License  http://aws.amazon.com/asl/
"""
This component process raw amper meter data and filter them.
An average window is stored to transmit the middle value once average window size is reached


Script's attributes:
0: Log level
1: Update frequency
2: Sensors list
3: Inbound IPC topic
4: Outbound IPC topic prefix
5: Amper activity thresholds
6: Averaging size
"""
import traceback
from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage,
    GetConfigurationRequest
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


class AmperMeter:
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
            self.amps_activity_threshold = int(self.load_config("amps_activity_threshold"))
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
                log.debug("#### IPC Subscribed")

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
            print(traceback.format_exc())

    # filter the raw value with an average window
    def filter_value(self, updated_value, sensor):
        log.debug("#### Filtering new value {}".format(updated_value))

        # if len(self.value_avg[sensor]) < int(self.avg_size):
        #     self.value_avg[sensor].append(updated_value)
        # else:
        #     self.value_avg[sensor].sort()
        #     log.debug("#### Filtered value: {} from {}".format(self.value_avg[sensor], self.value_avg))
        #     self.transmit_update(
        #         self.ipc_out + sensor,
        #         self.value_avg[sensor][int(self.avg_size / 2)]
        #     )
        #     del self.value_avg[sensor][:]
        self.transmit_update(
            self.ipc_out + sensor,
            updated_value
        )

    # receive an led array values
    def value_update(self, data, sensor=None):
        log.debug('#### value_update {} #####'.format(data))
        log.debug('#### sensor {}  #####'.format(sensor))

        updated_value = data.binary_message.message.decode('utf-8')

        if sensor not in self.sensors:
            log.error("Sensor {} not configured!".format(sensor))
            return

        if self.precedent_value[sensor] != updated_value:
            self.precedent_value[sensor] = updated_value
            self.filter_value(updated_value, sensor)
        return


amper_meter = AmperMeter()

Event().wait()
