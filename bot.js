
// - Requires -

const PNG = require( 'pngjs' ).PNG;
const fs = require( 'fs' );
const pathJoin = require( 'path' ).join;
const { spawn, exec } = require( 'child_process' );

const tg = require( './src/telegram.js' );

// - Global variables -

var CONFIG_PATH = "./config/config.json";
var serverConfig = null;
var TRANSLATION_PATH = "./config/translations/";
var translation = null;
var LANGUAGES_CODES_PATH = "./config/translations/languageCodes.json";
var languagesCodes = null;

var isAppEnding = false;
var modules = [];
var api = null;

const USER_IDLE = 0;
var userResponseState = USER_IDLE;

const EXIT_NO_ACTION = 0;
const EXIT_ERROR = 1;
const EXIT_REBOOTING = 2;
const EXIT_POWER_OFF = 3;

// - Main code -

initServer();

// - End of main code -


// - Functions -

function initServer() {

	process.on( "SIGINT", function() {

		console.log( "  SIGINT Signal Received, shutting down" );

		finish( EXIT_NO_ACTION );

	} );

	// Load config
	serverConfig = loadFileJSON( CONFIG_PATH, "utf8" );
	if ( serverConfig === null ) {

		console.log( "Error loading config file EnsaimediaConfig.json. Please check its syntax." );
		process.exit( 1 );

	}

	languagesCodes = loadFileJSON( LANGUAGES_CODES_PATH, "utf8" );
	if ( languagesCodes === null ) {

		console.log( "Error loading languages codes file: " + LANGUAGES_CODES_PATH + ". Please check its syntax." );
		process.exit( 1 );

	}
	languagesCodes.sort();

	loadTranslation();

	tg.startTelegram(
		loadFile( "./config/token" ),
		parseInt( loadFile( "./config/chat_id" ) ),
		parseUserInput,
		translation,
		() => {

		tg.sendTextMessage( "ℹ️ " + translation[ "Telegram bot has started." ] );

		tg.menusEnabled = true;

		modules = loadModules();
		if ( modules === null ) {

			console.log( "Error loading modules." );
			process.exit( 1 );

		}

		createMainMenu();

		showMainMenu();

	} );

}

