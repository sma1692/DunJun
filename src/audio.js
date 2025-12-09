
import { createSystem  } from '@iwsdk/core';
import * as THREE from 'three';
import { SoundLoader } from './assets/loader'



const soundLoad = new SoundLoader()
export class GameAudioSystem extends createSystem({

}) {
    init() {
        // Setup listener
        this.listener = new THREE.AudioListener();
        this.world.camera.add(this.listener);
        this.outsideBGM = 'bgm1'
        // BGM
        this.soundBank = soundLoad.soundBank
        this.bgm = null;
        this.currentBgm = null
        // this.loadBGM();
        
        // Sound effects
        this.soundBuffers = {};
        this.loadSoundEffects();
    }
    
    loadBGM(_bgm='bgm1') {
        if(this.currentBgm) this.stopBGM()
        const audioLoader = new THREE.AudioLoader();
        const bgm1 = this.soundBank[_bgm]
        audioLoader.load(bgm1.path, 
        (buffer) => {
            this.currentBgm = _bgm
            this.bgm = new THREE.Audio(this.listener);
            this.bgm.setBuffer(buffer);
            this.bgm.setLoop(true);
            this.bgm.setVolume(bgm1.volume);
            this.bgm.play();
            // console.log('Audio loaded successfully');
        });
    }
    
    loadSoundEffects() {
        const audioLoader = new THREE.AudioLoader();
        Object.keys(this.soundBank).forEach(key => {
            const soundObj = this.soundBank[key]
            audioLoader.load(soundObj.path, (buffer) => {
                this.soundBuffers[key] = {
                    buffer,
                    volume: soundObj.volume
                };
                // console.log(`✓ Loaded sound: ${key}`);
            }, undefined, (error) => {
                console.error(`✗ Failed to load sound: ${key}`, error);
            });
        });
    }
    
    playSound(name) {
        if (!this.soundBuffers[name]) {
            console.warn(`Sound ${name} not found`);
            return;
        }
        
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.soundBuffers[name].buffer);
        sound.setVolume(this.soundBuffers[name].volume);
        sound.play();
    }
    
    setBGMVolume(volume) {
        if (this.bgm) {
            this.bgm.setVolume(volume);
        }
    }
    
    toggleBGM() {
        if (!this.bgm) return;
        
        if (this.bgm.isPlaying) {
            this.bgm.pause();
        } else {
            this.bgm.play();
        }
    }
    stopBGM() {
        if (!this.bgm) return;
        
        this.bgm.stop()
    }
}



// Use in other systems
// const audioSystem = world.getSystem(GameAudioSystem);
// audioSystem.playSound('click');
// audioSystem.playSound('collision', 0.8);
// audioSystem.setBGMVolume(0.3);
