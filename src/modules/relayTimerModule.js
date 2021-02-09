
const GPIO_PIN_RELAY = 1;

var api = null;
var mod = null;

var relayTimerIntervalId = 0;
var relayTimerPeriodMinutes = 0;
var relayTimerStartedAt = -1;

function init( moduleParam, apiParam ) {

	api = apiParam;
	mod = moduleParam;

	mod.getMenuLabel = () => {

		return relayTimerIntervalId === 0 ? "Start timer" : "Stop timer";

	};
	mod.getConfigMenuLabel = () => { return null; };
	mod.getInfoString = getTimerRemainingTimeString;
	mod.finish = ( callback ) => {

		setOutputPin( false, callback );

	};
	mod.menuEntrySelected = function() {

		if ( relayTimerIntervalId === 0 ) {

			// Show start timer menu
			api.tg.clearAllMenus();
			api.tg.sendMenu( api.tg.menusByName[ "Set timer" ] );

		}
		else {

			// Stop timer
			clearTimeout( relayTimerIntervalId );
			relayTimerStartedAt = -1;
			relayTimerPeriodMinutes = 0;
			relayTimerIntervalId = 0;
			setOutputPin( false );
			api.tg.sendTextMessage( "ℹ️ " + api.translation[ "You have stopped the relay timer." ] );
			api.showMainMenu();

		}

	}

	var timesInMinutes = [ 1, 5, 10, 20, 30, 40, 60, 90 ];

	api.tg.createMenu(
		"Set timer",
		2,
		true,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = timesInMinutes.length; i < il; i ++ ) {

				menuLabels.push( timesInMinutes[ i ] + " " + api.translation[ "minutes" ] );

			}

			menuLabels.push( api.translation[ "Return to main menu" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			api.tg.clearAllMenus();

			if ( optionIndex < timesInMinutes.length ) {

				setOutputPin( true );
				relayTimerPeriodMinutes = timesInMinutes[ optionIndex ];
				relayTimerIntervalId = setTimeout( onRelayTimer, relayTimerPeriodMinutes * 60 * 1000 );
				//relayTimerIntervalId = setTimeout( onRelayTimer, relayTimerPeriodMinutes * 1000 );
				relayTimerStartedAt = new Date();

				api.showMainMenu();

			}
			else {

				api.showMainMenu();

			}

		}

	);

	// Set pin as output and write 0
	if ( GPIO_PIN_RELAY >= 0 ) {

		api.spawnProgram( null, "gpio", [ "mode", "" + GPIO_PIN_RELAY, "out" ] );

	}
	setOutputPin( false );

}

function onRelayTimer() {

	setOutputPin( false );

	relayTimerIntervalId = 0;

	api.tg.clearAllMenus();
	if ( api.tg.isMenuShown( "Main menu" ) ) api.showMainMenu();

	api.tg.sendTextMessage(
		"ℹ️ " + api.translation[ "The relay timer has finished" ] +
		" (" + relayTimerPeriodMinutes + " " + api.translation[ "minutes" ] + ")"
	);

}

function setOutputPin( setOn, callback ) {

	if ( GPIO_PIN_RELAY >= 0 ) {

		api.spawnProgram( null, "gpio", [ "write", "" + GPIO_PIN_RELAY, setOn ? "1" : "0" ], callback );

	}
	else {

		if ( callback ) callback();

	}

}

function getTimerRemainingTimeString() {

	if ( relayTimerIntervalId === 0 ) {

		return api.translation[ "Timer is stopped." ];

	}
	else {

		var secondsTotal = relayTimerPeriodMinutes * 60 - Math.floor( ( new Date() - relayTimerStartedAt ) / 1000 );
		var minutes = Math.floor( secondsTotal / 60 );
		var seconds = secondsTotal % 60;
		return api.translation[ "Remaining: " ] + minutes + " " + api.translation[ "minutes" ] + " " + seconds + " " + api.translation[ "seconds" ];

	}

}

if ( typeof module !== 'undefined' ) {

	module.exports = {
		name: "RelayTimer",
		init: init
	};

}