function createMainMenu() {

	tg.createMenu( "Main menu", 1, false,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = modules.length; i < il; i ++ ) {

				menuLabels.push( translation[ modules[ i ].getMenuLabel() ] );

			}

			menuLabels.push( translation[ "Configuration" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			tg.clearAllMenus();
			if ( optionIndex < modules.length ) {

				if ( ! modules[ optionIndex ].menuEntrySelected ) console.log( "Error: module " + modules[ optionIndex ].name + " does not define main menu handler." );
				else modules[ optionIndex ].menuEntrySelected();

			}
			else tg.sendMenu( tg.menusByName[ "Configuration menu" ] );

		}
	);

	tg.createMenu( "Configuration menu", 1, false,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = modules.length; i < il; i ++ ) {

				var configMenuLabel = modules[ i ].getConfigMenuLabel();
				if ( configMenuLabel && tg.menusByName[ configMenuLabel ] ) {

					menuLabels.push( translation[ configMenuLabel ] );

				}
				else {

					menuLabels.push( null );

				}

			}

			menuLabels.push( translation[ "Restart computer" ] );
			menuLabels.push( translation[ "Shut down computer" ] );
			menuLabels.push( translation[ "Update system" ] );
			menuLabels.push( translation[ "Change language" ] );
			menuLabels.push( translation[ "Return to main menu" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			if ( optionIndex < modules.length ) {

				var moduleConfigMenu = tg.menusByName[ modules[ optionIndex ].getConfigMenuLabel() ];
				if ( moduleConfigMenu ) {

					tg.clearAllMenus();
					tg.sendMenu( moduleConfigMenu );

				}
				else console.log( "Error: module " + modules[ optionIndex ].name + " does not define config menu." );

			}
			else {

				switch ( optionLabel ) {

					case translation[ "Restart computer" ]:
						tg.clearAllMenus();
						tg.sendMenu( tg.menusByName[ "Confirm restart computer?" ] );
						break;

					case translation[ "Shut down computer" ]:
						tg.clearAllMenus();
						tg.sendMenu( tg.menusByName[ "Confirm shut down computer?" ] );
						break;

					case translation[ "Update system" ]:
						tg.clearAllMenus();
						tg.sendMenu( tg.menusByName[ "Confirm update system?" ] );
						break;

					case translation[ "Change language" ]:
						tg.clearAllMenus();
						tg.sendMenu( tg.menusByName[ "Change language" ] );
						break;

					case translation[ "Return to main menu" ]:
						showMainMenu();
						break;
					default:
						// Nothing to do
						break;
				}

			}

		}
	);

	tg.createYesNoMenu( "Confirm restart computer?", translation[ "Yes, restart computer" ], () => {

		tg.menusEnabled = false;
		tg.sendTextMessage( "ℹ️ " + translation[ "Restarting computer..." ] );
		setTimeout( finish, 1000, EXIT_REBOOTING );

	}, "No", showMainMenu );

	tg.createYesNoMenu( "Confirm shut down computer?", translation[ "Yes, shut down computer" ], () => {

		tg.menusEnabled = false;
		tg.sendTextMessage( "ℹ️ " + translation[ "The computer will now shut down. When the green LED stops flashing, you can unplug it from the power." ] );
		setTimeout( finish, 1000, EXIT_POWER_OFF );

	}, translation[ "No" ], showMainMenu );

	tg.createYesNoMenu( "Confirm update system?", translation[ "Yes, update" ], updateSystem, translation[ "No" ], showMainMenu );

	tg.createMenu( "Change language", 1, false,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = languagesCodes.length; i < il; i ++ ) menuLabels.push( translation[ languagesCodes[ i ] + "Flag" ] + translation[ languagesCodes[ i ] ] );
			menuLabels.push( translation[ "Return to main menu" ] );


			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			tg.clearAllMenus();

			if ( optionIndex < languagesCodes.length ) {

				serverConfig.languageCode = languagesCodes[ optionIndex ];
				saveConfig();
				loadTranslation();
				api.translation = translation;
				tg.setTranslation( translation );
				tg.sendTextMessage( translation[ "Language has been changed to " ] +
					translation[ languagesCodes[ optionIndex ] + "Flag" ] +
					translation[ languagesCodes[ optionIndex ] ] );

				showMainMenu();

			}
			else {

				showMainMenu();

			}

		}

	);

}

function showMainMenu( dontClearMenus ) {

	if ( ! dontClearMenus ) tg.clearAllMenus();
	var mainMenu = tg.menusByName[ "Main menu" ];
	mainMenu.additionalText = getInfoString();
	tg.sendMenu( mainMenu );

}

function parseUserInput( message ) {

	if ( message.text ) {

		if ( message.text > 100 ) return;

		switch ( userResponseState ) {

			case USER_IDLE:
				userResponseState = USER_IDLE;
				showMainMenu();
				break;

			default:
				// Nothing to do
				break;
		}

	}
	else if ( message.voice ) {

		if ( serverConfig.enableVoicePlayback ) playVoiceFile( message.voice.file_id );

	}
	else if ( message.audio ) {

		if ( serverConfig.enableVoicePlayback ) playVoiceFile( message.audio.file_id );

	}

}

function playVoiceFile( file_id ) {

	// TODO old, change path

	tg.getFile( file_id, ( file, error ) => {

		if ( error ) {

			tg.sendTextMessage( "‼" + translation[ "Error downloading voice file." ] );
			return;

		}


		var localPath = pathJoin( serverConfig.captureVideosPath, "voiceMessages" );
		fs.mkdirSync( localPath, { recursive: true } );
		localPath = pathJoin( localPath, ( new Date() ).getTime() + file.file_path.replace( '/', '_' ) );

		tg.downloadTelegramFile( file, localPath, ( success ) => {

			if ( success ) {

				tg.sendTextMessage( "ℹ️" + translation[ "Playing voice file..." ] );

				spawnProgram( null, "ffplay", [ "-nodisp", "-volume", "100", "-autoexit", localPath ], ( code, output, error ) => {

					if ( code ) tg.sendTextMessage( "‼" + translation[ "Error playing voice file: " ] + error );
					else tg.sendTextMessage( "ℹ️" + translation[ "Voice file played successfully." ] );

					spawnProgram( null, "rm", [ localPath ], ( code, output, error ) => {} );

				} );

			}
			else {

				tg.sendTextMessage( "‼" + translation[ "Error downloading voice file." ] );

			}

		} );

	} );

}

