



export class RealLoadingScreen {
  constructor() {
    this.totalBytes = 0;
    this.loadedBytes = 0;
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.assetSizes = new Map(); // Track individual asset sizes
    this.createUI();
  }

  createUI() {
    if (!document.getElementById('lobster-font')) {
        const link = document.createElement('link');
        link.id = 'lobster-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Lobster&display=swap';
        document.head.appendChild(link);
    }
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      z-index: 9999; font-family: 'Lobster', cursive; color: white;
    `;

    this.title = document.createElement('h1');
    this.title.textContent = 'LOADING DUNJUN WORLD';
    this.title.style.cssText = `
      color: #00d4ff; font-size: 48px; margin-bottom: 40px;
      text-shadow: 0 0 20px rgba(0, 212, 255, 0.5); letter-spacing: 4px;
    `;

    this.barContainer = document.createElement('div');
    this.barContainer.style.cssText = `
      width: 600px; height: 40px; background: rgba(255, 255, 255, 0.1);
      border-radius: 20px; overflow: hidden; border: 2px solid rgba(0, 212, 255, 0.3);
      position: relative;
    `;

    this.barFill = document.createElement('div');
    this.barFill.style.cssText = `
      width: 0%; height: 100%; background: linear-gradient(90deg, #00d4ff 0%, #0099ff 100%);
      transition: width 0.3s ease; box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
    `;

    this.percentText = document.createElement('div');
    this.percentText.textContent = 'Unlocking doors…';
    this.percentText.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 20px; font-weight: bold; color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); z-index: 1;
    `;

    this.assetCounter = document.createElement('div');
    this.assetCounter.textContent = '0 / 0 assets';
    this.assetCounter.style.cssText = `color: #999; font-size: 18px; margin-top: 20px;`;

    this.currentFile = document.createElement('div');
    this.currentFile.textContent = 'Initializing...';
    this.currentFile.style.cssText = `
      color: #00d4ff; font-size: 16px; margin-top: 10px; max-width: 600px;
      text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    `;

    this.dataLoaded = document.createElement('div');
    this.dataLoaded.textContent = '0 MB / 0 MonsterBaits';
    this.dataLoaded.style.cssText = `color: #666; font-size: 14px; margin-top: 10px;`;

    this.barContainer.appendChild(this.barFill);
    this.barContainer.appendChild(this.percentText);
    this.overlay.appendChild(this.title);
    this.overlay.appendChild(this.barContainer);
    this.overlay.appendChild(this.assetCounter);
    this.overlay.appendChild(this.currentFile);
    this.overlay.appendChild(this.dataLoaded);
    document.body.appendChild(this.overlay);
  }

  setTotal(count, bytes = 0) {
    this.totalAssets = count;
    this.totalBytes = bytes;
    this.updateDisplay();
  }

  onAssetProgress(fileName, loaded, total) {
    this.currentFile.textContent = `Loading: ${fileName.split('.')[0]}`;
    
    // Update running total
    const currentAssetBytes = this.assetSizes.get(fileName) || 0;
    this.loadedBytes = this.loadedBytes - currentAssetBytes + loaded;
    this.assetSizes.set(fileName, loaded);
    
    this.updateDisplay();
  }

  onAssetComplete(fileName, size) {
    this.loadedAssets++;
    this.assetSizes.set(fileName, size);
    this.updateDisplay();
  }

  updateDisplay() {
    const percentage = this.totalAssets > 0 
      ? Math.round((this.loadedAssets / this.totalAssets) * 100) 
      : 0;

    let newText 
    if (percentage>33) newText = 'Sharpening blades…'
    if (percentage>77) newText = 'Loading lore…'
    
    this.barFill.style.width = `${percentage}%`;
    if(newText) this.percentText.textContent = `${newText}`;
    this.assetCounter.textContent = `${this.loadedAssets} / ${this.totalAssets} assets`;
    
    const loadedMB = (this.loadedBytes / (1024 * 1024)).toFixed(2);
    const totalMB = this.totalBytes > 0 ? (this.totalBytes / (1024 * 1024)).toFixed(2) : '??';
    this.dataLoaded.textContent = `${loadedMB} MB${this.totalBytes > 0 ? ` / ${totalMB} MonsterBaits` : ''}`;
  }

  async hide() {
    this.currentFile.textContent = 'Complete!';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return new Promise((resolve) => {
      this.overlay.style.transition = 'opacity 0.5s';
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.remove();
        resolve();
      }, 500);
    });
  }
}

// ============================================
// INTERCEPT NETWORK REQUESTS
// ============================================
export function setupAssetTracking(loadingScreen, assets) {
  loadingScreen.setTotal(assets.length, 0);

  const originalFetch = window.fetch;
  const assetUrls = new Set(assets.map(a => a.url)); // Changed 'path' to 'url'
  const completedAssets = new Set();

  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    
    // Check if this is an asset we're tracking
    const isTrackedAsset = assetUrls.has(url) || 
                          url.match(/\.(glb|gltf|png|jpg|jpeg|webp|mp3|ogg|wav)$/i);
    
    if (isTrackedAsset && !completedAssets.has(url)) {
      const fileName = url.split('/').pop();
      
      try {
        const response = await originalFetch.apply(this, args);
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        
        // Clone response to read progress
        const clonedResponse = response.clone();
        const reader = clonedResponse.body.getReader();
        let receivedLength = 0;

        // Read chunks and update progress
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          loadingScreen.onAssetProgress(fileName, receivedLength, totalSize);
        }

        completedAssets.add(url);
        loadingScreen.onAssetComplete(fileName, receivedLength);

        return response;
        
      } catch (error) {
        console.error(`Failed to load ${fileName}:`, error);
        completedAssets.add(url);
        loadingScreen.onAssetComplete(fileName, 0);
        throw error;
      }
    }
    
    return originalFetch.apply(this, args);
  };
}