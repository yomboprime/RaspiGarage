# RaspiGarage
Telegram bot for controlling things (IoT) in a Raspberry Pi

Features implemented so far:

	- Control a GPIO pin (usually connected to a relay) with timer and Telegram notifications. Uses wiringpi library.
	- Get still images from a webcam in your Telegram client. Uses fswebcam package.
	- Update, shut off or restart the system and the application from a menu in your Telegram client.

Please note: using relays and mains voltage is dangerous. By using this software you accept the MIT License and are on your own about the risks involved.

## Quick install

```sudo apt install fswebcam wiringpi```

```git clone https://github.com/yomboprime/RaspiGarage.git```

```cd RaspiGarage```

```npm install```

- Create the file ```RaspiGarage/config/token``` and copy in it the token for your bot, without line breaks.

- Execute the program to know your user_id. The bot will only communicate with you. From the RaspiGarage folder:

```npm start```

- The console will show that the Telegram bot has started. Then, from your Telegram client, send a text message to the bot, some characters will do. In the console you will see your Telegram id (a number).

- Close the program by pressing ```Ctrl-c```

- Create the file ```RaspiGarage/config/chat_id``` and copy in it your Telegram id you just saw in the console.

Now the bot is ready to run, by issuing the command ```npm start```. You just will see a menu in your Telegram client chat with the bot.


## Setting the bot to execute at system boot up

Set the script ```RaspiGarage/run.sh``` to execute at system boot up. You may want to add the following lines to the end of the file ```/etc/rc.local```:

```
/home/pi/TeleHomeGuard/run.sh || exit 1

exit 0
```

