import * as THREE from 'three';
import { createSystem } from "@iwsdk/core";
import { GlobalComponent, Constants } from './global';

export class HUDSystem extends createSystem({
  global: { required: [GlobalComponent] },
}) {
  
  init() {
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    this.health = this.globalEnty.getValue(GlobalComponent, 'health');
    this.score = this.globalEnty.getValue(GlobalComponent, 'score');
    this.ignisMeter = this.globalEnty.getValue(GlobalComponent, 'ignisMeter');
    this.isConfigured = false
  }

  createHud() {
    this.createHealthHUD();
    this.createScoreHUD();
    this.createIgnisHUD();
    this.isConfigured = true
  }
  
  createHealthHUD() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create mesh with texture
    const geometry = new THREE.PlaneGeometry(0.8, 0.2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false, // Always render on top
      depthWrite: false
    });
    
    this.healthMesh = new THREE.Mesh(geometry, material);
    this.healthMesh.renderOrder = 999; // Render last (on top)
    this.healthCanvas = canvas;
    this.healthCtx = ctx;
    this.healthTexture = texture;
    
    this.world.scene.add(this.healthMesh);
    this.updateHealthDisplay();
  }
  
  createScoreHUD() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create mesh
    const geometry = new THREE.PlaneGeometry(0.8, 0.2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.scoreMesh = new THREE.Mesh(geometry, material);
    this.scoreMesh.renderOrder = 999;
    this.scoreCanvas = canvas;
    this.scoreCtx = ctx;
    this.scoreTexture = texture;
    
    this.world.scene.add(this.scoreMesh);
    this.updateScoreDisplay();
  }
  
  createIgnisHUD() {
    // Create canvas for progress bar
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create mesh
    const geometry = new THREE.PlaneGeometry(1.0, 0.12);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.ignisMesh = new THREE.Mesh(geometry, material);
    this.ignisMesh.renderOrder = 999;
    this.ignisCanvas = canvas;
    this.ignisCtx = ctx;
    this.ignisTexture = texture;
    
    this.world.scene.add(this.ignisMesh);
    this.updateIgnisDisplay();
  }
  
  // Update displays
  updateHealthDisplay() {
    const ctx = this.healthCtx;
    const canvas = this.healthCanvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw hearts
    ctx.font = '64px Arial';
    let x = 20;
    
    for (let i = 0; i < this.health; i++) {
      ctx.fillText('❤️', x, 80);
      x += 70;
    }
    
    const emptyHearts = Constants.MAX_HEARTS - this.health;
    for (let i = 0; i < emptyHearts; i++) {
      ctx.fillText('🖤', x, 80);
      x += 70;
    }
    
    // Update texture
    this.healthTexture.needsUpdate = true;
  }
  
  updateScoreDisplay() {
    const ctx = this.scoreCtx;
    const canvas = this.scoreCanvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with rounded corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 15);
    ctx.fill();
    
    // Draw score text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${Math.ceil(this.score).toLocaleString('en-US')}`, canvas.width / 2, canvas.height / 2);
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Update texture
    this.scoreTexture.needsUpdate = true;
  }
  
  updateIgnisDisplay() {
    const ctx = this.ignisCtx;
    const canvas = this.ignisCanvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const percent = this.ignisMeter / 100;
    const padding = 10;
    const barWidth = canvas.width - (padding * 2);
    const barHeight = canvas.height - (padding * 2);
    
    // Draw background (empty bar)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(padding, padding, barWidth, barHeight, 10);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw fill (progress)
    if (percent > 0) {
      const fillWidth = barWidth * percent;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(padding, 0, padding + fillWidth, 0);
      if (percent >= 1) {
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#00ff88');
      } else {
        gradient.addColorStop(0, '#ff6600');
        gradient.addColorStop(1, '#ffaa00');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(padding + 2, padding + 2, fillWidth - 4, barHeight - 4, 8);
      ctx.fill();
      
      // Add glow effect when full
      if (percent >= 1) {
        ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fill();
      }
    }
    
    // Update texture
    this.ignisTexture.needsUpdate = true;
  }
  
  // Public API
  setHealth(value) {
    this.health = Math.max(0, Math.min(Constants.MAX_HEARTS, value));
    this.updateHealthDisplay();
  }
  
  setScore(value) {
    this.score = parseInt(value);
    this.updateScoreDisplay();
  }
  
  setIgnisMeter(value) {
    this.ignisMeter = Math.max(1, Math.min(100, value));
    this.updateIgnisDisplay();
  }
  
  addScore(points) {
    this.score += points;
    this.updateScoreDisplay();
  }
  
  damage(amount = 1) {
    this.setHealth(this.health - amount);
  }
  
  heal(amount = 1) {
    this.setHealth(this.health + amount);
  }
  
  depleteIgnisMeter(duration = Constants.DEsTROY.IGNIS) {
    const startValue = this.ignisMeter;
    const startTime = performance.now();
    
    if (this.depleteInterval) {
      clearInterval(this.depleteInterval);
    }
    
    this.depleteInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.ignisMeter = startValue * (1 - easeProgress);
      this.updateIgnisDisplay();
      
      if (progress >= 1) {
        clearInterval(this.depleteInterval);
        this.depleteInterval = null;
        this.ignisMeter = 0;
        this.updateIgnisDisplay();
      }
    }, 16);
  }
  
  destroy() {
    if (this.healthMesh) {
      this.healthMesh.geometry.dispose();
      this.healthMesh.material.dispose();
      this.healthTexture.dispose();
      this.world.scene.remove(this.healthMesh);
    }
    
    if (this.scoreMesh) {
      this.scoreMesh.geometry.dispose();
      this.scoreMesh.material.dispose();
      this.scoreTexture.dispose();
      this.world.scene.remove(this.scoreMesh);
    }
    
    if (this.ignisMesh) {
      this.ignisMesh.geometry.dispose();
      this.ignisMesh.material.dispose();
      this.ignisTexture.dispose();
      this.world.scene.remove(this.ignisMesh);
    }
    
    if (this.depleteInterval) {
      clearInterval(this.depleteInterval);
    }
    
    this.isConfigured = false;
  }

  update(deltaTime) {
    if (!this.isConfigured) return;
    
    this.globalEnty = Array.from(this.queries.global.entities)[0]
    this.health = this.globalEnty.getValue(GlobalComponent, 'health');
    this.score = this.globalEnty.getValue(GlobalComponent, 'score');
    const newIgnis = this.globalEnty.getValue(GlobalComponent, 'ignisMeter');
    if (newIgnis != this.ignisMeter) this.setIgnisMeter(newIgnis)

    const camera = this.world.camera;
    if (!camera) return;
    
    // Get camera direction vectors
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(camera.quaternion);
    
    // POSITIONING GUIDE:
    // distance: how far in front of camera (increase to move away)
    // right multiplier: negative = left, positive = right
    // up multiplier: negative = down, positive = up
    
    const distance = 4.5;  // Distance from camera (increase this to move HUD further away)
    
    // Base position (in front of camera)
    const basePos = camera.position.clone()
      .add(forward.clone().multiplyScalar(distance));
    
    // Position Health HUD (top-left)
    const healthPos = basePos.clone()
      .add(right.clone().multiplyScalar(-1.8))  // Move left
      .add(up.clone().multiplyScalar(1.3));     // Move up
    this.healthMesh.position.copy(healthPos);
    this.healthMesh.quaternion.copy(camera.quaternion);
    
    // Position Score HUD (top-right)
    const scorePos = basePos.clone()
      .add(right.clone().multiplyScalar(1.8))   // Move right
      .add(up.clone().multiplyScalar(1.3));     // Move up
    this.scoreMesh.position.copy(scorePos);
    this.scoreMesh.quaternion.copy(camera.quaternion);
    
    // Position Ignis Meter (bottom-center)
    const ignisPos = basePos.clone()
      .add(up.clone().multiplyScalar(-1.55));   // Move down
    this.ignisMesh.position.copy(ignisPos);
    this.ignisMesh.quaternion.copy(camera.quaternion);
  }
}

/**
 * POSITIONING GUIDE:
 * 
 * To adjust HUD position, modify these values in the update() method:
 * 
 * 1. distance: Controls how far from camera
 *    - 1.0 = very close (arms length)
 *    - 1.5 = comfortable (default)
 *    - 2.0+ = far away
 * 
 * 2. right.multiplyScalar(X):
 *    - Negative = moves left
 *    - Positive = moves right
 *    - Increase magnitude = move further
 * 
 * 3. up.multiplyScalar(Y):
 *    - Negative = moves down
 *    - Positive = moves up
 *    - Increase magnitude = move further
 * 
 * 4. Mesh scale (in create functions):
 *    new THREE.PlaneGeometry(width, height)
 *    - Increase width/height to make elements bigger
 *    - Example: PlaneGeometry(1.2, 0.3) for larger health bar
 * 
 * EXAMPLES:
 * 
 * Move health HUD further left and higher:
 * .add(right.clone().multiplyScalar(-0.8))
 * .add(up.clone().multiplyScalar(0.5))
 * 
 * Move everything further away:
 * const distance = 2.5;
 * 
 * Make health hearts bigger:
 * const geometry = new THREE.PlaneGeometry(1.2, 0.3);
 */