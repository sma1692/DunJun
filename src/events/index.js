session.addEventListener('select', (e) => {
  console.log('SELECT - Main trigger/button click completed');
  // Fired when: Controller trigger released OR hand pinch completed
});

session.addEventListener('selectstart', (e) => {
  console.log('SELECTSTART - Trigger/button pressed down');
  // Fired when: Controller trigger pressed OR hand pinch started
});

session.addEventListener('selectend', (e) => {
  console.log('SELECTEND - Trigger/button released');
  // Fired when: Controller trigger released OR hand pinch released
});

session.addEventListener('squeeze', (e) => {
  console.log('SQUEEZE - Grip button clicked');
  // Fired when: Side grip button on controller pressed & released
  // Often used for "grabbing" objects
});

session.addEventListener('squeezestart', (e) => {
  console.log('SQUEEZESTART - Grip button pressed down');
});

session.addEventListener('squeezeend', (e) => {
  console.log('SQUEEZEEND - Grip button released');
});






// XR session lifecycle
world.renderer.xr.addEventListener('sessionstart', () => {
  console.log('VR/AR session started');
});

world.renderer.xr.addEventListener('sessionend', () => {
  console.log('VR/AR session ended');
});

// Input sources added/removed (controllers, hands)
session.addEventListener('inputsourceschange', (e) => {
  console.log('Input changed');
  console.log('Added:', e.added); // New controllers/hands
  console.log('Removed:', e.removed); // Disconnected
});

// Visibility change (e.g., when you remove headset)
session.addEventListener('visibilitychange', () => {
  console.log('Visibility:', session.visibilityState);
  // 'visible', 'visible-blurred', or 'hidden'
});



session.addEventListener('hand-tracking-available', (e) => {
  console.log('HAND TRACKING AVAILABLE');
});

// For individual hand joints
session.addEventListener('hand-joint-moved', (e) => {
  console.log('Hand joint moved:', e.joint, e.position);
});




// ==== wrist object


// Continuous updates (60-90fps)
wrist.addEventListener('poseupdate', (event) => {
    // Real-time gesture detection
});

// When position changes significantly
wrist.addEventListener('positionchange', (event) => {
    console.log('Major position change');
});

// When rotation changes significantly  
wrist.addEventListener('rotationchange', (event) => {
    console.log('Major rotation change');
});

// Continuous updates (60-90fps)
wrist.addEventListener('poseupdate', (event) => {
    // Real-time gesture detection
});

// When position changes significantly
wrist.addEventListener('positionchange', (event) => {
    console.log('Major position change');
});

// When rotation changes significantly  
wrist.addEventListener('rotationchange', (event) => {
    console.log('Major rotation change');
});

// Pinch gestures
wrist.addEventListener('pinchstart', (event) => {});
wrist.addEventListener('pinchend', (event) => {});
wrist.addEventListener('pinchupdate', (event) => {});

// Grab gestures  
wrist.addEventListener('grabstart', (event) => {});
wrist.addEventListener('grabend', (event) => {});