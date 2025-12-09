import {
  Types, AssetManager,
  createSystem,
  Entity, Mesh, createComponent,
  VisibilityState
} from '@iwsdk/core';

import { GlobalComponent, Constants, getAllGlobalValues } from './global';

import * as THREE from 'three';
import {   findFirstMatch, addToArrayLimited, isEmptyObj,
  isEmptyArray
 } from './helpers';

 import { debugSources, analyzeObject, getCompleteObjectInfo
  } from './debugger';
import { GameAudioSystem } from './audio';


import { VRLogger } from './utils/metrics';
import { TextOverlaySystem } from './overlay';


// ============================================================================
// COMPONENTS
// ============================================================================
export const GestureComponent = createComponent('GestureComponent', {
  left: { type: Types.String, default: 'open' },
  right: { type: Types.String, default: 'open' },
  leftLong: { type: Types.String, default: 'none' },   // long gestures 
  rightLong: { type: Types.String, default: 'none' }, // long gestures 
  leftPos: { type: Types.Vec3, default: [0,0,0] },
  rightPos: { type: Types.Vec3, default: [0,0,0] },
  leftVel: { type: Types.Vec3, default: [0,0,0] },
  rightVel: { type: Types.Vec3, default: [0,0,0] },
  // mass: { type: Types.Vec3, default: [0,0,0] },

});


