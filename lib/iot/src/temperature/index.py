# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component process read temperatute from Raspberry PI sensor.
It report the temperature (not yet by exception) on topic `digital-twin/ipc/state/temperature`
For simulation, `digital-twin/ipc/raw/temperature` is provided by data generator component over IPC
Temperature is reported by exception

Script's attributes:
0: Log level
1: Update frequency
2: Sensors list
3: Inbound IPC topic
4: Outbound IPC topic prefix
5: Temperature sensor's base directory
6: Temperature simulation topic
7: Average size for filtering
8: Taking data from simulation or from serial link
"""
import traceback

from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage
)
import glob
import logging
from threading import Timer, Event
import sys
import functools
import random
import json
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


def generate_temperature(t_ref):
    temp_min = float(t_ref - 1.0)
    temp_max = float(t_ref + 1.0)
    return random.randrange(int(temp_min*10), int(temp_max*10)) / 10


class Temperature:
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
            self.base_dir = self.load_config("temperature_base_dir")
            self.avg_size = int(self.load_config("avg_size"))
            self.production = bool(self.load_config("prod"))

            # IPC storage
            self.listeners = {}
            # data filtering variables
            self.precedent_value = {}
            self.value_avg = {}

            # Register to IPC
            if not self.production:
                for sensor in self.sensors:
                    self.precedent_value[sensor] = 0
                    self.value_avg[sensor] = []
                    # log.debug("#### Store {} listener".format(sensor))
                    self.listeners[sensor] = callback(self.value_update, sensor)
                    # log.debug("#### IPC Subscribe binary: {}".format(sensor))
                    topic = "{}{}".format(self.ipc_in, sensor)
                    self.gg_client.subscribe_to_topic(
                        topic=topic,
                        on_stream_event=self.listeners[sensor],
                        on_stream_error=error_handler
                    )

            # Temperature sensor
            self.found = False
            self.device_file = ''
            self.temp_c_ref = 0
            self.measure_temperature()

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            log.error("#### Error : {}".format(traceback.format_exc()))

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
            print("##### Error : {}".format(traceback.format_exc()))

    # filter the raw value with an average window
    def filter_value(self, updated_value, sensor):
        try:
            # log.debug("#### Filtering new value {}".format(updated_value))

            if len(self.value_avg[sensor]) < int(self.avg_size):
                self.value_avg[sensor].append(updated_value)
            else:
                self.value_avg[sensor].sort()
                log.debug("#### Filtered value: {} from {}".format(self.value_avg[sensor], self.value_avg))
                self.transmit_update(
                    self.ipc_out + sensor,
                    self.value_avg[sensor][int(int(self.avg_size) / 2)]
                )
                del self.value_avg[sensor][:]
        except Exception:
            print("##### Error : {}".format(traceback.format_exc()))

    # receive an led array values
    def value_update(self, data, sensor=None):
        try:
            updated_value = data.binary_message.message.decode('utf-8')

            if sensor not in self.sensors:
                log.error("Sensor {} not configured!".format(sensor))
                return

            if self.precedent_value[sensor] != updated_value:
                self.precedent_value[sensor] = updated_value
                self.filter_value(updated_value, sensor)
            return

        except Exception:
            print("##### Error : {}".format(traceback.format_exc()))

    def get_device_file_path(self):
        try:
            if len(glob.glob(self.base_dir)) > 0:
                return glob.glob(self.base_dir)[0] + '/w1_slave'
            else:
                print('device_folder not found in ' + self.base_dir)
                return ''
        except Exception:
            print("##### Error : {}".format(traceback.format_exc()))

    def read_temp(self):
        try:
            self.found = False
            temp_c = 0
            lines = []
            f = ""

            if self.device_file == '':
                self.device_file = self.get_device_file_path()
                if self.device_file == '':
                    return
            try:
                f = open(self.device_file, 'r')
                lines = f.readlines()
                f.close()
            except Exception as ex:
                log.error("#### Something went wrong when reading the file : {}, error : {}".format(self.device_file, ex))
            finally:
                f.close()

            if len(lines) == 2:
                if lines[0].strip()[-3:] == 'YES' and lines[1].find('t=') != -1:
                    temp_string = lines[1][lines[1].find('t=') + 2:]
                    temp_c = float(temp_string) / 1000.0
                    self.found = True
            else:
                log.info('Wrong file format')
            return temp_c
        except Exception:
            print("##### Error : {}".format(traceback.format_exc()))

    def measure_temperature(self):
        try:
            # disabling the conditional screen update from lcd manager side to allow correct datapoint
            temp_c = 0.0
            if self.production:
                temp_c = self.read_temp()
            else:
                self.found = True
                temp_c = generate_temperature(self.temp_c_ref)

            # bug use shadow for param
            # if self.found and abs(self.temp_c_ref - temp_c) > 0.1:
            if self.found:
                self.temp_c_ref = temp_c
                self.transmit_update("{}{}".format(self.ipc_out, "temperature"), self.temp_c_ref)
            # else:
            #     log.debug('no change in temperature :' + str(self.temp_c_ref))
        except Exception:
            print("##### Error : {}".format(traceback.format_exc()))
        finally:
            Timer(float(self.frequency), self.measure_temperature).start()


temperature = Temperature()

Event().wait()
