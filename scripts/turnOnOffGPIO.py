#!/usr/bin/env python

import os
import sys

if not os.getegid() == 0:
    sys.exit( 'Script must be run as root' )

from pyA20.gpio import gpio
from pyA20.gpio import port

pin = port.PA12

gpio.init()
gpio.setcfg(pin, gpio.OUTPUT)
gpio.output(pin, sys.argv[1])