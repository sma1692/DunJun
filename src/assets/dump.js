// Codes generated from llms but not in priority to implemetn

import { blendOverlay } from "three/tsl"



/// ANIMARTIONTS

// example in blendOverlay
// 1. Create a character model
// 2. Add an armature (skeleton) with bones
// 3. Create animations:
//    - Frame 0: Character standing (keyframe)
//    - Frame 10: Character leg forward (keyframe)
//    - Frame 20: Character standing (keyframe)
// 4. Export as GLTF with "Include Animations" checked


// check if gltf has animations 

const myModel = AssetManager.getGLTF('my-model');

console.log('Animations:', myModel.animations);

if (myModel.animations && myModel.animations.length > 0) {
    console.log('This GLTF has animations!');
    myModel.animations.forEach((clip, index) => {
        console.log(`Animation ${index}: ${clip.name}, Duration: ${clip.duration}s`);
    });
} else {
    console.log('This GLTF has no animations (static model)');
}



//////////////////////////////////////////
// //////BGM
const myModel = AssetManager.getGLTF('my-model');
const mixer = new THREE.AnimationMixer(myModel.scene);

// Store actions for later control
const actions = {};

if (myModel.animations.length > 0) {
    myModel.animations.forEach(clip => {
        actions[clip.name] = mixer.clipAction(clip);
    });
    
    // Play idle animation by default
    if (actions['Idle']) {
        actions['Idle'].play();
    }
}

// Add to scene
world.createTransformEntity(myModel.scene);
myModel.scene.position.set(0, 0, -3);

// Store globally for control
window.modelAnimations = {
    mixer: mixer,
    actions: actions,
    
    // Helper function to switch animations
    playAnimation(name, fadeTime = 0.3) {
        const newAction = this.actions[name];
        if (!newAction) {
            console.error(`Animation "${name}" not found`);
            return;
        }
        
        // Stop all other actions and crossfade
        Object.values(this.actions).forEach(action => {
            if (action !== newAction && action.isRunning()) {
                action.fadeOut(fadeTime);
            }
        });
        
        newAction.reset().fadeIn(fadeTime).play();
    }
};

// Usage in your code:
// window.modelAnimations.playAnimation('Walk');
// window.modelAnimations.playAnimation('Run');


// Make sure you have a clock
const clock = new THREE.Clock();

// In your XR render loop
function onXRFrame(time, frame) {
    // ... your existing code ...
    
    // Update all animation mixers
    const delta = clock.getDelta();
    if (window.modelMixer) {
        window.modelMixer.update(delta);
    }
    
    // ... rest of your render code ...
}