function loadTranslation() {

	translation = loadFileJSON( TRANSLATION_PATH + serverConfig.languageCode + ".json", serverConfig.translationEncodingAlias );

	if ( ! translation ) {

		console.log( "Error: translation invalid for language code (please check syntax): " + serverConfig.languageCode );
		finish( EXIT_ERROR );
		return;

	}

}

function loadFileJSON( path, encoding ) {

	try {

		return JSON.parse( loadFile( path, encoding ) );

	}
	catch ( e ) {

		return null;

	}

}

function loadFile( path, encoding ) {

	try {

		return fs.readFileSync( path, encoding ? encoding : undefined );

	}
	catch ( e ) {

		return null;

	}

}

function saveConfig() {

	fs.writeFileSync( CONFIG_PATH, JSON.stringify( serverConfig, null, 4 ), "latin1" );

}

function updateSystem() {

	tg.menusEnabled = false;
	tg.sendTextMessage( "ℹ️ " + translation[ "Updating operating system..." ] );

	spawnProgram( null, "sudo", [ "apt", "-y", "update" ], ( code1, output1, error1 ) => {

		if ( code1 ) {

			tg.sendTextMessage( translation[ "Error: " ] + error1 );
			tg.sendTextMessage( "‼" + translation[ "Error while updating operating system" ] );
			tg.menusEnabled = true;
			return;

		}

		tg.sendTextMessage( "ℹ️ " + translation[ "Installing updates..." ] );

		spawnProgram( null, "sudo", [ "apt", "-y", "upgrade" ], ( code2, output2, error2 ) => {

			if ( code2 ) {

				tg.sendTextMessage( translation[ "Error: " ] + error2 );
				tg.sendTextMessage( "‼" + translation[ "Error while installing updates" ] );
				tg.menusEnabled = true;
				return;

			}

			tg.sendTextMessage( "ℹ️ " + translation[ "Updating application..." ] );

			spawnProgram( null, "git", [ "pull", "origin", "main" ], ( code3, output3, error3 ) => {

				if ( code3 ) {

					tg.sendTextMessage( "Error: " + error3 );
					tg.sendTextMessage( "‼" + translation[ "Error while updating application" ] );
					tg.menusEnabled = true;
					return;

				}

				tg.sendTextMessage( "ℹ️ " + translation[ "Installing application updates..." ] );

				spawnProgram( null, "npm", [ "install" ], ( code4, output4, error4 ) => {

					if ( code4 ) {

						tg.sendTextMessage( translation[ "Error: " ] + error4 );
						tg.sendTextMessage( "‼" + translation[ "Error while installing application updates" ] );
						tg.menusEnabled = true;
						return;

					}

					tg.sendTextMessage( "✅ " + translation[ "The system has been updated successfully. Restarting computer..." ] + " ✅" );

					setTimeout( finish, 1000, EXIT_REBOOTING );

				} );

			} );

		} );

	} );

}

function spawnProgram( cwd, program, args, callback, cancelOutput ) {

	var p;

	if ( cwd ) p = spawn( program, args, { cwd: cwd } );
	else p = spawn( program, args );

	var output = "";
	var error = "";

	p.stdout.on( 'data', ( data ) => {

		if ( cancelOutput === false ) output += data;

	} );

	p.stderr.on( 'data', ( data ) => {

		error += data;

	} );

	p.on( 'exit', ( code, signal ) => {

		if ( callback ) {

			callback( code, output, error );

		}

	} );

}

function execProgram( cwd, command, callback, cancelOutput ) {

	// Executes in a shell

	var p;

	if ( cwd ) p = exec( command, { cwd: cwd } );
	else p = exec( command );

	var output = "";
	var error = "";

	p.stdout.on( 'data', ( data ) => {

		if ( cancelOutput === false ) output += data;

	} );

	p.stderr.on( 'data', ( data ) => {

		error += data;

	} );

	p.on( 'exit', ( code, signal ) => {

		if ( callback ) {

			callback( code, output, error );

		}

	} );

}

