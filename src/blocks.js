import {
  Types,
  createComponent,
  createSystem, DistanceGrabbable, MovementMode,
  Entity, Mesh, Interactable, MeshBasicMaterial,
  Pressed, AssetManager
} from '@iwsdk/core';

import {
  PhysicsBody,  PhysicsShape, PhysicsSystem,
  PhysicsState,  PhysicsShapeType, 
  MeshStandardMaterial, PhysicsManipulation 
} from '@iwsdk/core';


import { GlobalComponent, Constants, getAllGlobalValues,
  StimuliComponent, methodsOfStimuli
 } from './global';
import { GestureComponent } from './gestures';
import { BlockLoader } from './assets/loader'
import { GameAudioSystem } from './audio';
import { TextOverlaySystem } from './overlay';
import { VRLogger } from './utils/metrics';
import { delay, getVectorMagnitude } from './helpers';
import * as THREE from 'three';
import { ignisComponent } from './spells';
import { HUDSystem } from './hud';


export const Floaters = createComponent('Floaters', {
    isVisible: { type: Types.Boolean, default: false },
    spawnTime: { type: Types.Float32 },
    doomTime: { type: Types.Float32, default: -1  },
    wave: { type: Types.Float32 },
    state: { type: Types.Float32, default: 'waiting' }
    
})

export const canCollide = createComponent('canCollide', {});