export class GestureSystem extends createSystem({
    gesture: { required: [GestureComponent] }
}) {
  init() {
    this.audioSystem = this.world.getSystem(GameAudioSystem)

    
    const gestureEntity = this.world.createEntity();
    gestureEntity.addComponent(GestureComponent, {
        left: 'idle',
        right: 'idle'
    });
    gestureEntity.name = 'GestureTracker';
    this.logger = new VRLogger(this.world.camera)
    this.frame = null;
    this.referenceSpace = null;
    this.velocityThreshold = 2.0
    this.phalangesPositions = {
      // maintains history of offsetmatrix of the phalanges
      left: {},
      right: {}
    }
    
    this.gestureStates = {
      left: 'UNK',
      right: 'UNK'
    }
    this.vis_state = 0 // non vr
    this.handsActive = false
    
    this._joints = Constants.PHALANGES
    this.thresholds = Constants.THRESHOLDS

    this.world.visibilityState.subscribe((visibilityState) => {
        if (visibilityState === VisibilityState.NonImmersive) {
          this.vis_state = 0
        } else {
          this.vis_state = 1
          this.world.session.addEventListener('inputsourceschange', (event) => {
            // console.log('Input changed');
            event.session.inputSources.forEach((source, index) => {
              if (source.hand) {
                
              }
              else{
                console.log('code to manage controller')
              }
            });
          });            
        }

      });
     
  }
  
  detectHandSign(source){
    let wrist = this.phalangesPositions[source.handedness]['wrist'][0]
    let thumbTip = this.phalangesPositions[source.handedness]['thumb-tip'][0]
    let indexTip = this.phalangesPositions[source.handedness]['index-finger-tip'][0]
    let middleTip = this.phalangesPositions[source.handedness]['middle-finger-tip'][0]
    let ringTip = this.phalangesPositions[source.handedness]['ring-finger-tip'][0]
    let pinkyTip = this.phalangesPositions[source.handedness]['pinky-finger-tip'][0]

    

    let thumbDist = this.distanceBetweenPhalanges(wrist, thumbTip)
    let indexDist = this.distanceBetweenPhalanges(wrist, indexTip)
    let middleDist = this.distanceBetweenPhalanges(wrist, middleTip)
    let ringDist = this.distanceBetweenPhalanges(wrist, ringTip)
    let pinkyDist = this.distanceBetweenPhalanges(wrist, pinkyTip)

    let thumbOpen = thumbDist > this.thresholds.THUMBOPEN
    let indexOpen = indexDist > this.thresholds.FINGEROPEN
    let middleOpen = middleDist > this.thresholds.FINGEROPEN
    let ringOpen = ringDist > this.thresholds.FINGEROPEN
    let pinkyOpen = pinkyDist > this.thresholds.FINGEROPEN

    let signage = 'unknown'
    if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
        signage = 'telephone';
    }

    if (thumbOpen && indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
        signage = 'rock-horns';
    }

    if (!thumbOpen && !indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
        signage = 'birdie-1';
    }

    if (thumbOpen && !indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
        signage = 'birdie-2';
    }

    if (!thumbOpen && !indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
        signage = 'pinkie-out';
    }

    // Fist: All Closed
    if ( !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        signage = 'fist';
    }


    if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
        signage = 'open';
        const direction = this.genericDirection(source, 'wrist','middle-finger-tip')
        if (direction == 'up') signage = 'thehro'
        if (direction == 'down') signage = 'niche'
    }
    
    if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        signage = 'poke';
    }

    if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        if (this.isThumbReallyOut(source)){
          signage = 'thumb';
          const direction = this.genericDirection(
            source, 'thumb-metacarpal', 'thumb-tip'
            )
            if (direction == 'up') signage = 'thumbsup'
            if (direction == 'down') signage = 'thumbsdown'
          
        }
        
    }
    
    return signage
  }

  genericDirection(source, from, to){
    //generic direction getter
    const toPhalange = this.phalangesPositions[source.handedness][to][0]
    const fromPhalange = this.phalangesPositions[source.handedness][from][0]
    const toPos = toPhalange.transform.position
    const fromPos = fromPhalange.transform.position
    const fromToDirection = new THREE.Vector3()
      .subVectors(toPos, fromPos) // gives direction from wrist to middletip
      .normalize()
    let direction = null
    
    
    if(fromToDirection.y > 0.72) direction = 'up'
    else if(fromToDirection.y < -0.72) direction = 'down'
    else if(fromToDirection.x > 0.72) direction = 'left'
    else if(fromToDirection.x < -0.72) direction = 'right'
    return direction
  }

  isThumbReallyOut(source){
    let thumbTip = this.phalangesPositions[source.handedness]['thumb-tip'][0]
    let indexInter = this.phalangesPositions[source.handedness]['index-finger-phalanx-intermediate'][0]
    let middleInter = this.phalangesPositions[source.handedness]['middle-finger-phalanx-intermediate'][0]
    let ringInter = this.phalangesPositions[source.handedness]['ring-finger-phalanx-intermediate'][0]
    let pinkyInter = this.phalangesPositions[source.handedness]['pinky-finger-phalanx-intermediate'][0]

    const thresholdDist = this.distanceBetweenPhalanges(pinkyInter, indexInter)
    const thumbDist = this.distanceBetweenPhalanges(thumbTip, middleInter)
    return thumbDist > thresholdDist
  }

  checkFrame(){
    let retVal = {frame: null, referenceSpace: null }
    const xrManager = this.world.renderer.xr;
    if (!xrManager.isPresenting) return retVal; // if we are in an XRsession
    const session = xrManager.getSession();
    if (!session) return retVal;
    const referenceSpace = xrManager.getReferenceSpace();
    const frame = xrManager.getFrame();
    return {frame, referenceSpace}
  }

  historian(source){
    /*
        source - Input source
        returns - { left: { wrist: [ <array of pose> ] } }
        pose as received by frame.getPose
    */ 
    const { frame, referenceSpace } = this.checkFrame()
    let haath = source.hand 
    let lengthDebugger = {}
    const _hand = source.handedness; // 'left' or 'right'
    for(let i=0;i<this._joints.length; i++){
      let _joint = this._joints[i]
      let phalange = haath.get(_joint)
      let pose = frame.getPose(phalange, referenceSpace);
      let position = pose.transform.position;
      let orientation = pose.transform.orientation;
      let offsetMatrix = pose.transform.matrix
      let jointPose = frame.getJointPose(phalange, referenceSpace);
      if(!this.phalangesPositions[_hand][_joint]){
        this.phalangesPositions[_hand][_joint] = [pose]
      }
      else{
        this.phalangesPositions[_hand][_joint] = addToArrayLimited(
          pose, 
          this.phalangesPositions[_hand][_joint],
          Constants.POS_HISTORY_COUNT
        )   
      }
      lengthDebugger[_joint] = this.phalangesPositions[_hand][_joint].length
    }
  }

  detectHighSpeedGesture(source, delta) {
      
      let handedness = source.handedness
      let _state = this.gestureStates[handedness]
      let motionSpeed, velocityVector
      const history = this.phalangesPositions[handedness]['ring-finger-tip']
      
      // We need at least 2 frames of history to calculate speed
      if (!history || history.length < 2) 
        return {motionSpeed: 0, velocityVector:new THREE.Vector3()}

      const currentJoint = history[0]; // Newest
      const pastJoint = history[1]; // Oldest

      // Calculate distance moved
      const distance = this.distanceBetweenPhalanges(currentJoint, pastJoint)

      // Calculate speed (Distance / Time)
      motionSpeed = distance / delta;
      const currentPos = currentJoint.transform.position
      const prevPos = pastJoint.transform.position
      // Thresholds (You may need to tweak these numbers based on testing)
      const PUNCH_THRESHOLD = 2.0; // meters per second
      const SLAP_THRESHOLD = 4.0;  // usually faster/snappier than a punch

      // 1. Check for Punch (General High Velocity)
      // For better accuracy, you would check if the movement is "forward" relative to the camera
      // if (speed > PUNCH_THRESHOLD) {
          
      //     // Determine direction to distinguish punch vs slap
      //     // A simple heuristic: Punch is movement along Z (forward/back), Slap is along X (side)
      //     // Note: This assumes World Space. Ideally, you compare against the Headset orientation.
          
      velocityVector = new THREE.Vector3().subVectors(currentPos, prevPos);
          
      //     // Normalize to check dominance
      //     velocityVector.normalize(); 

      //     // Check if movement is mostly horizontal (Slap) or Forward (Punch)
      //     // This is a simplified check. 
      //     // if (Math.abs(velocityVector.x) > Math.abs(velocityVector.z)) {
      //     //     this.triggerGesture(handedness, 'slap', speed);
      //     // } else {
      //     //     this.triggerGesture(handedness, 'punch', speed);
      //     // }
      // }
      return { motionSpeed, velocityVector } 
    }

  distanceBetweenPhalanges(pose1, pose2){
    let p1 = pose1.transform.position
    let p2 = pose2.transform.position
    const distance = new THREE.Vector3(p1.x, p1.y, p1.z)
    .distanceTo(new THREE.Vector3(p2.x, p2.y, p2.z))
    return distance
  }

  update(delta, time) {
    if(this.world.visibilityState.value == 'non-immersive') return;
    if (this.vis_state == 1){
      const {frame, referenceSpace} = this.checkFrame()
      this.world.session.inputSources.forEach((source, index) => {
      if (source.hand) {
      ///////////////////////////////  
        if (!frame) return;
        this.historian(source)
        let handedness = source.handedness
        let wrist = this.phalangesPositions[handedness]['wrist'][0]
        let indexTip = this.phalangesPositions[handedness]['index-finger-tip'][0]
        const wristPos = wrist.transform.position
        let handSign = this.detectHandSign(source)
        let { motionSpeed, velocityVector }  = this.detectHighSpeedGesture(source,delta)
        let _state
        let slapCondition = ['open', 'thehro'].includes(handSign) && motionSpeed > Constants.THRESHOLDS.SLAP_SPEED
        let punchCondition = handSign == 'fist' && motionSpeed > Constants.THRESHOLDS.PUNCH_SPEED
        if(punchCondition) _state = 'punch'
        else if(slapCondition) _state = 'slap'
        else _state = handSign


        const _gesture = Array.from(this.queries.gesture.entities)[0];
        _gesture.setValue(GestureComponent, handedness, _state)
        
        const handPos = _gesture.getVectorView(GestureComponent, `${handedness}Pos`);
        handPos.set([wristPos.x, wristPos.y, wristPos.z]);

        const handVel = _gesture.getVectorView(GestureComponent, `${handedness}Vel`);
        handVel.set([velocityVector.x, velocityVector.y, velocityVector.z]);

                    
        }
        
        });
      }   
    }
}