function finish( action ) {

	tg.clearAllMenus();
	tg.stopTelegram();

	stopModules( () => {

		exit( action );

	} )

}

function exit( action ) {

	function salute( err ) {

		if ( ! err ) console.log( "Application terminated successfully. Have a nice day." );
		else console.log( "Application terminated With error. Have a nice day." );

	}

	switch ( action ) {

		case EXIT_NO_ACTION:
			salute( false );
			process.exit( 0 );
			break;

		case EXIT_ERROR:
			salute( true );
			process.exit( 1 );
			break;

		case EXIT_REBOOTING:
			salute( false );
			spawnProgram( null, "sudo", [ "reboot" ], () => {
				process.exit( 0 );
			} );
			break;

		case EXIT_POWER_OFF:
			salute( false );
			spawnProgram( null, "sudo", [ "shutdown", "now" ], () => {
				process.exit( 0 );
			} );
			break;

		default:
			console.log( "Unknown exit code." );
			salute( false );
			process.exit( 0 );
			break;

	}

}

function getInfoString( params ) {

	var infoString = "";
	var isOutput = false;
	for ( var i =0, il = modules.length; i < il; i ++ ) {

		var mis = modules[ i ].getInfoString();

		if ( mis ) {

			if ( isOutput ) infoString += "\n";
			infoString += mis;
			isOutput = true;

		}

	}

	if ( isOutput ) return infoString;
	else return null;

}

function iterateAsync( array, methodName, onDone ) {

	iterateAsyncInternal( 0 );

	function iterateAsyncInternal( index ) {

		if ( index >= array.length ) {

			onDone();

		}
		else {

			array[ index ][ methodName ]( () => {

				iterateAsyncInternal( index + 1 );

			} );

		}
	}

}

function createAPI() {

	return {

		translation: translation,
		serverConfig: serverConfig,
		saveConfig: saveConfig,

		showMainMenu: showMainMenu,
		tg: tg,

		spawnProgram: spawnProgram,
		execProgram: execProgram,

		pathJoin: pathJoin

	}

}

function loadModules() {

	var modules = [];
	modules.push( require( './src/modules/cameraModule.js' ) );
	modules.push( require( './src/modules/relayTimerModule.js' ) );

	var configModified = false;
	for ( var i = 0, il = modules.length; i < il; i ++ ) {

		if ( ! modules[ i ].name ) {

			console.log( "Module does not define its name." );
			return null;

		}

		if ( ! modules[ i ].init ) {

			console.log( "Module does not define init function." );
			return null;

		}

		// Set module config
		var config = serverConfig.modules[ modules[ i ].name ];
		if ( ! config ) {

			config = { };
			serverConfig.modules[ modules[ i ].name ] = config;
			configModified = true;

		}
		modules[ i ].config = config;

	}

	if ( configModified ) saveConfig();

	// Check duplicated names
	for ( var i = 0, n = modules.length; i < n - 1; i ++ ) {

		for ( var j = i + 1; j < n; j ++ ) {

			if ( modules[ i ].name === modules[ j ].name ) {

				console.log( "Error: duplicated module name: '" + modules[ i ].name + "'" );
				return null;

			}

		}

	}

	// Init modules
	api = createAPI();
	for ( var i = 0, il = modules.length; i < il; i ++ ) {

		modules[ i ].init( modules[ i ], api );

	}

	// Validate modules
	for ( var i = 0, il = modules.length; i < il; i ++ ) {

		var error = validateModule( modules[ i ] );

		if ( error ) {

			console.log( "Error in module: '" + modules[ i ].name + "': " + error );
			return null;

		}

	}

	return modules;

}

function stopModules( onDone ) {

	iterateAsync( modules, "finish", onDone );

}

function validateModule( module ) {

	if ( ! module.getMenuLabel ) return "Module does not define getMenuLabel function.";
	if ( ! module.getConfigMenuLabel ) return "Module does not define getConfigMenuLabel function.";
	if ( ! module.getInfoString ) return "Module does not define getInfoString function.";
	if ( ! module.menuEntrySelected ) return "Module does not define menuEntrySelected function.";

	return null;

}
