import * as THREE from 'three';
import { createSystem } from '@iwsdk/core';

/**
 * TextOverlaySystem - Works in both desktop and VR
 * Uses canvas textures for VR compatibility
 */
export class TextOverlaySystem extends createSystem({}) {
  
  init() {
    this.overlays = new Map();
    this.isReady = true;
  }
  
  /**
   * Create a canvas-based text mesh
   */
  createTextMesh(text, options = {}) {
    const config = {
      color: options.color || '#ffffff',
      fontSize: options.fontSize || '48px',
      backgroundColor: options.backgroundColor || 'rgba(0,0,0,0.5)',
      padding: options.padding || 20,
      maxWidth: options.maxWidth || 800,
      ...options
    };
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set font first to measure text
    ctx.font = `bold ${config.fontSize} Arial`;
    
    // Measure text (handle multi-line if needed)
    const lines = this.wrapText(ctx, text, config.maxWidth - config.padding * 2);
    const lineHeight = parseInt(config.fontSize) * 1.2;
    
    // Calculate canvas size
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    canvas.width = Math.min(maxLineWidth + config.padding * 2, config.maxWidth);
    canvas.height = lines.length * lineHeight + config.padding * 2;
    
    // Re-set font after canvas resize (canvas reset)
    ctx.font = `bold ${config.fontSize} Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw background
    if (config.backgroundColor !== 'transparent') {
      ctx.fillStyle = config.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
      ctx.fill();
    }
    
    // Draw text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = config.color;
    
    // Draw each line
    lines.forEach((line, i) => {
      const y = config.padding + lineHeight / 2 + i * lineHeight;
      ctx.fillText(line, canvas.width / 2, y);
    });
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Calculate mesh size (scale to world units)
    const aspect = canvas.width / canvas.height;
    const height = 0.3; // Base height in world units
    const width = height * aspect;
    
    // Create mesh
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 999;
    
    return { mesh, canvas, texture };
  }
  
  /**
   * Wrap text to fit within maxWidth
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
  
  /**
   * Show text on screen
   * @param {string} text - Text to display
   * @param {Vector3|Array|string} position - Position or 'camera'
   * @param {Object} options - Configuration options
   *   - offset: {x, y, z} offset from position (for 'camera' mode)
   *   - followCamera: boolean - if true, label follows camera movement
   *   - screenOffset: {x, y} offset in screen space (0-1, where 0.5 is center)
   *   - color: text color (default: '#ffffff')
   *   - fontSize: font size (default: '48px')
   *   - backgroundColor: background color (default: 'rgba(0,0,0,0.5)')
   *   - duration: display duration in ms (default: 1000)
   *   - scale: overall scale multiplier (default: 1.0)
   */
  show(text, position, options = {}) {
    if (!this.isReady) {
      console.error('TextOverlaySystem: Not ready yet!');
      return null;
    }
    
    // Convert position
    let worldPos;
    let isCameraRelative = false;
    
    if (position === 'camera') {
      worldPos = this.getCameraPosition(options.offset, options.screenOffset);
      isCameraRelative = true;
    } else if (Array.isArray(position)) {
      worldPos = new THREE.Vector3(...position);
    } else {
      worldPos = position.clone();
    }
    
    // Default options
    const config = {
      color: options.color || '#ffffff',
      fontSize: options.fontSize || '48px',
      duration: options.duration || 1000,
      followCamera: options.followCamera !== undefined ? options.followCamera : false,
      offset: options.offset || { x: 0, y: 0, z: 0 },
      screenOffset: options.screenOffset || null,
      scale: options.scale || 1.0,
      ...options
    };
    
    // Create text mesh
    const { mesh, canvas, texture } = this.createTextMesh(text, config);
    mesh.position.copy(worldPos);
    
    // Apply scale
    if (config.scale !== 1.0) {
      mesh.scale.multiplyScalar(config.scale);
    }
    
    // Add to scene
    this.world.scene.add(mesh);
    
    // Store it
    const id = Symbol('overlay');
    this.overlays.set(id, {
      mesh,
      canvas,
      texture,
      startTime: performance.now(),
      duration: config.duration,
      followCamera: config.followCamera,
      isCameraRelative,
      offset: config.offset,
      screenOffset: config.screenOffset
    });
    
    return id;
  }
  
  /**
   * Get camera-relative position with optional offsets
   * @param {Object} offset - World space offset {x, y, z}
   * @param {Object} screenOffset - Screen space offset {x, y} (0-1 range)
   */
  getCameraPosition(offset = { x: 0, y: 0, z: 0 }, screenOffset = null) {
    const camera = this.world.camera;
    
    if (!camera) {
      console.warn('TextOverlaySystem: No camera found!');
      return new THREE.Vector3(0, 2, -5);
    }
    
    const distance = 2.0; // Distance in front of camera
    
    // Get camera's forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.normalize();
    
    // Get camera's right and up vectors
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.normalize();
    
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(camera.quaternion);
    up.normalize();
    
    // Start from camera position
    const pos = camera.position.clone();
    
    // Move forward
    pos.add(forward.clone().multiplyScalar(distance));
    
    // Apply world space offset
    pos.add(right.clone().multiplyScalar(offset.x));
    pos.add(up.clone().multiplyScalar(offset.y));
    pos.add(forward.clone().multiplyScalar(offset.z));
    
    // Apply screen space offset if provided
    if (screenOffset) {
      // Screen offset: 0.5, 0.5 is center
      // Convert to -0.5 to 0.5 range (where 0 is center)
      const screenX = (screenOffset.x - 0.5) * 2;
      const screenY = (screenOffset.y - 0.5) * 2;
      
      // Apply screen-relative movement
      pos.add(right.clone().multiplyScalar(screenX * distance * 0.8));
      pos.add(up.clone().multiplyScalar(screenY * distance * 0.8));
    }
    
    return pos;
  }

  /**
   * Create a label attached to an object
   * @param {string} labelText - Text to display
   * @param {Object} bboxDimensions - Bounding box dimensions {x, y, z}
   * @param {Object} options - Same as show() options
   * @returns {Object} {id, mesh} - ID for removal and mesh to parent to object
   */
  labeller(labelText, bboxDimensions, options = {}) {
    if (!this.isReady) {
      console.error('TextOverlaySystem: Not ready yet! LABEL null');
      return null;
    }
    
    const config = {
      color: options.color || '#fa2508ff',
      fontSize: options.fontSize || '32px',
      backgroundColor: options.backgroundColor || 'transparent',
      scale: options.scale || 0.5,
      ...options
    };
    
    // Create text mesh
    const { mesh, canvas, texture } = this.createTextMesh(labelText, config);
    
    // Position RELATIVE to the object (local space)
    // This makes it follow automatically when parented!
    mesh.position.set(0, bboxDimensions.y / 2 + 0.5, 0);
    
    // Apply scale
    if (config.scale !== 1.0) {
      mesh.scale.multiplyScalar(config.scale);
    }
    
    const id = Symbol('overlay');
    this.overlays.set(id, {
      mesh,
      canvas,
      texture,
      startTime: performance.now(),
      duration: Infinity, // Labels don't auto-expire
      isLabel: true
    });
    
    return { id, label: mesh }; // Return 'label' for backwards compatibility
  }
  
  /**
   * Update - update camera-following overlays and remove expired ones
   */
  update(deltaTime) {
    if (!this.isReady) return;
    
    const now = performance.now();
    const camera = this.world.camera;
    
    // Update and remove expired overlays
    for (const [id, overlay] of this.overlays.entries()) {
      const elapsed = now - overlay.startTime;
      
      // Remove expired (but not labels which have Infinity duration)
      if (elapsed >= overlay.duration) {
        this.world.scene.remove(overlay.mesh);
        overlay.mesh.geometry.dispose();
        overlay.mesh.material.dispose();
        overlay.texture.dispose();
        this.overlays.delete(id);
        continue;
      }
      
      // Update camera-following overlays
      if (overlay.followCamera && overlay.isCameraRelative && camera) {
        const newPos = this.getCameraPosition(overlay.offset, overlay.screenOffset);
        overlay.mesh.position.copy(newPos);
      }
      
      // Make mesh always face camera (billboard effect)
      if (camera && !overlay.isLabel) {
        overlay.mesh.quaternion.copy(camera.quaternion);
      }
      
      // For labels, face camera only if not parented (free-floating labels)
      if (camera && overlay.isLabel && !overlay.mesh.parent) {
        overlay.mesh.quaternion.copy(camera.quaternion);
      }
    }
  }
  
  /**
   * Manual remove
   */
  remove(id) {
    const overlay = this.overlays.get(id);
    if (overlay) {
      this.world.scene.remove(overlay.mesh);
      overlay.mesh.geometry.dispose();
      overlay.mesh.material.dispose();
      overlay.texture.dispose();
      this.overlays.delete(id);
    }
  }
  
  /**
   * Clear all
   */
  clear() {
    for (const id of this.overlays.keys()) {
      this.remove(id);
    }
  }
}

/**
 * ============================================================================
 * USAGE EXAMPLES:
 * ============================================================================
 * 
 * const textOverlay = world.getSystem(TextOverlaySystem);
 * 
 * // 1. Simple camera-centered text (disappears after 1 second)
 * textOverlay.show('HELLO WORLD', 'camera');
 * 
 * // 2. Longer duration
 * textOverlay.show('GAME OVER', 'camera', { 
 *   duration: 3000,
 *   fontSize: '64px',
 *   color: '#ff0000'
 * });
 * 
 * // 3. Top-right corner HUD element that follows camera
 * textOverlay.show('SCORE: 100', 'camera', { 
 *   followCamera: true,
 *   screenOffset: { x: 0.85, y: 0.1 },
 *   duration: Infinity // Never expires
 * });
 * 
 * // 4. World-positioned text (fixed in space)
 * textOverlay.show('Pickup Item', [10, 2, -5], {
 *   duration: 5000
 * });
 * 
 * // 5. Floating damage numbers
 * textOverlay.show('+100', enemyPosition, {
 *   color: '#ffff00',
 *   fontSize: '32px',
 *   duration: 1500,
 *   offset: { x: 0, y: 0.5, z: 0 } // Float upward
 * });
 * 
 * // 6. Block label (attach to object)
 * const block = new THREE.Mesh(geometry, material);
 * const bbox = new THREE.Box3().setFromObject(block);
 * const size = bbox.getSize(new THREE.Vector3());
 * 
 * const { id, label } = textOverlay.labeller('Stone Block', size, {
 *   color: '#ffffff',
 *   scale: 0.5
 * });
 * 
 * // Parent the label to the block so it follows automatically
 * block.add(label);
 * 
 * // Remove label later
 * textOverlay.remove(id);
 */

/**
 * ============================================================================
 * POSITIONING GUIDE:
 * ============================================================================
 * 
 * When using position = 'camera':
 * 
 * 1. DISTANCE (in getCameraPosition method):
 *    const distance = 2.0;  // How far in front of camera
 *    - 1.0 = very close (arm's reach)
 *    - 2.0 = comfortable reading distance (default)
 *    - 3.0+ = far away
 * 
 * 2. WORLD SPACE OFFSET (offset option):
 *    offset: { x: 0, y: 0, z: 0 }
 *    - x: negative = left, positive = right
 *    - y: negative = down, positive = up
 *    - z: negative = closer, positive = further
 *    
 *    Example:
 *    offset: { x: 1, y: 0.5, z: 0 }  // Right and up
 * 
 * 3. SCREEN SPACE OFFSET (screenOffset option):
 *    screenOffset: { x: 0.5, y: 0.5 }  // 0.5, 0.5 = center
 *    - x: 0 = left edge, 1 = right edge, 0.5 = center
 *    - y: 0 = top edge, 1 = bottom edge, 0.5 = center
 *    
 *    Common positions:
 *    { x: 0.5, y: 0.1 }   // Top center
 *    { x: 0.85, y: 0.1 }  // Top right
 *    { x: 0.15, y: 0.1 }  // Top left
 *    { x: 0.5, y: 0.9 }   // Bottom center
 * 
 * 4. SCALE (scale option):
 *    scale: 1.0  // Normal size
 *    scale: 0.5  // Half size (good for labels)
 *    scale: 1.5  // 1.5x bigger
 * 
 * 5. For LABELS (labeller method):
 *    - Position is relative to parent object
 *    - Automatically positioned above object based on bboxDimensions
 *    - Adjust by changing the y offset in the labeller method:
 *      mesh.position.set(0, bboxDimensions.y / 2 + 0.5, 0);
 *                                                    ^^^ increase to move higher
 * 
 * EXAMPLES:
 * 
 * // Notification in center, bigger text
 * textOverlay.show('Level Up!', 'camera', {
 *   fontSize: '64px',
 *   scale: 1.2,
 *   duration: 2000
 * });
 * 
 * // Score in top-right
 * textOverlay.show('Score: 1000', 'camera', {
 *   followCamera: true,
 *   screenOffset: { x: 0.85, y: 0.1 },
 *   duration: Infinity
 * });
 * 
 * // Floating damage number
 * textOverlay.show('-50 HP', enemyPos, {
 *   color: '#ff0000',
 *   offset: { x: 0, y: 1, z: 0 },
 *   duration: 1000
 * });
 */