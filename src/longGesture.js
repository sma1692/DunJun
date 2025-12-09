import { AssetManager,
  Types, createSystem,
} from '@iwsdk/core';

import {   findFirstMatch  } from './helpers';
import { GlobalComponent, Constants, getAllGlobalValues } from './global';
import {  FireOrbLauncher, ignisComponent } from './spells';
import { ResponseSystem } from './response';
import { GestureComponent } from './gestures';
import * as THREE from 'three';
import { countDownComponent } from './game';

export class LongGestureSystem extends createSystem({
    countdown: { required: [countDownComponent]},
    global: { required: [GlobalComponent]},
    gesture: { required: [GestureComponent]},

}) {
    init(){
      this.globalEnty = Array.from(this.queries.global.entities)[0]
      this.leftGesture = 'idle'
      this.rightGesture = 'idle'
      this.leftPos = null  //writ pos
      this.rightPos = null  //writ pos
      this.lastThehro = 1
      this.currentTime = 1
      this.createLoader()
      this.loadingFor = null
      this.longGestureLoadingMap = {} // to keep track of which long Gesture signal is being sent 

      this.activeLaunchers = []; // Track active sphere launchers
      this.launchQueue = [];
      this.relevantStatesGestureMap = Constants.GESTURE_DEBUG ? {
        'lobby' : ['thehro', 'niche'], // [start game, tutorial]
        'ingame' : ['thehro'],
        'pause': ['thehro', 'poke'], // [unpause, quit]
        'gameover': ['thehro', 'poke'], //[restart, home]
        'quitInPause': ['thehro', 'poke'], // [yes, no]
        'tutorial_1': ['thehro', 'poke', 'niche' ], //[next, back, skip]
        'tutorial_2': ['thehro', 'poke', 'niche' ], //[next, back, skip]
        'tutorial_3': ['thehro', 'poke', 'niche' ], //[next, back, skip]
        'tutorial_4': ['thehro', 'poke',  ], //[start, back]
      }: {
        'lobby' : ['rock-horns', 'thumbsup'],
        'ingame' : ['rock-horns'],
        'pause': ['thumbsup', 'thumbsdown'],
        'gameover': ['thumbsup', 'thumbsdown'],
        'quitInPause': ['thumbsup', 'thumbsdown'], // [yes, no]
        'tutorial': ['thumbsup', 'thumbsdown', 'rock-horns'], //[next, back, skip]
        'tutorial_1': ['thumbsup', 'thumbsdown', 'rock-horns'], //[next, back, skip]
        'tutorial_2': ['thumbsup', 'thumbsdown', 'rock-horns'], //[next, back, skip]
        'tutorial_3': ['thumbsup', 'thumbsdown', 'rock-horns'], //[next, back, skip]
       'tutorial_4': ['thumbsup', 'thumbsdown', 'rock-horns'] //[next, back, skip]
      }
    }

    createLoader(){
      // Create a circular loader
      const loaderGeometry = new THREE.RingGeometry(0.02, 0.03, 32);
      const loaderMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        // transparent: true,
        opacity: 0.8
      });
      
      this.loaderRing = new THREE.Mesh(loaderGeometry, loaderMaterial);
      this.loaderRing.visible = false;
      
      // Create progress fill
      const fillGeometry = new THREE.CircleGeometry(0.025, 32);
      this.fillMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        // transparent: true,
        opacity: 0.3
      });
      
      this.loaderFill = new THREE.Mesh(fillGeometry, this.fillMaterial);
      this.loaderFill.visible = false;
      
      // Group them
      this.loaderGroup = new THREE.Group();
      this.loaderGroup.add(this.loaderRing);
      this.loaderGroup.add(this.loaderFill);
      
      this.world.scene.add(this.loaderGroup);
    }

    thehroOps(){
    if(this.currentTime - this.lastThehro < 800) return;
    const relevantStates = Object.keys(this.relevantStatesGestureMap)
    if(!relevantStates.includes(this.gameState)) return

    let handSigns = [this.leftGesture, this.rightGesture]
    let allowedSigns = this.relevantStatesGestureMap[this.gameState]
    let matchedGest = findFirstMatch(handSigns, allowedSigns)

    let posList = [this.leftPos, this.rightPos]
    if(!matchedGest) this.stopLoading()
    else {
      this.loaderGroup.position.set(0, 1.6, -1)
        if (!this.loading) {
          this.startLoading(matchedGest);
        }
        this.updateLoading(matchedGest);
    }
    
  }
  startLoading(shortGesture) {
    this.loading = true;
    this.loadProgress = 0;
    this.loadTime = 0;
    this.loadingFor = shortGesture
    this.loaderRing.visible = true;
    this.loaderFill.visible = true;
  }
  
  updateLoading(matchedGest) {
    if (!this.loading) return;
    this.loadTime += 1/60; // Assuming 60fps
    this.loadProgress = Math.min(this.loadTime , 1.0);
    
    this.updateLoaderVisual();
    
    if (this.loadProgress >= 1.0) {
      this.onLoadComplete();
    }
  }
  
  updateLoaderVisual() {
    // Scale the fill based on progress
    this.loaderFill.scale.set(this.loadProgress, this.loadProgress, 1);
    
    // Change color based on progress
    const hue = (1 - this.loadProgress) * 120; // Green to red
    this.fillMaterial.color.setHSL(hue / 360, 1, 0.5);
  }
  
  stopLoading() {
    this.loading = false;
    this.loadProgress = 0;
    this.loadingFor = null
    this.loaderRing.visible = false;
    this.loaderFill.visible = false;
  }
  
  onLoadComplete() {
    console.log(`${this.loadingFor} loaderFinishwed complete!!`);
    const responder = this.world.getSystem(ResponseSystem);
    const _gesture = Array.from(this.queries.gesture.entities)[0];
    let globalEnty = Array.from(this.queries.global.entities)[0]
    if(Constants.GESTURE_DEBUG) this.testingSwitch(responder)
    else this.prodSwitch(responder)
    this.lastThehro = performance.now()
    this.stopLoading();

  }

  /// for testing in emulator
  testingSwitch(responder){
    const allTutorials = ['tutorial_1','tutorial_2','tutorial_3','tutorial_4'] // no skip on last page
    switch(this.loadingFor){ //nested swwitch 
      case 'thehro': // for 
        if(this.gameState == 'ingame') responder.pauseIt()
        
        // move to thumbsup
        if(this.gameState == 'lobby') responder.lobbyBegin()
        if(this.gameState == 'pause') responder.pauseYes()
        if(this.gameState == 'quitInPause') responder.quitPauseYes()
        if(this.gameState == 'gameover') responder.gameOverYes()

        if(this.gameState == 'tutorial_1') responder.aheadInTutorial('tutorial_2')
        if(this.gameState == 'tutorial_2') responder.aheadInTutorial('tutorial_3')
        if(this.gameState == 'tutorial_3') responder.aheadInTutorial('tutorial_4')
        if(this.gameState == 'tutorial_4') responder.aheadInTutorial('ingame') // move to rockon
        
        break;
      case 'poke': // for 

        // move to thumbdown
        if(this.gameState == 'pause') responder.pauseNo()
        if(this.gameState == 'quitInPause') responder.quitPauseNo()
        if(this.gameState == 'gameover') responder.gameOverNo()

        if(this.gameState == 'tutorial_1') responder.backInTutorial()
        if(this.gameState == 'tutorial_2') responder.backInTutorial()
        if(this.gameState == 'tutorial_3') responder.backInTutorial()
        if(this.gameState == 'tutorial_4') responder.backInTutorial()
          
        break;
          
      case 'niche': // for 
        if(this.gameState == 'lobby') responder.aheadInTutorial('tutorial_1') // move to thumbsup

        // move to thumbdown
        if(this.gameState == 'pause') responder.pauseNo()
        if(this.gameState == 'quitInPause') responder.quitPauseNo()
        if(this.gameState == 'gameover') responder.gameOverNo()
        if(allTutorials.includes(this.gameState)) responder.skipInTutorial()
          
          
        break;
      default:
        console.log('defaulter ', this.loadingFor)
        break
    }
  }

  //// on device settings
  prodSwitch(responder){
    const allTutorials = ['tutorial_1','tutorial_2','tutorial_3','tutorial_4'] // no skip on last page
    switch(this.loadingFor){ //nested swwitch 
      case 'thehro': // for 
        break;
      case 'poke': // for 
        break;  
      case 'niche': // for 
        
        break;
      case 'thumbsup':
        if(this.gameState == 'lobby') responder.aheadInTutorial('tutorial_1') // move to thumbsup
        if(this.gameState == 'pause') responder.pauseYes()
        if(this.gameState == 'quitInPause') responder.quitPauseYes()
        if(this.gameState == 'gameover') responder.gameOverYes()

        if(this.gameState == 'tutorial_1') responder.aheadInTutorial('tutorial_2')
        if(this.gameState == 'tutorial_2') responder.aheadInTutorial('tutorial_3')
        if(this.gameState == 'tutorial_3') responder.aheadInTutorial('tutorial_4')
        break;
      
      case 'thumbsdown':
        if(this.gameState == 'pause') responder.pauseNo()
        if(this.gameState == 'quitInPause') responder.quitPauseNo()
        if(this.gameState == 'gameover') responder.gameOverNo()

        if(this.gameState == 'tutorial_1') responder.backInTutorial()
        if(this.gameState == 'tutorial_2') responder.backInTutorial()
        if(this.gameState == 'tutorial_3') responder.backInTutorial()
        if(this.gameState == 'tutorial_4') responder.backInTutorial()
        break;
      case 'rock-horns':
        if(this.gameState == 'lobby') responder.lobbyBegin()
        if(this.gameState == 'ingame') responder.pauseIt()
        if(this.gameState == 'tutorial_4') responder.aheadInTutorial('ingame') 
        if(allTutorials.includes(this.gameState)) responder.skipInTutorial()
        break;

      default:
        console.log('defaulter ', this.loadingFor)
        break
    }
  }

