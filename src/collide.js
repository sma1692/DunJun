import {
  createSystem,
  PhysicsState, PhysicsManipulation,
  PhysicsBody,  PhysicsShape
} from '@iwsdk/core';

import * as THREE from 'three';

import { Constants, GlobalComponent, getAllGlobalValues } from './global';
import { Floaters, canCollide } from './blocks';
import { PhysicsHand } from './physicsHands';
import { GestureComponent } from './gestures';

import { VRLogger } from './utils/metrics';


export class UniversalCollisionDetectionSystem extends createSystem({
    bodies: { required: [Floaters] },
    hands: { required: [PhysicsHand] },
    gesture: { required: [GestureComponent]},
    global: { required: [GlobalComponent]}
}){
  init(){
    this.currentTime = performance.now()
    this.logger = new VRLogger(this.world.camera)

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.world.scene.add(ambient);
    // Configure renderer
    this.world.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.world.renderer.toneMappingExposure = 0.8;
    this.world.renderer.physicallyCorrectLights = true;
    // this.world.renderer.toneMappingExposure = 0.2

  }
  
  isActiveCollision(block, hand, handGesture){
    const saareCollisions = block.collisionTracker
    const handName = hand.name
    if (saareCollisions.length == 0) return false
    for(let i=0; i<saareCollisions.length; i++){
        let collider = saareCollisions[i]
        if (collider.collidingEntity.name != handName) continue
        // debugger

        if(collider.collidingEntity.gesture == handGesture){
            if(this.isTimeOutCollision(collider.collisionTime)){
              // debugger
              return true
            }
            else{
                return false
            }
        }
        else return false
    }
    return false
  }

  isTimeOutCollision(collisionTime){
    return this.currentTime - collisionTime <= Constants.COLLISION_DURATION
  }

  removeTimeOutCollision(entity){

  }

  estimateRadius(entity, cons=false) {

    // Try to get radius from the mesh geometry
    const _mesh = entity.object3D;
    const { radius } = _mesh.userData
    if (_mesh && _mesh.geometry) {
      const geometry = _mesh.geometry;
      if (!geometry.boundingSphere) {
        geometry.computeBoundingSphere();
      }
      
      if (geometry.boundingSphere) {
        return geometry.boundingSphere.radius;
      }
    }
    if (radius) return radius
    return Constants.THRESHOLDS.RADIUS
  }
 
  update(delta) {
    this.currentTime = performance.now()
    const globalEnty = Array.from(this.queries.global.entities)[0]
    const {  gameState, health, gameStartTime, ignisMeter } = 
              getAllGlobalValues(globalEnty)
    
    if(gameState !== 'ingame') return;
    if(gameState == 'pause') return;

    const entities = Array.from(this.queries.bodies.entities);
    const hands = Array.from(this.queries.hands.entities);

    if(hands.length == 0) return;
    
    for (let i = 0; i < entities.length; i++) {
      // FETCHING VALUES FOR CURRENT ITERATING ENTITY

      const blockEntity = entities[i];
      // guardclauses
      if (!blockEntity.getValue(Floaters, 'isVisible')) continue
      if (!blockEntity.object3D) continue;
      if (!blockEntity.hasComponent(canCollide)) continue;
      // check new component canCollide

      const blockName = blockEntity.name
      const stateA = blockEntity.getValue(PhysicsBody, 'state');
      
      const positionA = new THREE.Vector3();
      blockEntity.object3D.getWorldPosition(positionA);
      
      if (!blockEntity.collisionTracker) blockEntity.collisionTracker = []
      for (let j = 0; j < hands.length; j++) {
        
        const hand = hands[j];
        const handName = hand.name
        const stateB = hand.getValue(PhysicsBody, 'state');
        
        if (!hand.object3D) continue;
        const positionB = new THREE.Vector3();
        hand.object3D.getWorldPosition(positionB);      
        const distance = positionA.distanceTo(positionB);
        const radiusA = this.estimateRadius(blockEntity);
        const radiusB = this.estimateRadius(hand);
        
        if (distance < (radiusA + radiusB)) {
          // Check if this is a NEW collision
          const _gesture = Array.from(this.queries.gesture.entities)[0];
          const handGesture = _gesture.getValue(GestureComponent, handName)
          if (!this.isActiveCollision(blockEntity, hand, handGesture)) {
            // only one GestureComponent in the world
            blockEntity.collisionTracker.push({
                collisionTime: this.currentTime,
                blockState:{
                    velocity: blockEntity.getVectorView(PhysicsManipulation, 'linearVelocity')
                },
                collidingEntity: {
                    name: handName,
                    velocity: _gesture.getVectorView(
                        GestureComponent, `${handName}Vel`
                    ),
                    gesture: handGesture, 
                    mass: hand.getValue(PhysicsHand, 'mass')
                }
            })
          }
        }
      }
      

    }
  }
}
