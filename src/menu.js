import { AssetManager, createSystem, 
    PanelUI, PanelDocument, eq,
  VisibilityState  } from "@iwsdk/core";
import { GlobalComponent, StimuliComponent, methodsOfStimuli,
  getAllGlobalValues } from "./global";

import { analyzeObject } from "./debugger";


import { formatTime } from "./helpers";
import { Constants } from "./global";
import { lobbyTextureComponent, gameOverTexComponent,
  PauseTexComponent, tutorialComponent, scrollComponent,
  createDynamicCompositeComps,createDynamicComposite,
  outsideComponent
 } from "./scene";

import * as THREE from 'three';

const gestures = {
  up: '👍',
  down: '👎',
  rock: '🤘',
  fist: '✊',
  slap: '🖐'
};



export class MainMenuSystem extends createSystem({
  global : { required: [GlobalComponent]},
  welcomePanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', '/ui/welcome.json')]
  },
  lobby: { required: [lobbyTextureComponent] },
  gameover: { required: [gameOverTexComponent] },
  _pause: {  required: [PauseTexComponent]  },
  tutorial: { required: [tutorialComponent] },
  scroll: { required: [scrollComponent] },
  outside: { required: [outsideComponent] },

  
}) {
  
  init() {
    
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    const { score, pauseTime, gameState, health, gameStartTime, ignisMeter } = 
                    getAllGlobalValues(this.globalEnty)
    this.score = score
    this.health = health
    this.ignisMeter = ignisMeter

    this._scoreText = null; // Text node for score value
    this._healthIcons = []; // Heart nodes
    this._ultiBar = null;
    
    ///// INit the welcome panel, migrate from panel.js

    this.queries.welcomePanel.subscribe('qualify', (entity) => {
      const document = PanelDocument.data.document[entity.index];
      if (!document) return;
      this.renderOpeningPanel(document)
      this.iAmOnTheOutside()
    });


    this.world.renderer.xr.addEventListener('sessionstart', () => {
        const logoEntity = Array.from(this.queries.outside.entities)[0] 
        if(logoEntity) logoEntity.destroy()
        const welco = Array.from(this.queries.welcomePanel.entities)[0]
        this.globalEnty.setValue(GlobalComponent, 'gameState', 'lobby')
        
    });


    this.world.renderer.xr.addEventListener('sessionend', () => {
        // todo 
    });
    
  }



  renderOpeningPanel(document){
    const xrButton = document.getElementById('xr-button');
    xrButton.addEventListener('click', () => {       
      if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
        this.aaveshVR()
      } 
    });
  }

  aaveshVR(){
    this.globalEnty.setValue(GlobalComponent, 'gameState', 'lobby')
    this.world.launchXR();
  }

  iAmOnTheOutside(){
    const sabhkaPos = [-1.5, 1.7, -1.1]
    const componentList = [
      [ outsideComponent,  {    }  ]
    ]
    let { finalBanner, compositeEntity } = 
    createDynamicComposite(this.world, 'outside', [],componentList, {position: sabhkaPos})
    finalBanner.rotateY(Math.PI);
    this.world.createEntity().addComponent(StimuliComponent,{
      method: methodsOfStimuli.bgm,
      data: { bgm: 'bgm1', operation: 'change' }
    })
    // this.groupWithScrollNCreateEntity(meshList, componentList, options)
  }

  groupWithScrollNCreateEntity(meshList,  componentList, options={}){
    /**  group with our scrollasset and created entity
     * meshList: toBeGrouped together for singular enityt, make sure to position it before passing here
     *  componentList: [[ <componentObj> , <jsonforcomponent>], [ <componentObj1> , <jsonfocomponent1>]]
     */
    
    const config = {
      // followCamera: options.followCamera !== undefined ? options.followCamera : false,
      followCamera: true,
      name: options.name || 'manowar',
      offset: options.offset || { x: 0, y: 0, z: 0 },
      scrollScale: options.scrollPos || [0.35, 0.35, 0.35],
      scrollPos: options.scrollPos || [
          0, Constants.TEXTURE.POSITION[1],
          Constants.TEXTURE.POSITION[2] - 0.1
      ],
      distance: options.distance || 3, // Distance from camera
      ...options
    };

    const scrollGroup = new THREE.Group();
    
    
    const { scene: scrollMesh } = AssetManager.getGLTF('scroll');
    scrollMesh.scale.set(...config.scrollScale);
    scrollMesh.position.set(...config.scrollPos);
    scrollGroup.add(scrollMesh);
    
    for(let i=0; i<meshList.length; i++){
      const _mesh = meshList[i]
      scrollGroup.add(_mesh)
    }
    
    if (config.followCamera) {
      this.updateScrollPosition(scrollGroup, this.world.camera, config);
    } else {
      scrollGroup.position.set(config.offset.x, config.offset.y, config.offset.z);
    }
    scrollGroup.userData.scrollConfig = config;
    
    const compositeEntity = this.world.createTransformEntity(scrollGroup);
    componentList.forEach(compItem=>{
      compositeEntity.addComponent(compItem[0], compItem[1])
    })
    compositeEntity.name = config.name

  }

  async setupLobby (options={}){
    const lobbyTexture = AssetManager.getTexture('lobby');
    lobbyTexture.colorSpace = THREE.SRGBColorSpace;
    const lobbyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(...Constants.TEXTURE.DIMENSIONS),
      new THREE.MeshBasicMaterial({
        map: lobbyTexture,
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    lobbyPlane.scale.set(0.9,0.9,0.9);
    lobbyPlane.position.set(...Constants.TEXTURE.POSITION);

    

    const meshList = [lobbyPlane]
    const componentList = [
      [ scrollComponent,  {    }  ],
      [ lobbyTextureComponent,  {    }  ]
    ]
    this.groupWithScrollNCreateEntity(meshList, componentList)
    this.world.createEntity().addComponent(StimuliComponent,{
      method: methodsOfStimuli.bgm,
      data: { bgm: 'bgm2', operation: 'change' }
    })
   
  }

  setupTutorials (tutorial) {
    const tutEntities = Array.from(this.queries.tutorial.entities)
    let createEntity = false

    if(tutEntities.length == 0 ) createEntity = true
    else{
      const savedCurrent = tutEntities[0].getValue(tutorialComponent, 'current')
      if(this.gameState != savedCurrent) createEntity = true
    }
    if(!createEntity) return
    this.world.createEntity().addComponent(StimuliComponent,{
      method: methodsOfStimuli.audio,
      data: { audio: 'click_one' }
    })
    const tutorialB4After = {
      'tutorial_1': ['lobby', 'tutorial_2'],
      'tutorial_2': ['tutorial_1', 'tutorial_3'],
      'tutorial_3': ['tutorial_2', 'tutorial_4'],
      'tutorial_4': ['tutorial_3', 'tutorial_5'],
      'tutorial_5': ['tutorial_4', 'ingame'],
    }
    const componentList = [
      [ scrollComponent,  {    }  ],
      [
        tutorialComponent,
        {
          prev: tutorialB4After[tutorial][0], 
          current: tutorial,
          after: tutorialB4After[tutorial][1]
        }
      ]
    ]

    const finalBanner = createDynamicCompositeComps(
      tutorial, [], componentList  )
    this.groupWithScrollNCreateEntity([finalBanner], componentList)
    if(tutEntities.length != 0) tutEntities[0].destroy()
    
  }
  

  setupGameOverPanel(score, gameTime) {
    const gameOverEntity = Array.from(this.queries.gameover.entities)[0]
    if(gameOverEntity) return
    const overLayElements = [
      { 
        text: score.toLocaleString('en-US'), 
        x: 0.65,  y: 0.37,  fontSize: 80,  align: 'right',
        color: '#ff0000', strokeColor: 'black',  strokeWidth: 8,
        shadowColor: 'rgba(0, 0, 0, 0.8)',  shadowBlur: 20
      },
      { 
        text: formatTime(gameTime), 
        x: 0.73,  y: 0.5,  fontSize: 50,  align: 'right',
        color: '#ff0000', strokeColor: 'black',  strokeWidth: 8,
        shadowColor: 'rgba(0, 0, 0, 0.8)',  shadowBlur: 20
      },
    ]
    const componentList = [
      [ scrollComponent,  {    }  ],
      [gameOverTexComponent, {}]
    ]
    const finalBanner = createDynamicCompositeComps(
      'gameover', overLayElements, componentList
    )
    this.groupWithScrollNCreateEntity([finalBanner], componentList)

  }

  
  setupPausePanel = (score, gameTime) => {
    const pauseEntity = Array.from(this.queries._pause.entities)[0]
    if(pauseEntity) return
    const overLayElements = [
      { 
        text: score.toLocaleString('en-US'), 
        x: 0.65,  y: 0.37,  fontSize: 80,  align: 'right',
        color: '#ff0000', strokeColor: 'black',  strokeWidth: 8,
        shadowColor: 'rgba(0, 0, 0, 0.8)',  shadowBlur: 20
      },
      { 
        text: formatTime(gameTime), 
        x: 0.73,  y: 0.5,  fontSize: 50,  align: 'right',
        color: '#ff0000', strokeColor: 'black',  strokeWidth: 8,
        shadowColor: 'rgba(0, 0, 0, 0.8)',  shadowBlur: 20
      },
    ]
    const componentList = [
      [ scrollComponent,  {    }  ],
      [PauseTexComponent, {}]
    ]
    const finalBanner = createDynamicCompositeComps(
      'pause', overLayElements, componentList
    )
    this.groupWithScrollNCreateEntity([finalBanner], componentList)
  
  }
  
  update(delta){
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    const { score, pauseTime, gameState, health, gameStartTime, ignisMeter } = 
                    getAllGlobalValues(this.globalEnty)
    const previousHealth = this.health
    const previousScore = this.score
    const previousUlti= this.ignisMeter
    this.score = score
    this.health = health
    this.ignisMeter = ignisMeter
    this.gameStartTime = gameStartTime
    this.pauseTime = pauseTime
    this.gameState = gameState
    this.gameTime = performance.now() - (this.gameStartTime + this.pauseTime)
    const scrollEntities = Array.from(this.queries.scroll.entities)
    for(let i=0; i < scrollEntities.length; i++){
      const entity = scrollEntities[i]
      const scrollGroup = entity.object3D;
      const config = scrollGroup.userData?.scrollConfig;
      // if(config) 
        this.updateScrollPosition(scrollGroup, this.world.camera, config);
    }

    if(gameState != 'outside'){
      const welcomeEnty = Array.from(this.queries.welcomePanel.entities)[0]
      if(welcomeEnty) welcomeEnty.destroy()
    }
    
    const lobbyEnty = Array.from(this.queries.lobby.entities)[0]
    const gameOverEnt = Array.from(this.queries.gameover.entities)[0]
    const scrollEnty = scrollEntities[0]
    const tutEntity = Array.from(this.queries.tutorial.entities)[0]
    switch(gameState){
      case 'lobby':
        if(!lobbyEnty) this.setupLobby()
        break;
      case 'tutorial_1':
      case 'tutorial_2':
      case 'tutorial_3':
      case 'tutorial_4':
        if(lobbyEnty) lobbyEnty.destroy()
          this.setupTutorials(gameState)
        
        // check for unpause condition 
        break;
      case 'gameover':
        this.setupGameOverPanel(this.score, this.gameTime)
        break;
        
      case 'pause':
        // gameOverEnt = Array.from(this.queries.gameover.entities)[0]
        if(gameOverEnt) gameOverEnt.destroy()
        this.setupPausePanel(this.score, this.gameTime)
        break

      case 'ingame':       
        if(lobbyEnty) lobbyEnty.destroy()
        if(gameState == 'ingame' && scrollEnty) scrollEnty.destroy()
        // gameOverEnt = Array.from(this.queries.gameover.entities)[0]
        if(gameOverEnt) gameOverEnt.destroy()

        break;

    }
  }

  updateScrollPosition (scrollGroup, camera, config){
    if (!camera) return;
     const { offset, distance } = config;
    
    // Get camera forward (but lock Y)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0; // Lock vertical component
    forward.normalize();
    
    // Get right vector (already horizontal)
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0; // Lock vertical component
    right.normalize();
    
    // Start from camera position
    const pos = camera.position.clone();
    
    // Move forward (horizontally only)
    pos.add(forward.clone().multiplyScalar(distance));
    
    // Apply offsets (use fixed Y offset, not camera's up vector)
    pos.add(right.clone().multiplyScalar(offset.x));
    pos.y += offset.y; // Fixed Y offset instead of camera-relative
    pos.add(forward.clone().multiplyScalar(offset.z));
    
    scrollGroup.position.copy(pos);
    
    // Face camera horizontally only
    const lookTarget = camera.position.clone();
    lookTarget.y = scrollGroup.position.y; // Keep same Y
    scrollGroup.lookAt(lookTarget);
  };

}





