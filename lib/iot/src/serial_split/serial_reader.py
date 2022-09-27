import logging
import traceback
from threading import Timer, Event
import serial

evt = Event()
# Set up logging
logging.basicConfig()
log = logging.getLogger()
log.setLevel("DEBUG")

log.debug("##### configuring serial port")
ser = serial.Serial('/dev/ttyS0', 9600, timeout=1)

def read_serial():
    try:

        log.debug("##### Reading data")

        elem = ser.readlines(1)
        print("#### RAW data: {}".format(elem))
        print("#### Elem: {}".format(elem[0].decode(encoding='utf-8', errors='strict').strip().split(sep=',')))

        ser_cmd = '0,1!1,1!2,3!3,2!4,2!5,1!6,2!7,3!'
        ser.write(ser_cmd.encode('utf-8'))

    except Exception:
        log.error("#### {}".format(traceback.format_exc()))

    Timer(1, read_serial).start()


read_serial()
evt.wait()