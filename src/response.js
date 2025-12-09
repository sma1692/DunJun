/**
 * Response System. FOr when we ask user questions
 * THey respond with hand gestures 
 * But what happens on confirmation and stuff handled here
 * 
*/

import {  createSystem } from '@iwsdk/core';
import { GlobalComponent, getAllGlobalValues } from './global';
import { GestureComponent } from './gestures';
import { TextOverlaySystem } from './overlay';
import { tutorialComponent } from './scene';

export class ResponseSystem extends createSystem({
  global: { required: [GlobalComponent]},
  tutorial: {required: [tutorialComponent]}
//   gesture: { required: [GestureComponent]},
}) {
    init() {
        this.hudConfigured = false
        this.globalEnty = Array.from(this.queries.global.entities)[0]
        const { score, pauseTime, gameState, health, gameStartTime } = 
                  getAllGlobalValues(this.globalEnty)
        
        this.gameState = gameState
        this.textOverlay = this.world.getSystem(TextOverlaySystem);
        
  
        
      }

     /* menu based long interaction actions  
        these only set GLobalComponent and other values in LongGesture System
        GameSystem and other systems react to the value changes
    */
    lobbyBegin(){
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'ingame')
        this.globalEnty.setValue(GlobalComponent, 'gameStartTime', performance.now())
    }
    /* pausing  */
    pauseIt(){
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'pause')
    }

    pauseYes(){ // resume from pause
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'ingame')
    }
    
    pauseNo(){ // quit from pause 
        this.pauseNoId = this.textOverlay.show(
            'Give up ? ',
             [0, 2, -10],
             { color: '#ff0000', fontSize: '64px', duration: 10 * 3600 *1000 })
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'quitInPause')
    }
    
    quitPauseYes(){ //yes for quit confirmation from pause screen
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'gameover')
        this.textOverlay.remove(this.pauseNoId)
    }

    quitPauseNo(){ // no for quit confirmation from pause screen
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'pause')
        this.textOverlay.remove(this.pauseNoId)
    }
    /* gameover  */
    gameOverYes(){ //restart from gameover
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'ingame')
        this.globalEnty.setValue(GlobalComponent, 'gameStartTime', performance.now())
    }

    gameOverNo(){ // go to lobby from gameover
        console.log(' VR LOBBY MEIN CHALO')
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'lobby')
    }

    /* tutorials */
    aheadInTutorial(nextState){
        this.globalEnty.setValue(GlobalComponent, 'gameState', nextState)
        if(nextState == 'ingame') 
            this.globalEnty.setValue(GlobalComponent, 'gameStartTime', performance.now())
        // if(this.tutEntity) this.tutEntity.destroy()
    }

    backInTutorial(){
        if(this.tutEntity) {
            const prevState = this.tutEntity.getValue(tutorialComponent, 'prev')
            this.globalEnty.setValue(GlobalComponent, 'gameState', prevState)
            // this.tutEntity.destroy()
        }
    }
    
    skipInTutorial(){
        if(this.tutEntity) this.tutEntity.destroy()
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'ingame')
        this.globalEnty.setValue(GlobalComponent, 'gameStartTime', performance.now())
        
    }
    
    update(delta){
        this.globalEnty = Array.from(this.queries.global.entities)[0]
        const { score, pauseTime, gameState, health, gameStartTime } = 
                    getAllGlobalValues(this.globalEnty)
        this.gameState = gameState
        this.tutEntity = Array.from(this.queries.tutorial.entities)[0]
    }

}