
import { MeshBasicMaterial, PlaneGeometry, Mesh, Texture, CanvasTexture } from '@iwsdk/core'; // if not already imported
// NOTE: The 'three' module path here assumes your environment uses a standard module bundler (like Webpack or Vite) 
// or has Three.js set up as a node module.

/**
 * VRLogger Class
 * Manages a persistent canvas overlay for logging text messages in VR.
 */
export class VRLogger {
    /**
     * @param {Camera} camera - The Three.js camera to attach the overlay to.
     * @param {number} maxLines - Maximum number of log lines to display.
     * @param {number} width - Canvas width in pixels.
     * @param {number} height - Canvas height in pixels.
     */
    constructor(camera, maxLines = 25, width = 1024, height = 512) {
        this.logHistory = [];
        this.MAX_LINES = maxLines;
        this.LINE_HEIGHT = 40;
        this.TEXT_OFFSET = 30; // Margin from top/left

        // 1. Setup Canvas
        const logCanvas = document.createElement('canvas');
        logCanvas.width = width;
        logCanvas.height = height;
        this.ctx = logCanvas.getContext('2d');
        this.ctx.font = `bold ${this.LINE_HEIGHT - 5}px monospace`;
        this.ctx.fillStyle = 'white';

        // 2. Setup Three.js Elements
        this.texture = new CanvasTexture(logCanvas);
        
        // Create a plane positioned in front of the camera
        this.mesh = new Mesh(
            new PlaneGeometry(1.0, 0.5), // Size the plane
            new MeshBasicMaterial({ 
                map: this.texture, 
                transparent: true,
                opacity: 0.8
            })
        );
        
        // Position the log plane slightly up and to the left of the center of view
        this.mesh.position.set(0.0, -0.2, -0.8);
        
        // Attach the logger to the camera so it moves with the user's head
        camera.add(this.mesh);
        
        console.log("VRLogger initialized. Use logger.log('message') to display output in headset.");
    }

    /**
     * Adds a new message to the log history and updates the display.
     * @param {string} message - The message to log.
     */
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;

        this.logHistory.unshift(logEntry);
        
        // Keep only the newest MAX_LINES
        if (this.logHistory.length > this.MAX_LINES) {
            this.logHistory.pop();
        }

        this.updateDisplay();
    }

    /**
     * Redraws the log messages onto the canvas texture.
     */
    updateDisplay() {
        const { ctx, texture, logHistory, LINE_HEIGHT, TEXT_OFFSET, mesh } = this;
        
        // Clear the canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Set background transparency (to simulate console background)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, (logHistory.length * LINE_HEIGHT) + (TEXT_OFFSET / 2));

        // Set text style
        ctx.fillStyle = 'lime'; // Use a bright color for readability
        // ctx.font = `bold ${LINE_HEIGHT - 5}px monospace`;
        ctx.font = `bold ${20}px monospace`;
        
        logHistory.forEach((line, index) => {
            const y = TEXT_OFFSET + (index * LINE_HEIGHT);
            ctx.fillText(line, 10, y);
        });

        // Tell Three.js that the texture needs to be refreshed on the next render cycle
        texture.needsUpdate = true;
    }
    
    /**
     * Removes the log mesh from the scene.
     */
    dispose() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.map.dispose();
            this.mesh.material.dispose();
        }
    }
}

export const fpsMonitorConsole = () => {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    function trackFPS() {
        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
        console.log("FPS:", frameCount);
        frameCount = 0;
        lastFrameTime = now;
        }
        requestAnimationFrame(trackFPS);
    }
    trackFPS();
}

// === FPS COUNTER ===


export const fpsMonitorOverLay = (camera) => {
    const fpsCanvas = document.createElement('canvas');
    fpsCanvas.width = 256;
    fpsCanvas.height = 64;
    const fpsCtx = fpsCanvas.getContext('2d');
    const fpsTexture = new CanvasTexture(fpsCanvas);

    // Create a small plane in front of the camera
    const fpsPlane = new Mesh(
    new PlaneGeometry(0.4, 0.1),
    new MeshBasicMaterial({ map: fpsTexture, transparent: true })
    );
    fpsPlane.position.set(0, 0.1, -0.8); // small offset so it's below center view
    camera.add(fpsPlane); // attach to camera so it follows head movement

    // FPS logic
    let lastFrame = performance.now();
    let frameCount = 0;
    let fps = 0;

    function updateFPS() {
    const now = performance.now();
    frameCount++;

    if (now - lastFrame >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrame = now;

        // draw text
        fpsCtx.clearRect(0, 0, fpsCanvas.width, fpsCanvas.height);
        fpsCtx.fillStyle = fps < 60 ? 'red' : 'lime';
        fpsCtx.font = 'bold 40px Arial';
        fpsCtx.fillText(`${fps} FPS`, 60, 45);
        fpsTexture.needsUpdate = true;
    }

    requestAnimationFrame(updateFPS);
    }
    updateFPS();

}
