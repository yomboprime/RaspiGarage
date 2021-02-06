# RaspiGarage
Telegram bot for controlling things (IoT) in a Raspberry Pi

Features:

	- Control a GPIO pin (usually connected to a relay) with timer and Telegram notifications. Uses wiringpi library.
	- Get still images from a webcam in your Telegram client. Uses fswebcam package.

## Quick install

```sudo apt install fswebcam wiringpi```

```git clone https://github.com/yomboprime/RaspiGarage.git```

```cd RaspiGarage```

```npm install```

	- Create the file ```RaspiGarage/config/token``` and copy the token for your bot in it, without line breaks.
	- Set the script ```RaspiGarage/run.sh``` to execute at system boot up. You may want to add the following lines to the end of the file ```/etc/rc.local```:

```
/home/pi/TeleHomeGuard/run.sh || exit 1

exit 0```

