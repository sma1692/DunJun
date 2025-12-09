import {   createSystem, eq,PhysicsSystem,  createComponent
} from '@iwsdk/core';

import * as THREE from 'three';
import {  PauseTexComponent, 
  lobbyTextureComponent, tutorialComponent,
  scrollComponent,
  gameOverTexComponent
 } from './scene';
import { GlobalComponent, StimuliComponent, methodsOfStimuli,
   getAllGlobalValues, Constants } from './global';
import { GestureComponent } from './gestures';
import { Floaters } from './blocks';
import { GameAudioSystem } from './audio';
import { TextOverlaySystem } from './overlay';
import { delay } from './helpers';
import { HUDSystem } from './hud';

export const countDownComponent = createComponent('countDownComponent', {});

export class GameSystem extends createSystem({
  global: { required: [GlobalComponent] },
  gesture: { required: [GestureComponent] },
  blocks: { required: [Floaters] },
  lobby: { required: [lobbyTextureComponent] },
  tutorial: { required: [tutorialComponent] },
  gameover: { required: [gameOverTexComponent] },
  scroll: { required: [scrollComponent] },
  stimuli: { required: [StimuliComponent] },
  _pause: { required: [PauseTexComponent] },
}) {
  init() {
    this.hud = this.world.getSystem(HUDSystem);
    this.hudConfigured = false
    this.lobbyConfigured = false
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    const { score, pauseTime, gameState, health, gameStartTime } = 
              getAllGlobalValues(this.globalEnty)
    this.textOverlay = this.world.getSystem(TextOverlaySystem);
    this.audioSystem = this.world.getSystem(GameAudioSystem)
    this.gameOverPanel = false
    this.pausePanel = false
    this.pauseStartTime = -1
    this.defaultOverLayStyle = { color: '#ff0000', fontSize: '48px', 
      duration: Constants.DURATIONS.NEW_WAVE_OVERLAY, followCamera: true }
    this.subtextStyle = {
      color: '#84c50bf5', fontSize: '45px', duration:400
    }
    this.subTextColors = ['#84c50bf5', '#d6b10ef5']
    this.isCountingDown = false
    this.stopCountDown = false

    this.queries.stimuli.subscribe('qualify',async (entity) => {
      const method = entity.getValue(StimuliComponent, 'method')  
      const data = entity.getValue(StimuliComponent, 'data')  
      await this.processStimuli(method, data)
      entity.destroy()
    });

  }
  async countdown(startValue=3, _delay=1000, showOverLay=true, playSound=true){
    if(this.isCountingDown) return
    this.isCountingDown = true
    if (!this.textOverlay || !this.textOverlay.isReady) {
      console.error('TextOverlaySystem! NO visible COUNTDOEN null');
    }
    
    for (let i = startValue; i >= 1; i--) {
        if(this.stopCountDown) break
        const soundToPlay =  i == 1 ? 'countdown' : 'countdown'
        if(showOverLay && this.textOverlay && this.textOverlay.isReady){
          this.textOverlay.show(i.toString(), 'camera',this.defaultOverLayStyle)
          await delay(150)
        }
        if(playSound) this.audioSystem.playSound(soundToPlay)
        await delay(_delay); 
    }
    this.isCountingDown = false
    
  }

  async processStimuli(method, data){
    switch(method){
      case 'newWave':
        if(this.gameState != 'ingame') return
        const countdownEntity = this.world.createEntity()
          .addComponent(countDownComponent,{})
          countdownEntity.name = 'finalCountDown'
        await this.waveOverlay(data.wave)
        await this.countdown(3)
        countdownEntity.destroy()
        if(data.wave == Constants.BGM_CHANGE)
          this.audioSystem.loadBGM('bgm4')
        break;
      case 'audioText':
        this.audioTextProcess(data)
        break;
      case 'audio':
        this.audioProcess(data.audio)
        break;
      case 'bgm':
        this.bgmProcess(data)
        break;
      default:
        break;
    }
  }

  async waveOverlay(wave){
    if(this.textOverlay){
      this.textOverlay.show(
        `WAVE ${wave}`, 'camera', this.defaultOverLayStyle )
      await delay(Constants.DURATIONS.NEW_WAVE_OVERLAY)
    }      
  }

  audioTextProcess(data){
    const { text, options, audio} = data
    if(this.textOverlay){
      this.textOverlay.show(
        text, 'camera', options )
    }      
    this.audioProcess(audio)
  }

  bgmProcess(data){
    const { operation, bgm} = data
    // todo - halt and stop based on operation
    this.audioSystem.loadBGM(bgm)
    
  }
  
  audioProcess(audio){ this.audioSystem.playSound(audio)  }

  manageGameOverState(){
    this.stopCountDown = true
    let triggered = false
    const gameOverEntity = Array.from(this.queries.gameover.entities)[0]
    if(!gameOverEntity) return;
    triggered = gameOverEntity.getValue(gameOverTexComponent, 'triggered')
    const tol = this.gameState
    // debugger
    if(triggered) return;
    this.unPause(true)
    this.cleanUp()
    this.audioSystem.loadBGM('bgm2')
    gameOverEntity.setValue(gameOverTexComponent, 'triggered', true)

  }

  cleanUp(){ //postGameOverCleanup
    const _blocks = Array.from(this.queries.blocks.entities)
    console.log(`Removing ${_blocks.length} Floaters from system`)
    for(let i=0; i<_blocks.length; i++){
      let blk = _blocks[i]
      blk.destroy()
    }
    this.globalEnty.setValue(GlobalComponent, 'gameStartTime', -1 )
    this.globalEnty.setValue(GlobalComponent, 'pauseTime', 0 )
    this.globalEnty.setValue(GlobalComponent, 'health', Constants.START_HEARTS )
    this.globalEnty.setValue(GlobalComponent, 'ignisMeter', 1 )
  }
  
  managePauseState(){
    if(this.pausePanel) return
    if(this.isCountingDown) {
      this.stopCountDown = true
      this.isCountingDown = false
    }
    this.audioSystem.playSound('pause_one')

    let phys = this.world.getSystem(PhysicsSystem)
    this.pauseStartTime = performance.now()
    phys.isPaused = true

    this.pausePanel = true
  }

  async unPause(fromGameOver=false){
    
    this.pausePanel = false
    const previousPauseTime = this.globalEnty.getValue(GlobalComponent, 'pauseTime')
    const totalPauseTime = 
        previousPauseTime + performance.now() - this.pauseStartTime
    this.pauseStartTime = -1
    const pauseEnty = Array.from(this.queries._pause.entities)[0]
    if(pauseEnty) pauseEnty.destroy()
    if (fromGameOver) this.audioSystem.playSound('gameover_one')
    else {
      this.stopCountDown = false
      this.audioSystem.playSound('resume_one')
      await delay(Constants.DURATIONS.RESUME_4M_PAUSE)
      await this.countdown()
    }
    let phys = this.world.getSystem(PhysicsSystem)
    phys.isPaused = false
    
    
    this.globalEnty.setValue(GlobalComponent, 'pauseTime', totalPauseTime)    
  }
  

  startGame(){
    if(!this.hudConfigured){
      this.audioSystem.playSound('gamestart')
      this.bgmProcess({bgm: 'bgm3'})
      this.hud.createHud()
      this.hudConfigured = true
    }
    if(this.pauseStartTime > 0) this.unPause(); 
    this.gameOverPanel = false
    this.lobbyConfigured = false
    this.pausePanel = false
  }

  update(delta, time) {
    // delta: Time since last frame (in seconds) - use for frame-rate independent movement
    // time: Total elapsed time since start (in seconds) - use for animations and timing
    if(!this.textOverlay)
      this.textOverlay = this.world.getSystem(TextOverlaySystem);
    if(!this.hud) this.hud = this.world.getSystem(HUDSystem);
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    const { score, pauseTime, gameState, health, gameStartTime, ignisMeter } = 
              getAllGlobalValues(this.globalEnty)
    this.score = score
    this.ignisMeter = ignisMeter
    this.gameState = gameState
    this.gameStartTime = gameStartTime
    this.pauseTime = pauseTime
    this.gameTime = performance.now() - (this.gameStartTime + this.pauseTime)
    const gestureEntity = Array.from(this.queries.gesture.entities)[0]
    this.leftPos = gestureEntity.getVectorView(GestureComponent, 'leftPos')
    this.rightPos = gestureEntity.getVectorView(GestureComponent, 'rightPos')
    
    const scrollEnty = Array.from(this.queries.scroll.entities)[0]
    
    if(this.gameState != 'lobby') this.lobbyConfigured = false
    switch(this.gameState){
      case 'outside':
        
        break;
      case 'lobby':
        
        break;
      case 'ingame':
        this.startGame()
        
        break;
      case 'gameover':
        this.manageGameOverState()
        break;
      case 'pause':
        this.managePauseState()

        break;
      case 'tutorial_1':
      case 'tutorial_2':
      case 'tutorial_3':
      case 'tutorial_4':
      case 'tutorial_5':

        break;
      case 'quitInPause':

        break;
      default:
        break;
    }    
  }
}
