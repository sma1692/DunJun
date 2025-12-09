import * as THREE from 'three';

export const addToArrayLimited = (item, array, maxLen) => {
    const newArray = [item, ...array];
    if (newArray.length > maxLen) {
        newArray.pop();
    }

    return newArray;
}

export const getRandomElement = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
}

export const isEmptyObj = (obj) => { return Object.keys(obj).length === 0 }
export const isEmptyArray = (array) => { return array.length === 0 }

export const getHandSymbolAccess = (obj) => {
    const symbols = Object.getOwnPropertySymbols(obj);

    symbols.forEach(symb=>{
        console.log('SYMOBJ ==>>> ',symb, "-- ",obj[symb])
    })

    const xrSpaceSymbol = symbols.find(sym => sym.description === '@iwer/xr-space');
    const xrJointSymbol = symbols.find(sym => sym.description === '@iwer/xr-joint-space');
    let returnable = {}
    if (xrSpaceSymbol) {
        const spaceData = obj[xrSpaceSymbol];
        returnable.offsetMatrix = spaceData.offsetMatrix
    }

    if (xrJointSymbol) {
        const jointData = obj[xrJointSymbol];
        returnable.jointName = jointData.jointName
        returnable.radius = jointData.radius
    }
    return returnable
}


export class HandBoundingBoxHelper {
  constructor(world) {
    this.world = world;
    
    // Create helpers for each hand
    this.leftHandBox = null;
    this.rightHandBox = null;
    
    // Create line materials for the bounding boxes
    this.leftBoxHelper = null;
    this.rightBoxHelper = null;
  }

  createBoxHelper(color = 0xff0000) {
    // Create a wireframe box geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: color });
    const boxHelper = new THREE.LineSegments(edges, material);
    
    this.world.scene.add(boxHelper);
    return boxHelper;
  }

  updateHandBoundingBox(handedness, phalangesPositions, joints) {
    // Get all joint positions for this hand
    const positions = [];
    
    for (let i = 0; i < joints.length; i++) {
      const joint = joints[i];
      const poseArray = phalangesPositions[handedness][joint];
      
      if (poseArray && poseArray.length > 0) {
        const pose = poseArray[0]; // Get the most recent pose
        const pos = pose.transform.position;
        positions.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
    }

    if (positions.length === 0) return;

    // Calculate bounding box from all positions
    const box = new THREE.Box3();
    box.setFromPoints(positions);

    // Get box center and size
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Create or update the box helper
    const boxHelperKey = `${handedness}BoxHelper`;
    
    if (!this[boxHelperKey]) {
      const color = handedness === 'left' ? 0x00ff00 : 0xff0000;
      this[boxHelperKey] = this.createBoxHelper(color);
    }

    // Update position and scale
    this[boxHelperKey].position.copy(center);
    this[boxHelperKey].scale.copy(size);
    this[boxHelperKey].visible = true;
  }

  hide(handedness) {
    const boxHelperKey = `${handedness}BoxHelper`;
    if (this[boxHelperKey]) {
      this[boxHelperKey].visible = false;
    }
  }

  destroy() {
    if (this.leftBoxHelper) {
      this.world.scene.remove(this.leftBoxHelper);
      this.leftBoxHelper.geometry.dispose();
      this.leftBoxHelper.material.dispose();
    }
    if (this.rightBoxHelper) {
      this.world.scene.remove(this.rightBoxHelper);
      this.rightBoxHelper.geometry.dispose();
      this.rightBoxHelper.material.dispose();
    }
  }
}


// export const 

// this.phalangesPositions = {
//       left: {},
//       right: {}
//     }

export const getVerticesFromYoloAnnotation = (annotation) => {
  // annotation decribed in GLobal.constants
  // returns vertices in clockwise starting from top left 

  const [width, height] = annotation[0]
  const [_x, _y, _z] = annotation[1] //mid point coords
  const vertices = [ 
    [_x - width/2 , _y + height/2, _z],
    [_x + width/2 , _y + height/2, _z],
    [_x + width/2 , _y - height/2, _z],
    [_x - width/2 , _y - height/2, _z],
   ]
   return vertices

}

export const  findFirstMatch = (handSigns, allowedSigns) => {
    for (let sign of handSigns) {
        if (allowedSigns.includes(sign)) {
            return sign; // Return the first matched item, todo share index for which hand
        }
    }
    return null; // Return null if no match is found
}


export const formatTime = (milliseconds) => {
    // Convert milliseconds to seconds
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    // Calculate remaining seconds, minutes, and hours
    seconds = seconds % 60;
    minutes = minutes % 60;

    // Build the output string
    let parts = [];
    if (hours > 0) {
        parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} min`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds} sec${seconds !== 1 ? 's' : ''}`);
    }

    // Join the parts with spaces
    return parts.join(' ');
}

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function getVectorMagnitude(vector) {
  return Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1] + vector[2]*vector[2]);
}