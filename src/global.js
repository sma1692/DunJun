import {
  createComponent, Types,
  createSystem,
} from '@iwsdk/core';


export const GlobalComponent = createComponent('GlobalComponent', {
  score: { type: Types.Int16, default: 0 },
  pauseTime: { type: Types.Float32, default: 0 }, // total time in pause state
  gameState: { type: Types.String, default: 'outside' },
  gameStartTime: { type: Types.Float32, default: -1 },
  health: { type: Types.Int16, default: 5 },
  ignisMeter: { type: Types.Int16, default: 81 },
});

export const methodsOfStimuli =  {
	newWave: 'newWave', audioText: 'audioText', bgm: 'bgm', 
	audio: 'audio', overLaid: 'overLaid', blank: 'blank',
}
export const StimuliComponent = createComponent('StimuliComponent', {
  method: { type: Types.String, enum: methodsOfStimuli },
  data: { type: Types.Object, default: 0 }, // total time in pause state
});



///
gameStates : [ 'outsideVR', 'landing', 'tut1', 'tut2', 'ingame', 'gameOver'  ]
//

export const getAllGlobalValues = (globEnty) => {
	const score = globEnty.getValue(GlobalComponent, 'score')
    const pauseTime = globEnty.getValue(GlobalComponent, 'pauseTime')
    const gameState = globEnty.getValue(GlobalComponent, 'gameState')
    const health = globEnty.getValue(GlobalComponent, 'health')
    const gameStartTime = globEnty.getValue(GlobalComponent, 'gameStartTime')
	const ignisMeter = globEnty.getValue(GlobalComponent, 'ignisMeter')
	return {score, pauseTime, gameState, health, gameStartTime, ignisMeter }
}


export const Constants = {
	// game constants
	// DEBUG: true,	
	DEBUG: false,	
	GESTURE_DEBUG: true,	
	// GESTURE_DEBUG: false,	

    // block things 
    NUM_BLOCKS : 2,
	// NUM_BLOCKS : 5,
    MOVE_SPEED : 2,
	IGNIS_CONFIG: {
		RADII: [0.1, 0.5], // [<startRadius>, <finalRadius>]
		DURATIONS: [ 0.6, 0.6, 0.5 ], // [<growDuration>, <chargeDuration>, <cancelDuration>]
		SPEED: 5.0, //launchSpeed
		OFFSETS: [0, 0.16, -0.2] // location above hand

	},
	FOG_WALL: [ 10, 10, -11 ],  // z is also spawn point 
    DELAY_MULIPLE: 60,
	SPAWN_DELAY:2000,

	START_HEARTS: 5,
	MAX_HEARTS: 9,
	ULTI_FACTOR: 2, // factor for ulti addition on good hit 

	POS_HISTORY_COUNT:20, //  # of history items in hand phalanges positions
	SIGN_HISTORY_COUNT:20, // signs made with hand counter 
	GESTURE_HISTORY_COUNT:20,
	COLLISION_DURATION: 200, //milliseconds for duration of colision

	DURATIONS: {
		NEW_WAVE_OVERLAY: 1000,
		COUNTDOWN: 900,
		RESUME_4M_PAUSE: 300
	},
	TEXTURE:{
		DIMENSIONS: [3, 2],
		POSITION: [0, 0.8, -1]
	},
	OVERLAY: { // generic overlay styles
		SUBTEXT : { // for healthup, ulti full, last health
			   followCamera: true, fontSize: '8px',
			   duration: 1100,
    		   screenOffset: { x: 0.85, y: 0.7 }	
		}	
	},

	// asset paths
	SCORE_BOARD_TEXTURE_PATH: 'assets/scoreboard.png',
	ENV_TEXTURE_PATH: 'assets/envmap.exr',
	SCENE_MODEL_PATH: 'assets/gltf/scene.gltf',
	WING_MODEL_PATH: 'assets/gltf/wing.gltf',

	// local storage keys
	RECORD_SCORE_KEY: 'record-score',
	PLAYER_ID_KEY: 'player-id',

	//
	THRESHOLDS: {
		THUMBOPEN: 0.07,
		FINGEROPEN: 0.1,
		PUNCH_SPEED: 1.3,
		SLAP_SPEED: 1.8,
		RADIUS: 0.65 // default radius when estimating radius
	},
	//
	HUD_WALL : [[5, 2], [0.5, 3.0, -7]], // wall plane describing where the hud lies , coincides with env wall ?
	// YOLO stlye [[width, height], [centerx, centery, centerz]]
	DEsTROY:{ // destruction time
		FLOATER_HIT: 1600,
		FLOATER_BREACH: 800,
		MAX_AGE: 25 * 1000,
		IGNIS: 900
	},
	BGM_CHANGE : 2, // wave number at which bgm should change, simple, more complex with arrays tbd
	PHALANGES: [
		'wrist',
		//thumb
		'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
		//index finger
		'index-finger-metacarpal','index-finger-phalanx-proximal', 
		'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip', 
		//middle finger
		'middle-finger-metacarpal', 'middle-finger-phalanx-proximal',
		'middle-finger-phalanx-intermediate', 
		'middle-finger-phalanx-distal', 'middle-finger-tip',
		//ring
		'ring-finger-metacarpal', 'ring-finger-phalanx-proximal',
		'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal',
		'ring-finger-tip',
		//pinky
		'pinky-finger-metacarpal', 
		'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 
		'pinky-finger-phalanx-distal', 'pinky-finger-tip'],

	GAME_STATES:[
		'lobby',   // webpage without enter in vr
		'lobbyVR',    // once user enters into vr
		'ingame',	// game started
		'pause',	// pause while game is running
		'quitInPause', // user selected quit in pause 
		'gameover', // gameover panel
		'gameover', // gameover panel

	]

};

