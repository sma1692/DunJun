import { SessionMode, World } from '@iwsdk/core';
import { all_assets } from './assets/index.js';
import { fpsMonitorOverLay } from './utils/metrics.js';

import {
  PhysicsSystem, PhysicsBody, PhysicsShape,
} from '@iwsdk/core';

import { GlobalComponent, Constants } from './global.js';
import { setupScene } from './scene.js';
import { XRInputManager } from '@iwsdk/xr-input';

import { PhysicsHandSystem } from './physicsHands.js';
import { FloaterSystem } from './blocks.js';
import { GestureSystem } from './gestures.js';
import { LongGestureSystem } from './longGesture.js';
import { GameSystem } from './game.js';
import { UniversalCollisionDetectionSystem } from './collide.js';
import { GameAudioSystem } from './audio.js';
import { TextOverlaySystem } from './overlay.js';
import { ResponseSystem } from './response.js';
import { MainMenuSystem } from './menu.js';
import { HUDSystem } from './hud.js';

import * as THREE from 'three';
import * as horizonKit from "@pmndrs/uikit-horizon";
import * as lucideIcons from "@pmndrs/uikit-lucide";
import * as defaultKit from "@pmndrs/uikit-default";
// import customFontJson from "../src/fonts/Dungeon.json";
import { RealLoadingScreen, setupAssetTracking } from './screenLoader.js'

// ============================================
// REAL LOADING SCREEN
// ============================================


// ============================================
// MAIN INITIALIZATION
// ============================================
async function initializeApp() {
  const loadingScreen = new RealLoadingScreen();
  
  try {
    const assets = all_assets;
    const assetsArray = Object.values(assets); // Convert object to array
    setupAssetTracking(loadingScreen, assetsArray);

    loadingScreen.currentFile.textContent = 'Loading Dunjun Artefacts...';

    const worldConfig = {
      assets,
      xr: {
        sessionMode: SessionMode.ImmersiveVR,
        offer: 'always',
        features: { 
          handTracking: { required: true }, 
          layers: { required: false } 
        } 
      },
      features: { 
        locomotion: false, 
        grabbing: true, 
        physics: true, 
        sceneUnderstanding: false,
        spatialUI: {
          kits: [horizonKit, lucideIcons, defaultKit],
          // fontFamilies: { Dungeon: customFontJson },
        } 
      }  
    };

    const container = document.getElementById('scene-container');

    const world = await World.create(container, worldConfig);

    loadingScreen.currentFile.textContent = 'Setting up scene...';
    setupScene(world);

    const { camera, scene, renderer } = world;

    // lower fps settings
    renderer.setPixelRatio(0.8); // Lower = better performance
    renderer.xr.setFramebufferScaleFactor(0.8);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputEncoding = THREE.LinearEncoding;
    
    // fpsMonitorOverLay(camera);

    loadingScreen.currentFile.textContent = 'Initializing game...';
    
    world.createEntity().addComponent(GlobalComponent, {
      health: Constants.START_HEARTS
    });

    const xrInput = new XRInputManager({ 
      scene, camera, inputDevices: 'hand'
    });
    scene.add(xrInput.xrOrigin);
    world.xrInput = xrInput;

    loadingScreen.currentFile.textContent = 'Registering systems...';

    world.registerSystem(GameAudioSystem);
    world.registerSystem(FloaterSystem);
    world.registerSystem(GestureSystem);
    world.registerSystem(LongGestureSystem);
    world.registerSystem(PhysicsHandSystem);
    
    world.registerSystem(PhysicsSystem)
      .registerComponent(PhysicsBody)
      .registerComponent(PhysicsShape);
    
    world.registerSystem(UniversalCollisionDetectionSystem);
    world.registerSystem(MainMenuSystem);
    world.registerSystem(GameSystem);
    world.registerSystem(TextOverlaySystem);
    world.registerSystem(ResponseSystem);
    world.registerSystem(HUDSystem);

    world.audioSystem = world.getSystem(GameAudioSystem);

    loadingScreen.currentFile.textContent = 'Ready!';
    await loadingScreen.hide();
    
    console.log(' Dunjun World loaded successfully!');
    
  } catch (error) {
    console.error(' Error loading Dunjun World:', error);
    loadingScreen.currentFile.textContent = `Error: ${error.message}`;
    loadingScreen.currentFile.style.color = '#ff4444';
    loadingScreen.title.textContent = 'LOADING FAILED';
  }
}

// Start the app
initializeApp();
