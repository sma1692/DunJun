import {
  Types,
  createComponent,
  createSystem,
  VisibilityState
} from '@iwsdk/core';
import * as THREE from 'three';
import { Constants } from './global';
import {
    PhysicsBody,  PhysicsShape,
  PhysicsState,  PhysicsShapeType
} from '@iwsdk/core';

import { GlobalComponent, getAllGlobalValues } from './global';
// ============================================================================
// COMPONENTS
// ============================================================================

export const PhysicsHand = createComponent('PhysicsHand', {
  handedness: { type: Types.String, default: 'left' },
  positionStrength: { type: Types.Float32, default: 20.0 },
  rotationStrength: { type: Types.Float32, default: 30.0 },
  mass: { type: Types.Float32, default: 1.5 }
});


// ============================================================================
// PHYSICS HAND SYSTEM
// ============================================================================

export class PhysicsHandSystem extends createSystem({
  physicsHands: { required: [PhysicsHand] },
  global: { required: [GlobalComponent]},
}) {
  init() {
    
    this.vis_state = 0;
    this.handsActive = false;
    
    // Store hand entities
    this.leftHandEntity = null;
    this.rightHandEntity = null;
    
    // Track hand joint positions
    this.phalangesPositions = {
      left: {},
      right: {}
    };
    
    this._joints = Constants.PHALANGES || [
      'wrist',
      'thumb-tip',
      'index-finger-tip',
      'middle-finger-tip',
      'ring-finger-tip',
      'pinky-finger-tip'
    ];

    // Listen for VR mode
    this.world.visibilityState.subscribe((visibilityState) => {
      if (visibilityState !== VisibilityState.NonImmersive) {
        this.vis_state = 1;
        this.createPhysicsHands();
      }
    });
  }

  createPhysicsHands() {
    this.leftHandEntity = this.createPhysicsHandEntity('left');
    this.rightHandEntity = this.createPhysicsHandEntity('right');
  }

  checkFrame() {
    let retVal = { frame: null, referenceSpace: null };
    const xrManager = this.world.renderer.xr;
    if (!xrManager.isPresenting) return retVal;
    const session = xrManager.getSession();
    if (!session) return retVal;
    const referenceSpace = xrManager.getReferenceSpace();
    const frame = xrManager.getFrame();
    return { frame, referenceSpace };
  }

  updateHandTracking(source, frame, referenceSpace) {
    const handedness = source.handedness;
    const haath = source.hand;
    
    // Update phalanges positions
    for (let i = 0; i < this._joints.length; i++) {
      const joint = this._joints[i];
      const phalange = haath.get(joint);
      
      if (phalange) {
        const pose = frame.getPose(phalange, referenceSpace);
        
        if (!this.phalangesPositions[handedness][joint]) {
          this.phalangesPositions[handedness][joint] = [];
        }
        
        this.phalangesPositions[handedness][joint][0] = pose;
      }
    }
  }


  createPhysicsHandEntity(handedness) {
  const geometry = new THREE.SphereGeometry(0.05, 2,2);
  const material = new THREE.MeshStandardMaterial({
    color: handedness === 'left' ? 0x00ff00 : 0xff0000,
    transparent: true,
    opacity: 0.0,
    wireframe: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  
  const entity = this.world.createTransformEntity(mesh);
  // entity.name = `${handedness}_hand`
  entity.name = `${handedness}`
  entity.addComponent(PhysicsHand, {
    handedness: handedness,
    positionStrength: 20.0,
    rotationStrength: 30.0,
  });
  
  
  
  entity.addComponent(PhysicsShape, {
    shape: PhysicsShapeType.Sphere,
    radius: 0.05
  });

  entity.addComponent(PhysicsBody, {
    state: PhysicsState.Kinematic, 
  });
  
  return entity;
}

applyPhysicsToHand(entity, handedness, delta) {
  const mesh = entity.object3D;
  
  // Get hand tracking position
  const sphereCenter = this.phalangesPositions[handedness]?.['index-finger-phalanx-proximal']?.[0];
  if (!sphereCenter) return;
  
  const targetPos = sphereCenter.transform.position;
  const targetRot = sphereCenter.transform.orientation;
  mesh.position.set(targetPos.x, targetPos.y, targetPos.z);
  mesh.quaternion.set(targetRot.x, targetRot.y, targetRot.z, targetRot.w);
}


  update(delta) {
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    const { score, pauseTime, gameState, ignisMeter } = 
              getAllGlobalValues(this.globalEnty)
    if(gameState !== 'ingame') return
    if (this.vis_state !== 1) return;
    
    const { frame, referenceSpace } = this.checkFrame();
    if (!frame) return;
    
    this.world.session.inputSources.forEach((source) => {
      if (source.hand) {
        this.updateHandTracking(source, frame, referenceSpace);
        
        const handEntity = source.handedness === 'left' 
          ? this.leftHandEntity 
          : this.rightHandEntity;
        
        if (handEntity) {
          this.applyPhysicsToHand(handEntity, source.handedness, delta);
        }
      }
    });
  }
}

