
import * as THREE from 'three';

import {  createComponent, Types } from '@iwsdk/core'
import { Constants } from './global';

export const ignisComponent = createComponent('ignisComponent', { 
  launchTime: { type: Types.Float32 },
  // kill: { type: Types.Boolean, default: false  },
});

export class FireOrbLauncher {
  constructor(world, startPosition, orbGLTF) {
    this.world = world
    this.scene = world.scene;
    this.startPosition = startPosition.clone();
    this.currentPosition = startPosition.clone();
    this.orbGLTF = orbGLTF;
    
    this.phase = 'growing'; // 'growing' -> 'charging' -> 'launching' -> 'cancelling' -> 'done'
    this.startTime = Date.now();
    
    // Configuration
    this.startRadius = Constants.IGNIS_CONFIG.RADII[0];
    this.finalRadius = Constants.IGNIS_CONFIG.RADII[1];
    this.growDuration = Constants.IGNIS_CONFIG.DURATIONS[0];; // seconds to grow
    this.chargeDuration = Constants.IGNIS_CONFIG.DURATIONS[1]; // seconds to charge
    this.launchSpeed = Constants.IGNIS_CONFIG.SPEED; // units per second
    this.cancelDuration = Constants.IGNIS_CONFIG.DURATIONS[2]; // seconds to fade out
    
    this.createOrb();
    this.setupAnimations();
  }
  
  createOrb() {
    // Clone the GLB scene
    this.orb = this.orbGLTF.scene.clone();
    
    // Start small
    this.orb.scale.setScalar(this.startRadius);
    this.orb.position.copy(this.startPosition);
    
    this.scene.add(this.orb);
  }
  
  setupAnimations() {
    // Setup animation mixer for the GLB model
    if (this.orbGLTF.animations && this.orbGLTF.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.orb);
      
      // Play the first animation
      const action = this.mixer.clipAction(this.orbGLTF.animations[0]);
      action.play();
      
      console.log(`Fire orb animation: ${this.orbGLTF.animations[0].name}`);
    }
  }
  
  update(deltaTime) {
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    
    // Update GLB animations
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    
    switch (this.phase) {
      case 'growing':
        this.updateGrowth(elapsedTime);
        break;
      case 'charging':
        this.updateCharging(elapsedTime);
        break;
      case 'cancelling':
        this.updateCancellation(deltaTime);
        break;
      case 'launching':
        this.updateLaunch(deltaTime);
        break;
      case 'done':
        return false; // Signal completion
    }
    
    return true; // Still active
  }
  
  updateGrowth(elapsedTime) {
    const progress = Math.min(elapsedTime / this.growDuration, 1.0);
    
    // Smooth ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentRadius = this.startRadius + (this.finalRadius - this.startRadius) * eased;
    
    // Scale orb
    this.orb.scale.setScalar(currentRadius);
    
    if (progress >= 1.0) {
      this.phase = 'charging';
      this.chargeStartTime = Date.now();
      console.log('Growth complete - now charging');
    }
  }
  
  updateCharging(elapsedTime) {
    const chargeElapsed = (Date.now() - this.chargeStartTime) / 1000;
    const progress = Math.min(chargeElapsed / this.chargeDuration, 1.0);
    
    // Rotate orb
    this.orb.rotation.y += 0.05;
    this.orb.rotation.x += 0.02;
    
    if (progress >= 1.0) {
      
      this.phase = 'launching';
      this.launchStartTime = Date.now();
      this.launchDirection = new THREE.Vector3(0, 0, -1);
      this.currentPosition.copy(this.orb.position);
      console.log('Charge complete - launching!');
      
      
    }
  }
  
  updateLaunch(deltaTime) {
    // Move forward
    this.currentPosition.addScaledVector(this.launchDirection, this.launchSpeed * deltaTime);
    this.orb.position.copy(this.currentPosition);
    
    // Continue rotation
    this.orb.rotation.y += 0.1;
    this.orb.rotation.x += 0.05;
    
    // Destroy after 5 seconds of flight
    const launchElapsed = (Date.now() - this.launchStartTime) / 1000;
    if (launchElapsed > 3.0) {
      this.phase = 'done';
      this.cleanup();
    }
  }
  
  // Cancel the orb if not yet launched
  cancel() {
    if (this.phase === 'growing' || this.phase === 'charging') {
      console.log(`Cancelling fire orb in ${this.phase} phase`);
      this.phase = 'cancelling';
      this.cancelStartTime = Date.now();
      return true;
    } else if (this.phase === 'launching') {
      console.log('Cannot cancel - orb already launched!');
      return false;
    }
    return false;
  }
  
  updateCancellation(deltaTime) {
    const cancelElapsed = (Date.now() - this.cancelStartTime) / 1000;
    const progress = Math.min(cancelElapsed / this.cancelDuration, 1.0);
    
    // Shrink to zero
    const currentScale = this.finalRadius * (1 - progress);
    this.orb.scale.setScalar(currentScale);
    
    // Fade out
    this.orb.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = 1 - progress;
      }
    });
    
    if (progress >= 1.0) {
      console.log('Cancellation complete');
      this.phase = 'done';
      this.cleanup();
    }
  }
  
  cleanup() {
    this.scene.remove(this.orb);
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
  
  // Static utility
  static launchFromPosition(scene, position, orbGLTF) {
    return new FireOrbLauncher(scene, position, orbGLTF);
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================
/*

import { FireOrbLauncher } from './FireOrbLauncher';

const fireOrbGLTF = AssetManager.getGLTF('fire-orb');

// Create launcher
const launcher = new FireOrbLauncher(scene, position, fireOrbGLTF);

// Update loop
function update(delta) {
  if (launcher) {
    const active = launcher.update(delta / 1000);
    if (!active) launcher = null;
  }
}

// Cancel if needed
launcher.cancel(); // Works only during growing/charging

// Hold-to-charge pattern:
let currentOrb = null;

function onGestureStart(handPosition) {
  currentOrb = new FireOrbLauncher(scene, handPosition, fireOrbGLTF);
}

function onGestureRelease() {
  if (currentOrb) {
    currentOrb.cancel();
  }
}

function update(delta) {
  if (currentOrb) {
    const active = currentOrb.update(delta / 1000);
    if (!active) currentOrb = null;
  }
}

*/