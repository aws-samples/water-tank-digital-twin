# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
This component process serial information coming from Arduino board located inside plate.

A comma separated string is processed and values are sent for processing over specific IPC topics.

Value received over serial : Level_meter, amps_p1, amps_p2, Flow meter1, Flow meter 2

The serial connection transmit desired leds state back to Arduino.

Script's attributes:
0: Log level
1: Frequency
2: Sensors
3: Outgoing IPC topic
4: Serial port
5: Com port speed
6: IPC Serial simulation
7: IPC Led control
8: Taking data from simulation or from serial link
9: Production state
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
import serial
import sys
import json
import os

COMPONENT_NAME = os.environ.get('COMPONENT_NAME')

evt = Event()
args = sys.argv[1:]

# Set up logging
logging.basicConfig()
log = logging.getLogger()
log.setLevel(args[0])


def error_handler(e):
    log.error("##### IPC Error : {}".format(e))
    return False


class SerialSplit:
    def __init__(self):
        try:
            self.component_name = COMPONENT_NAME
            self.loaded = False
            # Creating a greengrass IPC client
            self.gg_client = GreengrassCoreIPCClientV2()
            # loading configuration
            self.frequency = int(self.load_config("frequency"))
            self.sensors = self.load_config("sensors")
            self.production = bool(self.load_config("prod"))
            self.ipc_out_prefix = self.load_config("ipc_out_prefix")
            self.serial_port = self.load_config("serial_port")
            self.serial_speed = int(self.load_config("serial_speed"))
            self.ipc_serial_simulation = self.load_config("ipc_serial_simulation")
            self.ipc_led_control = self.load_config("ipc_led_control")

            # Led control mechanism
            self.old_cmd = ""
            self.cmd = [1, 0, 0, 0, 0, 0, 0, 0]
            self.led_changed = False

            # Simulation control
            self.serial_data = ""

            # IPC subscriber
            if not self.production:
                self.gg_client.subscribe_to_topic(
                    topic=self.ipc_serial_simulation,
                    on_stream_event=self.simulation_data,
                    on_stream_error=error_handler
                )

            self.gg_client.subscribe_to_topic(
                topic=self.ipc_led_control,
                on_stream_event=self.led_update,
                on_stream_error=error_handler
            )

            self.loaded = True

            # entering lazy loop
            self.lazy_loop()

        except Exception:
            print("#### Error : {}".format(traceback.format_exc()))

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
            log.debug("#### Topic : {}, Value : {}".format(topic, value))
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
    # BUG to test live
    def led_update(self, data):
        try:
            log.debug('#### led_update:{}'.format(data))
            updated_led = data.binary_message.message.decode('utf-8').strip('[]').split(',')

            for i in range(8):
                self.cmd[i] = int(updated_led[i])

            self.led_changed = True
            log.debug('#### self.cmd :{}'.format(self.cmd))
            return
        except Exception:
            print("#### Error led_update : {}".format(traceback.format_exc()))

    def simulation_data(self, data):
        try:
            if not self.production:
                # SubscriptionResponseMessage(binary_message=BinaryMessage(message=b'719,532,533,14,14'))
                log.debug('#### simulation_data {} #####'.format(data))

                payload = data.binary_message.message.decode('utf-8').strip().split(',')

                msg = payload

                if len(msg) == 5:
                    idx = 0
                    for sensor in self.sensors:
                        ipc_topic = "{}{}".format(self.ipc_out_prefix, sensor)
                        log.debug('#### Generate test data on : {}  with {}' .format(self.ipc_out_prefix, sensor))
                        self.transmit_update(ipc_topic, (msg[idx]))
                        idx = idx+1

        except Exception:
            print(traceback.format_exc())

    # read serial interface
    def serial_io_run(self):
        global ser
        try:
            serial_data = ""

            if not ser.isOpen():
                log.debug(" ##### Opening serial port")
                ser = serial.Serial('/dev/ttyS0', 9600, timeout=5)

            if self.production:
                ser.flushInput()
                serial_data = ser.readline().decode(encoding='utf-8', errors='strict').strip('\r\n').split(sep=',')
                log.debug(" ##### serial_io_run data: {}".format(serial_data))

            # read data from sensors, ensure the list is complete as order matters
            if len(serial_data) == 5:
                idx = 0
                for sensor in self.sensors:
                    ipc_topic = "{}{}".format(self.ipc_out_prefix, sensor)
                    self.transmit_update(ipc_topic, (serial_data[idx]))
                    idx = idx + 1

            # send led commands only if running on digital twin platform
            if self.led_changed:
                ser_cmd = ""
                for x in range(8):
                    log.debug("idx : {}, val : {} ".format(int(x), self.cmd[x]))
                    ser_cmd += '{},{}!'.format(int(x), self.cmd[x])

                log.debug(" ##### led_update - ser_cmd  : {} - old: {}".format(ser_cmd, self.old_cmd))
                if ser_cmd != self.old_cmd:
                    ser.write(ser_cmd.encode('utf-8'))
                    ser.flush()
                    self.led_changed = False
                    self.old_cmd = ser_cmd

        except Exception:
            log.error("#### ERROR:  {}".format(traceback.format_exc()))
            ser.close()
        finally:
            # Asynchronously schedule this function to be run again in 100 ms
            Timer(self.frequency, self.serial_io_run).start()


serial_split = SerialSplit()


def loader():
    if not serial_split.loaded:
        log.debug(" ##### starting #### production: {}, loaded: {}".format(serial_split.production, serial_split.loaded))
        Timer(1, loader).start()


loader()

# Collecting data from sensors / sending led array update
if serial_split.loaded and serial_split.production:
    ser = serial.Serial('/dev/ttyS0', 9600, timeout=5)
    serial_split = SerialSplit()
    log.debug(" ##### Running serial_io_run")
    serial_split.serial_io_run()

evt.wait()
