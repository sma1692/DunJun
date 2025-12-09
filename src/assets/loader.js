/*
Block Loader, 
FUTURE=>
Hand loader, ENV Loader

*/ 
import {
  Types,
  createComponent,
  createSystem, DistanceGrabbable, MovementMode,
  Entity, Mesh, Interactable,
  Pressed, AssetManager
} from '@iwsdk/core';

import { getRandomElement } from '../helpers';

export class BlockLoader{
    /* 
    Loads blocks , list generation functions included
    Instantiated in the main block,js
    */
    constructor(){
        this.assetMap = {
            punch1: {
                asset:AssetManager.getGLTF('punch'),
                angularVelocity: 0.0,
                type:'punch',
                interactable: false,
                grabbable: false,
                health: 10
            },
            slap1: {
                asset:AssetManager.getGLTF('slap'),
                angularVelocity: 0.0,
                type:'slap',
                interactable: false,
                grabbable: false,
                health: 10
            },
            poke1: {
                asset:AssetManager.getGLTF('poke'),
                angularVelocity: 0.0,
                type:'poke',
                interactable: false,
                grabbable: false,
                health: 10
            },
            heart_one: {
                asset:AssetManager.getGLTF('heart_one'),
                angularVelocity: 1.0,
                type:'consume',
                interactable: false,
                grabbable: false,
                health: 10
            },
            coin_one: {
                asset:AssetManager.getGLTF('coin_one'),
                angularVelocity: 0.0,
                type:'consume',
                interactable: false,
                grabbable: false,
                health: 10
            },
            spell_one: {
                asset:AssetManager.getGLTF('spell_one'),
                angularVelocity: 0.0,
                type:'spell',
                interactable: false,
                grabbable: false,
                health: 10
            },
            scroll: {
                asset:AssetManager.getGLTF('scroll'),
                angularVelocity: 0.0,
                type:'other',
                interactable: false,
                grabbable: false,
                health: 10
            },
        }

        this.interactionMap = {
            punch: ['punch1'],
            slap: ['slap1'],
            poke: ['poke1'],
            // consume: ['heart_one', 'coin_one'],
            consume: ['heart_one'],
            spell: ['spell_one']
        }
        this.fixit()
        // this.animationChecker()
    }

    fixit(){
        const ourAssets = ['slap1']
        for(let i=0; i<ourAssets.length; i++){
            let _asset = ourAssets[i]
            console.log('asdasd ', this.assetMap[_asset].asset.scene)
            this.assetMap[_asset].asset.scene.traverse((node) => {
                // console.log('FFF ', node, node.isObject3D, node.material)
                if (node.isMesh) {
                    if (node.material) {
                    node.material.transparent = false;
                    node.material.opacity = 1.0;
                    node.material.alphaTest = 0.0;
                    node.material.depthWrite = true;
                    node.material.depthTest = true;
                    node.material.side = 2; // DoubleSide
                    }
                }
            });
        }
    }

    animationChecker(){
        const ourAssets = ['poke1']
        for(let i=0; i<ourAssets.length; i++){
            let _asset = ourAssets[i]
            const myModel = this.assetMap[_asset].asset
            console.log('Animations:', myModel.animations);

            if (myModel.animations && myModel.animations.length > 0) {
                console.log('This GLTF has animations!');
                myModel.animations.forEach((clip, index) => {
                    console.log(`Animation ${index}: ${clip.name}, Duration: ${clip.duration}s`);
                });
            } else {
                console.log('This GLTF has no animations (static model)');
            }
        }

    }

    createSpawnList(NUM, DELAY, CURRENT={}){
        /**
         NUM : number of blocks to spawn with DELAY 
         CURRENT state of player power ups, health, etc
        */
        const chances = this.calculateChances(CURRENT)
        const totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
        const spawnList = []
        const enhancedSpawnList = []
        const nowTime = performance.now()
        // Create an array of entities based on their chances
        for (let entity in chances) {
            let count = Math.round((chances[entity] / totalChance) * NUM);
            for (let i = 0; i < count; i++) {
                // Calculate a random delay with ±10% variation
                let delayVariation = DELAY * (0.9 + Math.random() * 0.2);
                // let delayVariation = nowTime +
                //     ( DELAY * (0.9 + Math.random() * 0.4)) * (i+1);
                spawnList.push([entity, delayVariation]);
            }
        }
        // Shuffle the array to randomize the order
        for (let i = spawnList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [spawnList[i], spawnList[j]] = [spawnList[j], spawnList[i]];
        }
        ///// get Random element from array in final list
        ////// basically when we have multiple of smae type, like consumable
        for(let i=0; i< spawnList.length ; i++){
            let spawnType = spawnList[i][0]
            let toople = [ 
                getRandomElement(this.interactionMap[spawnType]),  
                spawnList[i][1]
            ]
            enhancedSpawnList.push(toople)
        }

        return enhancedSpawnList
    }

    calculateChances(CURRENT){
        let defaultChances = { 
            // punch: 32, slap: 30, poke: 32, consume: 8, spell: 0
            // punch: 90, slap: 90, poke: 0, consume: 0, spell: 0
            punch: 1, slap: 1, poke: 1, consume: 0, spell: 0
        }
        // todo: CURRENT based changes 
        return defaultChances
    }
}

export class SoundLoader {
    constructor(){
        this.soundBank = {
            bgm1: {
                path: '/audio/outside.wav',
                volume: 0.1,
            },
            bgm2: {
                path: '/audio/vrlobby.wav',
                volume: 0.3,
            },
            bgm3: {
                path: '/audio/ingame1.wav',
                volume: 0.3,
            },
            bgm4: {
                path: '/audio/ingame2.wav',
                volume: 0.3,
            },
            
            damage1: {
                path: '/audio/damage.ogg',
                volume: 1.0,
            },
            damage2: {
                path: '/audio/damage_two.ogg',
                volume: 1.0,
            },
            pause_one: {
                path: '/audio/pause_one.ogg',
                volume: 0.4,
            },
            resume_one: {
                path: '/audio/resume.ogg',
                volume: 0.4,
            },
            gameover_one: {
                path: '/audio/gameover1.wav',
                volume: 0.5,
            },
            click_one: {
                path: '/audio/buttonClick1.ogg',
                volume: 1.0,
            },
            punch: {
                path: '/audio/punch-air.wav',
                volume: 1.0,
            },
            open: {
                path: '/audio/punch-air.wav',
                volume: 1.0,
            },
            slap: {
                path: '/audio/slap.wav',
                volume: 1.0,
            },
            poke: {
                path: '/audio/poke1.wav',
                volume: 1.0,
            },
            whoosh: {
                path: '/audio/whooshO.ogg',
                volume: 1.0,
            },
            ulti: {
                path: '/audio/ulti.wav',
                volume: 0.5,
            },
            healthup: {
                path: '/audio/healthup.wav',
                volume: 1.0,
            },
            powerup: {
                path: '/audio/powerup.wav',
                volume: 1.0,
            },
            gamestart: {
                path: '/audio/gamestart.wav',
                volume: 0.5,
            },
            countdown: {
                path: '/audio/321.wav',
                volume: 0.4,
            },
            full: {
                path: '/audio/full.ogg',
                volume: 1.0,
            },
            

        }
    }
}