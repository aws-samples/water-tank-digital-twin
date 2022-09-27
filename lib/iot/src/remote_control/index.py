# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component:
- process mqtts commands to activate / deactivate a pump


Script's attributes:
0: Log level
1: Thing name
2: Update frequency
3: Actuator list
4: Inbound MQTTS topic prefix
5: Outbound IPC topic prefix
6: Relay pin controlling pump_1
7: Relay pin controlling pump_2
"""
import time
import traceback

from awsiot.greengrasscoreipc.clientv2 import (
    GreengrassCoreIPCClientV2
)

from awsiot.greengrasscoreipc.model import (
    PublishMessage,
    BinaryMessage,
    QOS
)
import json
import logging
from threading import Timer, Event
import sys
import functools
from gpiozero import DigitalOutputDevice
import os

COMPONENT_NAME = os.environ.get('COMPONENT_NAME')

args = sys.argv[1:]

# Set up logging
logging.basicConfig()
log = logging.getLogger()
log.setLevel(args[0])


def mqtts_callback(func, actuator=None):
    try:
        @functools.wraps(func)
        def wrapper(topic, value):
            return functools.partial(func, topic, value)(actuator)
        return wrapper

    except Exception:
        print(traceback.format_exc())


def callback(func, actuator=None):
    @functools.wraps(func)
    def wrapper(data):
        return functools.partial(func, data)(actuator)
    return wrapper


def error_handler(e):
    log.error("##### Library Error : {}".format(e))
    return False


class RemoteControl:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.actuators = self.load_config("actuators")
            self.mqtts_in_prefix = self.load_config("mqtts_in_prefix")
            self.ipc_out_prefix = self.load_config("ipc_out_prefix")
            self.pump_1_pin = int(self.load_config("relay_pump_1_pin"))
            self.pump_2_pin = int(self.load_config("relay_pump_2_pin"))
            self.leak_pin = int(self.load_config("leak_pin"))
            self.demo_regular_operation_time = int(self.load_config("demo_regular_operation_time"))
            self.demo_leak_time = int(self.load_config("demo_leak_time"))
            self.demo_recovery_time = int(self.load_config("demo_recovery_time"))
            self.demo_drain_time = int(self.load_config("demo_drain_time"))
            self.default_state_pump_1 = int(self.load_config("default_state_pump_1"))
            self.default_state_pump_2 = int(self.load_config("default_state_pump_2"))
            self.default_state_leak = int(self.load_config("default_state_leak"))

            # MQTTS storage
            self.listeners = {}

            for actuator in self.actuators:
                log.debug("#### Actuator {} listener".format(actuator))
                # topic : WaterTank_42/pump_1
                topic = "{}{}".format(self.mqtts_in_prefix, actuator)
                self.gg_client.subscribe_to_iot_core(
                    topic_name=topic,
                    qos=QOS.AT_LEAST_ONCE,
                    on_stream_event=self.value_update,
                    on_stream_error=error_handler
                )

            # setup GPIO pins to control relays
            self.pump_1 = DigitalOutputDevice(self.pump_1_pin, active_high=True, initial_value=True)
            self.pump_2 = DigitalOutputDevice(self.pump_2_pin, active_high=True, initial_value=True)
            self.leak = DigitalOutputDevice(self.leak_pin, active_high=True, initial_value=True)

            if self.default_state_pump_1 == 1:
                self.pump_1.on()
            else:
                self.pump_1.off()

            if self.default_state_pump_2 == 1:
                self.pump_2.on()
            else:
                self.pump_2.off()

            if self.default_state_leak == 1:
                self.leak.on()
            else:
                self.leak.off()

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            print("###### __init__ catch : {} ".format(traceback.format_exc()))

    def load_config(self, key):
        try:
            temp = self.gg_client.get_configuration(
                component_name=self.component_name,
                key_path=[key]).value[key]
            log.debug("#### Received from config for {} : {}".format(key, temp))
            return temp

        except Exception:
            log.error("#### Reading configuration error : {}".format(traceback.format_exc()))

    # BUG remove lazy loop for event.wait()/event.set()
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

    # receive an MQTTS Commands
    def value_update(self, data):
        try:
            actuator = data.message.topic_name.split('/')[-1]
            cmd = data.message.payload.decode('utf-8')
            log.info("#### cmd update for {} : {}".format(actuator, cmd))

            if actuator not in self.actuators:
                log.error("Actuator {} not configured!".format(actuator))
                return None

            if actuator in ["pump_1", "pump_2"]:
                self.set_relay_activity(actuator, cmd)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, cmd)
                # Quick Fix: stop the pumps automatically
                # bug in convention start with 0 or 1 different in WT
                if int(cmd) == 0:
                    time.sleep(15)
                    self.set_relay_activity(actuator, 0)
                    self.transmit_update(topic, 0)

            if actuator in ["leak"]:
                self.set_relay_activity(actuator, cmd)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, cmd)
                # Quick Fix: stop the leak automatically
                if int(cmd) == 1:
                    time.sleep(10)
                    self.set_relay_activity(actuator, 0)
                    self.transmit_update(topic, 0)

            if actuator in ["demo"]:
                # start pump 1
                actuator = "pump_1"
                self.set_relay_activity(actuator, 0)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 0)
                time.sleep(self.demo_regular_operation_time)

                # BUG Add water level check.
                # start leak
                actuator = "leak"
                self.set_relay_activity(actuator, 1)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 1)
                time.sleep(self.demo_leak_time)

                # stop leak
                self.set_relay_activity(actuator, 0)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 0)
                time.sleep(self.demo_recovery_time)

                # stop pump_1
                actuator = "pump_1"
                self.set_relay_activity(actuator, 1)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 1)
                # Cleanup water tank
                # start pump_2
                actuator = "pump_2"
                self.set_relay_activity(actuator, 0)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 0)
                time.sleep(self.demo_drain_time)

                # stop pump_2
                self.set_relay_activity(actuator, 1)
                topic = "{}{}".format(self.ipc_out_prefix, "{}_overright".format(actuator))
                self.transmit_update(topic, 1)

        except Exception:
            print("###### catch : {} ".format(traceback.format_exc()))

    # process cmd
    def set_relay_activity(self, actuator, cmd):
        try:
            log.info("#### applying cmd for {} : {}".format(actuator, cmd))
            if actuator == "pump_1":
                if int(cmd) == 1:
                    self.pump_1.on()
                else:
                    self.pump_1.off()
            elif actuator == "leak":
                if int(cmd) == 1:
                    self.leak.on()
                else:
                    self.leak.off()
            elif actuator == "pump_2":
                if int(cmd) == 1:
                    self.pump_2.on()
                else:
                    self.pump_2.off()
        except Exception:
            print("###### catch : {} ".format(traceback.format_exc()))


remote_control = RemoteControl()
Event().wait()