////////////////////////////
////////////////////ulti wala 
////////////////////////////



triggerLaunch(launchCoords=[0,1,-1]){
    const fireOrbGLTF = AssetManager.getGLTF('flaming_orb');
    const launchPos = new THREE.Vector3(...launchCoords);
    

    const launcher = new FireOrbLauncher(
    this.world, launchPos, fireOrbGLTF
    );
    this.world.audioSystem.playSound('ulti')
    // this.activeLaunchers = this.activeLaunchers || [];
    // this.activeLaunchers.push(launcher);
    this.activeLaunchers.push(launcher);
    this.globalEnty.setValue(GlobalComponent, 'ignisMeter', 1)
    const ignisEntity = this.world.createEntity()
    .addComponent(ignisComponent,{
    launchTime: performance.now()
    })
    ignisEntity.name = 'IGNIS'

}

areHandsCrossed(){
    const condition =  this.leftPos[0] > this.rightPos[0]
    return condition
}

  update(delta){
    this.globalEnty = Array.from(this.queries.global.entities)[0]
        const { score, pauseTime, gameState, ignisMeter } = 
                  getAllGlobalValues(this.globalEnty)
    this.countdownEntity = Array.from(this.queries.countdown.entities)[0]
    this.score = score
    this.ignisMeter = ignisMeter
    this.gameState = gameState
    this.currentTime = performance.now()
    const gestureEntity = Array.from(this.queries.gesture.entities)[0]  //todo optimise
    this.leftGesture = gestureEntity.getValue(GestureComponent, 'left')
    this.rightGesture = gestureEntity.getValue(GestureComponent, 'right')
    this.leftPos = gestureEntity.getVectorView(GestureComponent, 'leftPos')
    this.rightPos = gestureEntity.getVectorView(GestureComponent, 'rightPos')
    
    if(!this.countdownEntity
    ) this.thehroOps()

    /* aag ka gola old  */
    //     for (let i = this.activeLaunchers.length - 1; i >= 0; i--) {
    //   const launcher = this.activeLaunchers[i];
    //   const isActive = launcher.update(delta);
      
    //   if (!isActive) {
    //     // Remove completed launchers
    //     this.activeLaunchers.splice(i, 1);
    //   }
    // }


    /* aag ka gola new  */
    const deltaSeconds = delta / 1000;
    this.activeLaunchers = this.activeLaunchers.filter(launcher => {
      return launcher.update(delta); // Returns false when done
    });
    if(this.areHandsCrossed() && !this.countdownEntity){
        if(this.ignisMeter > 5 && this.gameState == 'ingame'){  
    
    //   if(this.ignisMeter > 100){
      
        const coords = [ 
        //   (this.leftPos[0] + this.rightPos[0])/2 + Constants.IGNIS_CONFIG.OFFSETS[0],
          0,
          Math.max(this.leftPos[1], this.rightPos[1]) + Constants.IGNIS_CONFIG.OFFSETS[1],
          Math.min(this.leftPos[2], this.rightPos[2]) + Constants.IGNIS_CONFIG.OFFSETS[2]
         ]
        this.triggerLaunch(coords)
        this.globalEnty.setValue(GlobalComponent, 'ignisMeter', 1)
      }   
    }
  }
}
