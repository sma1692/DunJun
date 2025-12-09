
import { AmbientLight, DirectionalLight, AssetManager, SpotLight } from '@iwsdk/core';
import { MeshStandardMaterial, PanelUI, Interactable, ScreenSpace,
    SRGBColorSpace, Mesh, PlaneGeometry, MeshBasicMaterial, createComponent
 } from '@iwsdk/core';

import { PhysicsShapeType, PhysicsShape, PhysicsBody, 
    PhysicsState, Types, GridHelper } from '@iwsdk/core';
import { Constants } from './global';
import { formatTime, getVerticesFromYoloAnnotation } from './helpers';
import * as THREE from 'three';
import { analyzeObject } from './debugger';


// ============================================================================
// COMPONENTS KhOTA
// ============================================================================


export const scrollComponent = createComponent('scrollComponent', {});
export const outsideComponent = createComponent('outsideComponent', {});
export const lobbyTextureComponent = createComponent('lobbyTextureComponent', {});
export const gameOverTexComponent = createComponent('gameOverTexComponent', {
  triggered: { type: Types.Boolean, default: false }, // to pklay sound, and unpause frommenu
});
export const PauseTexComponent = createComponent('PauseTexComponent', {});
export const tutorialComponent = createComponent('tutorialComponent', {
  prev: { type: Types.String, default: 'lobby1' }, // previous screen
  current: { type: Types.String, default: 'lobby1' }, // after screen
  after: { type: Types.String, default: 'lobby1' }, // after screen
});



function createFogWall(width, height, depth, segments, threshold) {
  const fogGroup = new THREE.Group();
  
  for (let i = 0; i < segments; i++) {
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xeeeeee,
      // color: '#5615B9',

      
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = threshold + (i / segments) * depth;
    fogGroup.add(plane);
  }
  
  return fogGroup;
}



export const setupScene = (world) => {
    const { camera, scene, renderer} = world

    camera.position.set(-4, 1.5, -6);
    camera.rotateY(-Math.PI * 0.85);

    const panelEntity = world
        .createTransformEntity()
        .addComponent(PanelUI, {
          config: '/ui/welcome.json',
          maxHeight: 0.5,
          maxWidth: 0.8
        })
        .addComponent(Interactable)
        .addComponent(ScreenSpace, {
        top: '407px',
        left: '540px',
        height: '10%'
        });
    // panelEntity.object3D.position.set(-1.5, 1.2, -1.1);
    
    //////////////////////////////////
    //////////////// Fogging
    /////////////////////////////
    const [ width, height, depth ] = Constants.FOG_WALL 
    const fogWall = createFogWall(width, height, depth, 8, depth + 3);
    fogWall.position.set(0, 0, depth);
    scene.add(fogWall);
    

    const { scene: envMesh } = AssetManager.getGLTF('env2');
    envMesh.rotateY(Math.PI*0.5);
    envMesh.scale.set(1.8, 1.8, 1.8);
    envMesh.position.set(-4,0,0);
    const envEntity = world.createTransformEntity(envMesh)

    const floor = new Mesh(
      new PlaneGeometry(20000, 20000), 
      // new BoxGeometry(20000,2, 20000), 
      new MeshBasicMaterial({ 
        // color: 0x808080,
        transparent: true,
        opacity: 0

       }) // Added color for visibility
      );
      floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
      floor.position.set(0, 0.5, 0);
      scene.add(floor);
  
      const floorEntity = world.createTransformEntity(floor);
      floorEntity.name = 'Zameen'
      floorEntity.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Auto,
      restitution: 1.0,
      });
      floorEntity.addComponent(PhysicsBody, {
      state: PhysicsState.Static,
      });

    
    // envEntity.addComponent(PhysicsBody, {
    //   state: PhysicsState.Static, // Won't move
    //   mass: 0 // Static bodies should have 0 mass
    // });
    
    // .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

    
    // const gridHelper = new GridHelper(20, 20, 0x00ff00, 0x0044ff);
    // world.scene.add(gridHelper);
  
}







export const createDynamicComposite = (world, textureName, 
  textElements=[], components=[], dimsNPos=null) => {
  /* Generic function to create dynamic composites 
  Base image png, with overlaid text through array of textElements
  components : list of custom components to attach to the composite  
  [[ <componentObj> , <jsonforcomponent>], [ <componentObj1> , <jsonfocomponent1>]]
   dimsNPos: dimensions of the composite and position ,hardcoded for now
  */
  
  
  const _dimensions = !dimsNPos || (dimsNPos && !dimsNPos.dimensions) ?
    Constants.TEXTURE.DIMENSIONS: dimsNPos.dimensions
  const _position = !dimsNPos || (dimsNPos && !dimsNPos.position) ?
    Constants.TEXTURE.POSITION :  dimsNPos.position
  
  
  const baseTexture = AssetManager.getTexture(textureName);
  baseTexture.colorSpace = SRGBColorSpace;
  const compositeTexture = createTexturedBanner(baseTexture, textElements)
  const finalBanner = new Mesh(
    new PlaneGeometry(..._dimensions),
    new MeshBasicMaterial({
      map: compositeTexture,
      // map: gameOverTexture,
      transparent: true,
      side: THREE.DoubleSide
    }),
  );
  const compositeEntity = world.createTransformEntity(finalBanner);
  components.forEach(compItem=>{
    // console.log('entity compen1 ', compItem)
    compositeEntity.addComponent(compItem[0], compItem[1])
  })
  
  finalBanner.position.set(..._position);
  return {finalBanner, compositeEntity}
}

