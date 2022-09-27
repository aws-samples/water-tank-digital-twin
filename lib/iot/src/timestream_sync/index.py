# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component process all shadow Twin data and store it to Timestream.


Script's attributes:
0: Log level
1: Update frequency
2: Sensor's list
3: Actuator's list
4: Alarm's list
5: IPC prefix in
6: MQTTS topic out Telemetry
7: MQTTS topic out Alarm
8: Telemetry asset id
9: Telemetry asset type
10: Alarm entity id
11: Alarm asset id
12: Compute datapoint
13: Compute IPC prefix
BUG ALARM Asset ID
"""
import json
import traceback
from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    QOS
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


def sensor_callback(func, sensor=None):
    try:
        @functools.wraps(func)
        def wrapper(data):
            return functools.partial(func, data)(sensor)

        return wrapper

    except Exception:
        print("ERROR : {}".format(traceback.format_exc()))


def compute_callback(func, compute=None):
    try:
        @functools.wraps(func)
        def wrapper(data):
            return functools.partial(func, data)(compute)

        return wrapper

    except Exception:
        print("ERROR : {}".format(traceback.format_exc()))


def alarm_callback(func, alarm=None):
    try:
        @functools.wraps(func)
        def wrapper(data):
            return functools.partial(func, data)(alarm)
        return wrapper

    except Exception:
        print("ERROR : {}".format(traceback.format_exc()))


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    return False


class TimestreamSync:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.sensors = self.load_config("sensors")
            self.computes = self.load_config("computes")
            self.alarms = self.load_config("alarms")
            self.ipc_in_prefix = self.load_config("ipc_in_prefix")
            self.mqtts_out_telemetry = self.load_config("mqtts_out_telemetry")
            self.mqtts_out_alarm = self.load_config("mqtts_out_alarm")
            self.telemetry_asset_id = self.load_config("telemetry_asset_id")
            self.telemetry_asset_type = self.load_config("telemetry_asset_type")
            self.alarm_key_id = self.load_config("alarm_key_id")
            self.alarm_asset_id = self.load_config("alarm_asset_id")
            self.ipc_compute_prefix = self.load_config("ipc_compute_prefix")
            self.mqtts_comm_control_topic = self.load_config("mqtts_comm_control_topic")
            self.communication = int(self.load_config("default_reporting_state"))

            # Register to IPC for sensors
            self.listeners_sensors = {}
            for sensor in self.sensors:
                self.listeners_sensors[sensor] = sensor_callback(self.report_telemetry, sensor)
                topic = "{}{}".format(self.ipc_in_prefix, sensor)
                log.info("####### sensor : {}".format(topic))
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners_sensors[sensor],
                    on_stream_error=error_handler
                )

            # Register to IPC for computation messages
            self.listeners_computes = {}
            for compute in self.computes:
                self.listeners_computes[compute] = compute_callback(self.report_compute, compute)
                topic = "{}{}".format(self.ipc_compute_prefix, compute)
                log.info("####### compute : {}".format(topic))
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners_computes[compute],
                    on_stream_error=error_handler
                )

            # Register to IPC for alarms
            self.listeners_alarms = {}
            for alarm in self.alarms:
                self.listeners_alarms[alarm] = alarm_callback(self.report_alarms, alarm)
                topic = "{}{}".format(self.ipc_compute_prefix, alarm)
                log.info("####### alarm : {}".format(topic))
                self.gg_client.subscribe_to_topic(
                    topic=topic,
                    on_stream_event=self.listeners_alarms[alarm],
                    on_stream_error=error_handler
                )

            # Register to IPC for control
            log.info("####### Control : {}".format(self.mqtts_comm_control_topic))

            self.gg_client.subscribe_to_iot_core(
                topic_name=self.mqtts_comm_control_topic,
                qos=QOS.AT_LEAST_ONCE,
                on_stream_event=self.manage_communication,
                on_stream_error=error_handler
            )

            self.lazy_loop()

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))

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

    # Transmit sensor's update to IoT Core
    def report_telemetry(self, data, sensor=None):
        try:
            log.info("##### Sending telemetry {} from {} to IoT Core".format(data, sensor))
            msg = {sensor: float(data.binary_message.message.decode('utf-8'))}

            self.transmit_message(self.mqtts_out_telemetry, msg)

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))

    # Transmit compute update to IoT Core
    def report_compute(self, data, compute=None):
        try:
            log.info("##### Sending compute {} from {} to IoT Core".format(data, compute))
            msg = {compute: float(data.binary_message.message.decode('utf-8'))}

            self.transmit_message(self.mqtts_out_telemetry, msg)

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))

    # Transmit  alarms to IoT Core
    def report_alarms(self, data, alarm=None):
        try:
            log.info("##### Sending alarm {} from {} to IoT Core".format(data, alarm))
            msg = {alarm: float(data.binary_message.message.decode('utf-8'))}

            self.transmit_message(self.mqtts_out_alarm, msg)

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))

    def transmit_message(self, topic, msg):
        try:
            log.info("##### transmitting alarm {} from {} to IoT Core allowed ? {}".format(topic, msg, self.communication))
            if self.communication == 1:
                self.gg_client.publish_to_iot_core(
                    topic_name=topic,
                    qos=QOS.AT_LEAST_ONCE,
                    payload=json.dumps(msg)
                )

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))

    def manage_communication(self, data):
        try:
            log.info("##### Toggling communication, was {} before".format(self.communication))
            self.communication = int(data.message.payload.decode('utf-8'))

        except Exception:
            print("ERROR : {}".format(traceback.format_exc()))


timestream_sync = TimestreamSync()
Event().wait()
