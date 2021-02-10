
var fs = require( 'fs' );

var api = null;
var mod = null;
var cameraImageMessageId = null;

function init( moduleParam, apiParam ) {

	api = apiParam;
	mod = moduleParam;

	mod.getMenuLabel = () => { return "Get camera image"; };
	mod.getConfigMenuLabel = () => { return "Configure camera"; };
	mod.getInfoString = () => { return null; };
	mod.finish = ( callback ) => { callback(); };
	mod.menuEntrySelected = function() {

		api.tg.clearAllMenus();
		captureCamera();
		//api.tg.sendMenu( api.tg.menusByName[ "Take another screenshot" ] );
		api.showMainMenu( true );

	}

	api.tg.createMenu(
		mod.getConfigMenuLabel(),
		1,
		false,

		function () {

			var menuLabels = [ ];

			menuLabels.push( api.translation[ "Change camera resolution" ] );
			menuLabels.push( api.translation[ "Change Frames Per Second" ] );
			menuLabels.push( api.translation[ "Return to main menu" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			switch ( optionIndex ) {

				case 0:
					var resMenu = api.tg.menusByName[ "Change camera resolution" ];
					resMenu.additionalText = api.translation[ "Current resolution: " ] + mod.config.cameraWidth + "x" + mod.config.cameraHeight;
					api.tg.clearAllMenus();
					api.tg.sendMenu( resMenu );
					break;

				case 1:
					var fpsMenu = api.tg.menusByName[ "Change Frames Per Second" ];
					fpsMenu.additionalText = api.translation[ "Current FPS: " ] + mod.config.cameraFPS;
					api.tg.clearAllMenus();
					api.tg.sendMenu( fpsMenu );
					break;

				default:
					api.showMainMenu();
					break;

			}

		}

	);

	api.tg.createMenu(
		"Take another screenshot",
		1,
		false,
		function () { return [ api.translation[ "Take another screenshot" ] ] },
		captureCamera
	);

	api.tg.createMenu( "Change camera resolution", 1, false,

		function () {

			var menuLabels = [ ];

			menuLabels.push( "160x120" );
			menuLabels.push( "320x240" );
			menuLabels.push( "640x480" );
			menuLabels.push( api.translation[ "Return to main menu" ] );


			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			api.tg.clearAllMenus();

			if ( optionIndex < 3 ) {

				var tokens = optionLabel.split( 'x' );

				var w = parseInt( tokens[ 0 ] );
				var h = parseInt( tokens[ 1 ] );

				if ( w !== mod.config.cameraWidth || h !== mod.config.cameraHeight ) {

					mod.config.cameraWidth = w;
					mod.config.cameraHeight = h;
					api.saveConfig();

				}

				api.tg.sendTextMessage( "ℹ️ " + api.translation[ "Camera resolution set to " ] + optionLabel );

				api.showMainMenu();

			}
			else {

				api.showMainMenu();

			}

		}

	);

	api.tg.createMenu( "Change Frames Per Second", 1, false,

		function () {

			var menuLabels = [ ];

			menuLabels.push( "5" );
			menuLabels.push( "10" );
			menuLabels.push( "15" );
			menuLabels.push( "30" );
			menuLabels.push( "60" );
			menuLabels.push( api.translation[ "Return to main menu" ] );


			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			if ( optionIndex < 5 ) {

				api.tg.clearAllMenus();

				var fps = parseInt( optionLabel );

				if ( fps !== mod.config.cameraFPS ) {

					mod.config.cameraFPS = fps;
					api.saveConfig();

				}

				api.tg.sendTextMessage( "ℹ️ " + api.translation[ "Camera FPS set to " ] + optionLabel );

				api.showMainMenu();

			}
			else {

				api.showMainMenu();

			}

		}

	);

}

function captureCamera() {

	var imagesPath = api.pathJoin( mod.config.captureTempPath, "camera" );

	var res = null;
	try {

		res = fs.mkdirSync( imagesPath, { recursive: true } );

	}
	catch ( e ) {
		console.log( "Could not create imagesPath: " + imagesPath );
		return;
	}

	captureFrame();

	function captureFrame() {

		var imagePath = api.pathJoin( imagesPath, "CameraImage_" + Date.now() + ".png" );

		api.spawnProgram(
			null,
			"fswebcam",
			[
				"-q",
				"-d",
				mod.config.cameraDevice,
				"--no-banner",
				"-r",
				"" + mod.config.cameraWidth + "x" + mod.config.cameraHeight,
				imagePath
			],
			( code, output, error ) => {

				if ( cameraImageMessageId !== null ) {

					api.tg.deleteMessageThen( cameraImageMessageId, () => {

						cameraImageMessageId = null;
						api.tg.sendPhoto( "", imagePath, true, ( message1 ) => {

							cameraImageMessageId = message1.message_id;
							onFrameCaptured();

						} );

					} );

				}
				else {

					api.tg.sendPhoto( "", imagePath, true, ( message1 ) => {

						cameraImageMessageId = message1.message_id;
						onFrameCaptured();

					} );

				}

			}
		);

		function onFrameCaptured() {

			setTimeout( () = > {

				fs.unlinkSync( imagePath );

			}, 3000 );

		}

	}

}

if ( typeof module !== 'undefined' ) {

	module.exports = {
		name: "Camera",
		init: init
	};

}