export class FloaterSystem extends createSystem({
  blocks: { required: [Floaters] },
  global: { required: [GlobalComponent] },
  gesture: { required: [GestureComponent] },
  ignis: { required: [ignisComponent]}
}) {
  init() {
    this._initialize()
    this.hud = this.world.getSystem(HUDSystem);
    
    this.gameState = 'lobby'
        
    this.arm_span_multiplier = 1.5 // x: -1.25 to 1.25m (arm span width)
    this.torso_span_multiplier =  0.6 // y: 0.8 to 1.4m (torso to shoulder height)
    this.leftGesture = 'idle'
    this.rightGesture = 'idle'
    this.damagingHits = Constants.GESTURE_DEBUG ? 
      ['punch', 'poke', 'slap', 'open']: ['punch', 'poke', 'slap']
    this.tutorialWaves = [1,2]
    this.blockLoader = new BlockLoader()
    this.assetMap = this.blockLoader.assetMap
    
    this.NUM_BLOCKS = Constants.NUM_BLOCKS
    
    this.collisionRadius = 0.5 // to calculate angular momentum

    this.audioSystem = this.world.getSystem(GameAudioSystem)
    this.textOverlay = this.world.getSystem(TextOverlaySystem);
    this.logger = new VRLogger(this.world.camera)

    //flash plane
    this.flashColor = 0xff0000
    const geo = new THREE.PlaneGeometry(5, 5);
    const mat = new THREE.MeshBasicMaterial({
        color: this.flashColor,
        transparent: true,
        opacity: 0
    });
    this.flash = new THREE.Mesh(geo, mat);
    
    this.flash.position.set(0, 0, -1.5);
    this.flashStartTime = null
    this.flashActive = 0 // flash intensity
    this.entityFlashMap = {}
    this.world.camera.add(this.flash);
    
    this.queries.blocks.subscribe('disqualify', async (entity) => {
        const blockies = Array.from(this.queries.blocks.entities)
        if(blockies.length == 0){
          if(this.gameState != 'ingame') return
          this.genWave = false
          if(this.blocksCreated > 1) this.wave += 1
          this.waveFactor =  Math.max(1, 4 / (1 + Math.exp(-1 * (this.wave - 5))))
          await this.waveGeneration()
          this.genWave = false
        }
    });

  }

  _initialize() {
    this.gameStartTime = null; // Will be set when game starts
    this.pauseTime = 0
    
    this.score = 0
    this.blocksCreated = 0
    this.wave = 1
    this.blockIsDying = {}
    this.waveFactor = 1

  }

  async waveGeneration (){
    if(this.genWave) return
    this.genWave = true
    const stimulus = this.world.createEntity()
    stimulus.addComponent(StimuliComponent, {
      method: methodsOfStimuli.newWave,
      data: { wave: this.wave }
    })
    const badiDerHogayi = Constants.DURATIONS.NEW_WAVE_OVERLAY + 
        3 * Constants.DURATIONS.COUNTDOWN
    await delay(badiDerHogayi)
    const gameState = this.globalEnty.getValue(GlobalComponent, 'gameState')
    if(gameState != 'ingame') return
    if(this.gameState)
    this.spawner(this.wave)
    this.genWave = false
  }
  

  normalizeMeshSize(mesh, targetSize) {
    // Calculate current bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Find the largest dimension
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Calculate scale factor to make largest dimension equal targetSize
    const scaleFactor = targetSize / maxDimension;
    
    mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

  createSpawnPosition(){
    const depth = Constants.FOG_WALL[2]
    return [(Math.random() - 0.5) * this.arm_span_multiplier,
            this.torso_span_multiplier + 0.75,
              depth - 2
          ]
  }

  spawner(currentState={}){
    
    const blocksTogen = this.NUM_BLOCKS * parseInt(this.waveFactor)
    const spawnList = this.blockLoader.createSpawnList(blocksTogen,
       Constants.SPAWN_DELAY, currentState)
    for(let i=0; i<spawnList.length;i++){

      const toSpawnTuple = spawnList[i]
      const toSpawnObj = this.assetMap[toSpawnTuple[0]]
      const { asset, angularVelocity, type, 
        interactable, grabbable, health } = toSpawnObj

      const spawnTime = this.currentTime + toSpawnTuple[1] * (i+1) 
      const spawnAsset = asset
      const floatMesh = spawnAsset.scene
      
      const clonedMesh = floatMesh.clone()
      const _name = `${toSpawnTuple[0]}:${this.wave}:${i}`
      this.normalizeMeshSize(clonedMesh, 0.65);
      
      //////////////////
      const bbox = new THREE.Box3().setFromObject(clonedMesh);
      const bboxHelper = new THREE.Box3Helper(bbox, 0xffff00);
      const bboxDimensions = new THREE.Vector3();
      
      bbox.getSize(bboxDimensions)
      let radius = Math.max(bboxDimensions.x, bboxDimensions.y, bboxDimensions.z);
      if (Constants.DEBUG){
        clonedMesh.add(bboxHelper);

        
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
        // const material = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });
        const sphereMesh = new THREE.Mesh(geometry, material);
        clonedMesh.add(sphereMesh);
      }
      /////////////////
      const spawnPos = this.createSpawnPosition()
      clonedMesh.position.set(spawnPos[0], spawnPos[1], spawnPos[2])
      clonedMesh.visible = false;
      clonedMesh.userData.normalizedScale = clonedMesh.scale.clone();
      clonedMesh.userData = {
        // normalizedScale : clonedMesh.scale.clone(),
        angularVelocity, type, interactable, grabbable, health,
        spawnPos, bboxDimensions, 
        radius, wave: this.wave
      }
      let entity = this.world.createTransformEntity(clonedMesh);
      entity.name = _name
      entity.addComponent(Floaters, {
          spawnTime : spawnTime,
          state: 'waiting',
          doomTime: spawnTime + Constants.DEsTROY.MAX_AGE
      });      
    }
    this.blocksCreated += spawnList.length
  }

  dikhaaveKaKaam (entity) {
      const mesh = entity.object3D;
      const {angularVelocity, type, interactable, grabbable,
         health, spawnPos} =  mesh.userData
      // ===== Physics Related stuff
      entity.addComponent(PhysicsShape, {
        shape: PhysicsShapeType.Box, 
        // dimensions: [0.5,0.5,0.5],        
      });
      entity.addComponent(PhysicsBody, {
        // state: PhysicsState.Dynamic,
        state: PhysicsState.Kinematic,
        // position: [spawnPos[0], spawnPos[1], spawnPos[2]]
      });
         
      // as per the documentation, physics manipulation only exists for one frame
      // applies the velocities and forces and then leaves
      // somewhat like stone cold steve austin: arrive, raise hell, leave
      entity.addComponent(PhysicsManipulation, {
        angularVelocity: [0, angularVelocity, 0], // Add spin
        linearVelocity: [0, 0, Constants.MOVE_SPEED * this.waveFactor],
      });
      entity.addComponent(canCollide, {  });
      if(this.tutorialWaves.includes(this.wave) && this.gameState != 'pause'){
        const {id, label} = this.textOverlay.labeller(type, mesh.userData.bboxDimensions)
        mesh.add(label)
        mesh.userData.label = id
      }
  }

  reduceHealth(){
    let finalHealth = this.health - 1
    if(finalHealth <= 0 ) { // gameover jhaala bitch  
      this.globalEnty.setValue(GlobalComponent, 'gameState', 'gameover')
      this.flash.material.opacity = 0
    }
    this.globalEnty.setValue(GlobalComponent, 'health', finalHealth)
    if(this.hud) this.hud.setHealth(finalHealth)
  }

  _destroy(entity, destroyWHy=9){
    let _name = entity.name
    let preDestructNum = Array.from(this.queries.blocks.entities).length
    if(destroyWHy!=9){ // for non ignis
      const { wave, label } = entity.object3D.userData
      if(this.tutorialWaves.includes(wave) && label){
        this.textOverlay.remove(label)
      }
    }
    
    

    entity.destroy()
    let postDestructNum = Array.from(this.queries.blocks.entities).length
    console.log(`))))destroyed:${_name} Pre ${preDestructNum}, Post  ${postDestructNum} Why `, destroyWHy)
  }

  handleCollision(entity){
    // todo add condition to see if body collided already and not compute shit
    
    if(!entity.object3D) return
    const _mesh = entity.object3D;
    const { type } = _mesh.userData
    const isDamageInflicting = this.damagingHits.includes(type)
    const trackers = entity.collisionTracker || []
    let isValidCollision = false
    let isActiveCollision = false
    
    // let validIndex, collisionDeets

    let validIndex = -1
    let collisionDeets = null

    for(let i=0; i< trackers.length; i++){
      const tracker = trackers[i]
      if (!tracker || typeof tracker.collisionTime !== 'number' || !tracker.collidingEntity) {
     console.warn('Malformed tracker at', i, tracker);
      // continue;
    }
      isActiveCollision = 
        this.currentTime - tracker.collisionTime <= Constants.COLLISION_DURATION
      let isSameType = tracker.collidingEntity.gesture == type

      if(isDamageInflicting) // for hitters
          isValidCollision =  isActiveCollision && isSameType ? true: false
      else isValidCollision = isActiveCollision

      if(isValidCollision){
        // handVelocity = tracker.collidingEntity.velocity
        collisionDeets = tracker
        validIndex = i
        
      }
    }
    if(validIndex === undefined && !isValidCollision) validIndex = trackers.length // to reset the collisionTracker
    //////////////// PLANETS COLLIDE!!!!
    ////////////////////////
    ////////////////////////
    if(isValidCollision && collisionDeets){
      if(isDamageInflicting) this.infictingCollider(entity, collisionDeets, validIndex)
      else this.consumableCollider(entity, type)
    }
    else{
      ////// Reset collision tracker
      // entity.collisionTracker.splice(0, validIndex) // splice the entire array
    }  
    // apply forces
  }
  blockDeathOps(entity, linear, angular=[0,0,0], addIgnis=true){ // upon hand hit or ignis, or any power up in future
    if(this.blockIsDying.hasOwnProperty(entity.name)) return;
    this.audioSystem.playSound('slap')
    this.blockIsDying[entity.name] = this.currentTime
    entity.addComponent(PhysicsManipulation, {
          linearVelocity: linear,
          angularVelocity: angular
        });
      entity.removeComponent(PhysicsBody);
      entity.addComponent(PhysicsBody, {
        state: PhysicsState.Dynamic,
      });
      //remove canCollideComponent
      entity.removeComponent(canCollide);
      // schedule destruction time and change state
      entity.setValue(Floaters, 'doomTime', 
        this.currentTime + Constants.DEsTROY.FLOATER_HIT)
      entity.setValue(Floaters, 'state', 'hit')
      const previousScore = this.globalEnty.getValue(GlobalComponent, 'score')
      const scoreAdd = this.setScore(linear)
      this.globalEnty.setValue(GlobalComponent, 'score', previousScore + scoreAdd)
      if(this.hud) this.hud.addScore(scoreAdd)

      // ignisMeter Additions
      if(!addIgnis) return;
      const previousIgnis = this.ignisMeter
      if(previousIgnis > 100 ) return
      const ultiAdd = 1 * Constants.ULTI_FACTOR
      const finalIgnis = previousIgnis + ultiAdd
      this.globalEnty.setValue(GlobalComponent, 'ignisMeter', finalIgnis)
      if(this.hud) this.hud.setIgnisMeter(finalIgnis)
  }
  infictingCollider(entity, collisionDeets, validIndex){
    // this.audioSystem.playSound(collisionDeets.collidingEntity.gesture)
      // debugger
      const {linear, angular} = this.calculateDepartVelocity(collisionDeets)      
      this.blockDeathOps(entity,linear,angular)
      // remove the collisionTrackerObject
      // entity.collisionTracker.splice(validIndex, 1) // assuming only one item and first item
      
  }

  consumableCollider(entity, type){
    if(type == 'consume'){
      this.globalEnty.setValue(GlobalComponent, 'score', this.score + 10)
      let text, style,  audio
      if(this.health < Constants.MAX_HEARTS){
        text = 'Heart + 1'
        style = { color :  '#84c50bf5'}
        audio = 'healthup'
        // this.audioSystem.playSound('healthup')
        this.globalEnty.setValue(GlobalComponent, 'health', this.health + 1)
      }
      else {
        text = 'Maximum Hearts'
        style = { color :  '#eb8d00f5'}
        audio = 'full'

      }
      this.world.createEntity().addComponent(StimuliComponent,{
        method: methodsOfStimuli.audioText,
        data: { text, audio,  options:{...style,
            ...Constants.OVERLAY.SUBTEXT}, 
          }
      })
      this._destroy(entity, type)
    }
    else console.log('nt')
  }

  calculateDepartVelocity(collisionDeets){
    const handVelocity = collisionDeets.collidingEntity.velocity
    const handMass = collisionDeets.collidingEntity.mass
    const condition = handVelocity[2] == 0
    // this.logger.log(`hNM', ${handVelocity[2].toFixed(3)}, ${handMass} | ${condition}`)
    // const linear = handVelocity[2] == 0 ? [ 0, 1, -5] : [ 0, 1, -5]
    let linear = [
      condition ? 0 : 50 * handMass * handVelocity[0],
      condition ? 1 : 50 * handMass * handVelocity[1],
      condition ? -5 : 50 * handMass * handVelocity[2]
    ]
    const angular = [
      5 * linear[0] / (3.2* this.collisionRadius),
      5 * linear[1] / (3.2* this.collisionRadius),
      5 * linear[2] / (3.2* this.collisionRadius),
    ]    
    return { linear, angular}

  }

  setScore(linearVel){
    const scoreAddition = getVectorMagnitude(linearVel)
    return scoreAddition 
  }

  destructionManager(entity, spawnTime){
    let doWeDestroy = 0
    const destructionTime = entity.getValue(Floaters, 'doomTime')
    if(destructionTime < 0) return
    if(this.currentTime - (spawnTime + this.pauseTime)
      > Constants.DEsTROY.MAX_AGE ) 
      doWeDestroy = {reason: 1,
          others: [this.currentTime, spawnTime, this.pauseTime, this.currentTime - (spawnTime + this.pauseTime) > Constants.DEsTROY.MAX_AGE]}
    if (destructionTime + this.pauseTime < this.currentTime)
      doWeDestroy = {reason: 2,
          others: [destructionTime, this.pauseTime, this.currentTime,spawnTime, destructionTime + this.pauseTime > this.currentTime]}
    if(doWeDestroy.reason > 0) this._destroy(entity, doWeDestroy)
  }

  update(delta){
    const deltaSeconds = delta / 1000; // Convert to seconds if needed
    if(!this.hud)
      this.hud = this.world.getSystem(HUDSystem);
    if(!this.textOverlay)
      this.textOverlay = this.world.getSystem(TextOverlaySystem);
    
    //// fetching components
    const _gesture = Array.from(this.queries.gesture.entities)[0]
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    this.ignisEntity = Array.from(this.queries.ignis.entities)[0]
    const blockEntities = Array.from(this.queries.blocks.entities)
    // setting values
    const { score, pauseTime, gameState, health, gameStartTime, ignisMeter } = 
          getAllGlobalValues(this.globalEnty)
    
    this.score = score
    this.pauseTime = pauseTime
    this.gameState = gameState
    this.health = health
    this.ignisMeter = ignisMeter
    this.gameStartTime = gameStartTime
    this.currentTime = performance.now()
    this.elapsedTime = this.currentTime - (this.gameStartTime + this.pauseTime)
    if(this.gameState == 'gameover') {
      this.flash.material.opacity = 0
      this._initialize()
    }
    if(this.gameStartTime < 0 || this.gameState !== 'ingame') return;
    if(this.gameState == 'pause') return;
    
    
    ///////// spawn logic    

    if (this.blocksCreated == 0 ) {  // ungli tedi karke ghee nikalna, just to work with stimulus
      const blankie = this.world.createEntity()
        blankie.addComponent(Floaters, {
      })
      blankie.destroy()
      this.blocksCreated += 1
    }
    
    //////// get gesture
    
    this.leftGesture = _gesture.getValue(GestureComponent, 'left')
    this.rightGesture = _gesture.getValue(GestureComponent, 'right')
    
    /* damage flasher */
    if (this.flashActive > 0) {
      Object.keys(this.entityFlashMap).forEach(enty=>{
        
        if (!this.entityFlashMap[enty].flashBegun){
          this.flashActive = 0.7
          this.entityFlashMap[enty].flashBegun = true
        }
      })
      this.flash.material.opacity = Math.max(0, this.flashActive);
      this.flashActive -= delta * 5; // Fade speed
    }
    else this.flash.material.opacity = Math.max(0, this.flashActive);

    this.ignisEntity = Array.from(this.queries.ignis.entities)[0]
    this.killIgnis()
    for(let i=0; i<blockEntities.length; i++){
      this.ignisEntity = Array.from(this.queries.ignis.entities)[0]
      const entity = blockEntities[i]
      const spawnTime = entity.getValue(Floaters, 'spawnTime')
      const isVisible = entity.getValue(Floaters, 'isVisible')
      /*  DESTRUCTION  */
      this.destructionManager(entity, spawnTime)
      
      /* visibility and spawning */
      if(!isVisible && 
          this.currentTime >= spawnTime + this.pauseTime && 
          entity.object3D){
        entity.setValue(Floaters, 'isVisible', true)
        entity.setValue(Floaters, 'state', 'spawned')
        entity.object3D.visible = true
        this.dikhaaveKaKaam(entity)
      }

      if(isVisible){
        if(this.ignisEntity){
          this.blockDeathOps(entity, [0, 1, -6], [0,0,1], false)
          continue;

        }
        if( entity.collisionTracker && entity.collisionTracker.length != 0){
          this.handleCollision(entity)            
          // continue
        }
        /* DAMAGING CIRCUMSTANCES */
        const _type = entity.object3D?.userData.type
        if(entity.object3D &&
           entity.object3D.position.z > 0.2){ // breach condition
            
            if(_type && !this.damagingHits.includes(_type)) return //heart or consumable
            if(!this.entityFlashMap.hasOwnProperty(entity.name)){
              this.entityFlashMap[entity.name] = { flashBegun: false }
              this.flashActive = 0.1
              this.audioSystem.playSound('damage1')            
            }
            this.reduceHealth()
            this._destroy(entity, 3)
        }
      }
      else{
        if(this.ignisEntity){
        this._destroy(entity, 9)
      }
      }
      
    }
  }

  killIgnis(){ // checks if time up and kills
    if(!this.ignisEntity) return 
    let launchTime = this.ignisEntity.getValue(ignisComponent, 'launchTime')
    if(launchTime + Constants.DEsTROY.IGNIS < this.currentTime){
      this._destroy(this.ignisEntity)
      if(this.hud) this.hud.depleteIgnisMeter()
    }
  }

}
// 