export const createDynamicCompositeComps = ( textureName, 
  textElements=[], dimsNPos=null) => {
  /* Generic function to create dynamic composites components only
  Base image png, with overlaid text through array of textElements
  components : list of custom components to attach to the composite  
   dimsNPos: dimensions of the composite and position ,hardcoded for now
  */
  
  const _dimensions = !dimsNPos || (dimsNPos && !dimsNPos.dimensions) ?
    Constants.TEXTURE.DIMENSIONS: dimsNPos.dimensions
  const _position = !dimsNPos || (dimsNPos && !dimsNPos.position) ?
    Constants.TEXTURE.POSITION :  dimsNPos.position
  
  
  const baseTexture = AssetManager.getTexture(textureName);
  baseTexture.colorSpace = SRGBColorSpace;
  const compositeTexture = createTexturedBanner(baseTexture, textElements)
  const finalBanner = new Mesh(
    new PlaneGeometry(..._dimensions),
    new MeshBasicMaterial({
      map: compositeTexture,
      transparent: true,
      side: THREE.DoubleSide
    }),
  );
  
  finalBanner.position.set(..._position);
  return finalBanner 
}

export function createTexturedBanner(baseTexture, textElements) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Draw the base texture (lobby image)
  const img = baseTexture.image;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Draw each text element
  textElements.forEach(element => {
    const {
      text,
      x = 0.5,              // Position as percentage (0 to 1)
      y = 0.5,              // Position as percentage (0 to 1)
      fontSize = 60,
      fontFamily = 'Arial',
      fontWeight = 'bold',
      color = 'white',
      align = 'center',     // 'left', 'center', 'right'
      baseline = 'middle',  // 'top', 'middle', 'bottom'
      strokeColor = 'black',
      strokeWidth = 4,
      shadowColor = null,
      shadowBlur = 0,
      rotation = 0          // Rotation in radians
    } = element;
    
    // Convert percentage to pixels
    const pixelX = x * canvas.width;
    const pixelY = y * canvas.height;
    
    // Save context state
    ctx.save();
    
    // Apply rotation if specified
    if (rotation !== 0) {
      ctx.translate(pixelX, pixelY);
      ctx.rotate(rotation);
      ctx.translate(-pixelX, -pixelY);
    }
    
    // Set text properties
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = color;
    
    // Add shadow if specified
    if (shadowColor) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
    }
    
    // Draw text outline first (if specified)
    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(text, pixelX, pixelY);
    }
    // console.log('TEXRT ', text)
    // Draw text fill
    ctx.fillText(text, pixelX, pixelY);
    
    // Restore context state
    ctx.restore();
  });
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return texture;
}

// Usage Examples:

// // Example 1: Simple centered text
// const combinedTexture1 = createTexturedBanner(lobbyTexture, [
//   { text: 'Welcome!', x: 0.5, y: 0.5 }
// ]);

// // Example 2: Multiple text elements with different positions
// const combinedTexture2 = createTexturedBanner(lobbyTexture, [
  // { 
  //   text: 'LOBBY', 
  //   x: 0.5, 
  //   y: 0.2, 
  //   fontSize: 80,
  //   align: 'center'
  // },
  // { 
  //   text: 'Welcome Players', 
  //   x: 0.5, 
  //   y: 0.5, 
  //   fontSize: 50,
  //   color: 'yellow'
  // },
//   { 
//     text: 'Press Start', 
//     x: 0.5, 
//     y: 0.8, 
//     fontSize: 40,
//     color: '#00ff00'
//   }
// ]);

// // Example 3: Left and right aligned text
// const combinedTexture3 = createTexturedBanner(lobbyTexture, [
//   { 
//     text: 'Player: John', 
//     x: 0.1,        // 10% from left
//     y: 0.1,        // 10% from top
//     align: 'left',
//     baseline: 'top',
//     fontSize: 40
//   },
//   { 
//     text: 'Score: 1000', 
//     x: 0.9,        // 90% from left (near right edge)
//     y: 0.1, 
//     align: 'right',
//     baseline: 'top',
//     fontSize: 40
//   },
//   {
//     text: 'Level 5',
//     x: 0.5,
//     y: 0.5,
//     fontSize: 70,
//     color: 'gold',
//     strokeWidth: 6,
//     strokeColor: 'darkred'
//   }
// ]);

// // Example 4: With shadows and custom styling
// const combinedTexture4 = createTexturedBanner(lobbyTexture, [
//   { 
//     text: 'EPIC TITLE', 
//     x: 0.5, 
//     y: 0.3,
//     fontSize: 90,
//     fontFamily: 'Impact',
//     color: '#ff0000',
//     strokeColor: 'black',
//     strokeWidth: 8,
//     shadowColor: 'rgba(0, 0, 0, 0.8)',
//     shadowBlur: 20
//   },
//   { 
//     text: 'Subtitle here', 
//     x: 0.5, 
//     y: 0.6,
//     fontSize: 40,
//     fontWeight: 'normal',
//     color: 'white',
//     strokeWidth: 2
//   }
// ]);

// // Example 5: Rotated text
// const combinedTexture5 = createTexturedBanner(lobbyTexture, [
//   { 
//     text: 'BETA', 
//     x: 0.9, 
//     y: 0.1,
//     fontSize: 50,
//     color: 'red',
//     rotation: -Math.PI / 6  // -30 degrees
//   }
// ]);

// // Apply to your mesh
// const logoBanner = new Mesh(
//   new PlaneGeometry(3.39, 0.96),
//   new MeshBasicMaterial({
//     map: combinedTexture2,  // Use any of the examples above
//     transparent: true
//   })
// );
// world.createTransformEntity(logoBanner);
// logoBanner.position.set(0, 1.5, -9);