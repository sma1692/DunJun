
export function analyzeObject(obj) {
    const result = {
        methods: [],
        properties: [],
        symbols: []
    };
    
    let current = obj;
    
    while (current && current !== Object.prototype) {
        // Get own property names
        const ownProps = Object.getOwnPropertyNames(current);
        
        ownProps.forEach(prop => {
            if (prop === 'constructor') return;
            
            const descriptor = Object.getOwnPropertyDescriptor(current, prop);
            
            if (typeof descriptor.value === 'function') {
                if (!result.methods.includes(prop)) result.methods.push(prop);
            } else {
                if (!result.properties.includes(prop)) result.properties.push(prop);
            }
        });
        
        // Get symbols
        const symbols = Object.getOwnPropertySymbols(current);
        result.symbols.push(...symbols.map(sym => sym.toString()));
        
        current = Object.getPrototypeOf(current);
    }
    
    console.log('Methods:', result.methods.sort());
    console.log('Properties:', result.properties.sort());
    console.log('Symbols:', result.symbols);    
    return result;
}


export function getCompleteObjectInfo(obj) {
    const info = {};
    
    let level = 0;
    let current = obj;
    
    while (current && current !== Object.prototype) {
        const className = current.constructor.name;
        info[`level${level}_${className}`] = {};
        
        // Property names
        const props = Object.getOwnPropertyNames(current);
        info[`level${level}_${className}`].properties = props
            .filter(prop => prop !== 'constructor')
            .map(prop => {
                const descriptor = Object.getOwnPropertyDescriptor(current, prop);
                return {
                    name: prop,
                    type: typeof descriptor.value,
                    isFunction: typeof descriptor.value === 'function',
                    enumerable: descriptor.enumerable,
                    configurable: descriptor.configurable,
                    writable: descriptor.writable
                };
            });
        
        // Symbols
        const symbols = Object.getOwnPropertySymbols(current);
        info[`level${level}_${className}`].symbols = symbols.map(sym => ({
            symbol: sym.toString(),
            description: sym.description
        }));
        
        current = Object.getPrototypeOf(current);
        level++;
    }
    console.log('Detailed analysis:', info);
    return info;
}




export const debugSources = (source) => {
    console.log('+++++++++ DEBUG BEGUN ++++========++++', source.handedness)
    console.log('Source Obj ', source)
    let haath = source.hand
    console.log('SOURCE HAND = ', source.hand, typeof(haath))
    
    console.log('CHITTIA KALAAIYA = ', source.hand['wrist'])

    console.log("haath.constructor.name", haath.constructor.name)
    console.log("Object.getPrototypeOf(haath)", Object.getPrototypeOf(haath))

    // Check what library created it
    console.log("haath.constructor", haath.constructor)
    let wrist = haath.get('wrist')
    let shaahadat_tip = haath.get('index-finger-tip')
    
    console.log("wrist.constructor", wrist.constructor)

    
    console.log("haath.get('wrist')-----------", wrist, typeof(wrist))
    // Access the joint space info
    
    analyzeObject(wrist)
    getCompleteObjectInfo(wrist)
    
    console.log('!!!!Joint name::::::::::::::::::');
    symbolAccess(wrist)

    // console.log('Radius:', jointSpace.radius);

    
    
    
    
    console.log('+++++++++ DEBUG KHALAAS ++++========++++')
  }

  export const testAllPossibleEvents= (wrist) => {
    
    
    console.log('=== TESTING ALL POSSIBLE EVENTS ===');
    
    // Comprehensive list of WebXR hand tracking events
    const allPossibleEvents = [
        // Basic WebXR events
        'select', 'selectstart', 'selectend',
        'squeeze', 'squeezestart', 'squeezeend',
        
        // Pose events
        'posechange', 'poseupdate', 'posesupdated',
        'change', 'update', 'frame',
        
        // Tracking events  
        'trackingstart', 'trackingend', 'trackingchanged',
        'found', 'lost', 'visible', 'hidden',
        
        // Joint-specific events
        'jointchanged', 'jointupdated', 'landmarkchanged',
        
        // iwer specific
        'xrframe', 'xrupdate', 'spacechanged'
    ];
    
    allPossibleEvents.forEach(eventType => {
        wrist.addEventListener(eventType, (event) => {
            console.log(`🎉 EVENT FIRED: "${eventType}"`, event);
        });
    });
    
    console.log(`Registered ${allPossibleEvents.length} event listeners`);
    console.log('Now move your hand and see if ANY events fire...');
}


 export const  setupEventListeners=(wrist) =>{
        // const wrist = this.handLandmarks.get('wrist');
        console.log('EVENT LISTENERS')



         console.log('=== EVENT SYSTEM DEBUG ===');
    console.log('Wrist object:', wrist);
    console.log('addEventListener method:', wrist.addEventListener);
    console.log('Prototype chain:');
    
    let proto = wrist;
    while (proto = Object.getPrototypeOf(proto)) {
        console.log('-', proto.constructor.name, ':', Object.getOwnPropertyNames(proto));
    }
    
    // Check if it's an EventTarget
    console.log('Is EventTarget?:', wrist instanceof EventTarget);
    console.log('==========================');


    console.log('=== DISCOVERING REAL EVENTS ===');
    
    // Method 1: Override addEventListener to catch ALL event registrations
    const originalAddEventListener = wrist.addEventListener;
    const registeredEvents = new Set();
    
    wrist.addEventListener = function(type, listener, options) {
        console.log(`🔍 Event registered: "${type}"`);
        registeredEvents.add(type);
        return originalAddEventListener.call(this, type, listener, options);
    };
        // Core tracking events
        wrist.addEventListener('poseupdate', (event) => {
           console.log('Real-time gesture detection')
        });

        wrist.addEventListener('trackingstart', (event) => {
           console.log('NINYAWANE')
        });

        // wrist.addEventListener('trackingstart', this.onTrackingStart.bind(this));
        // wrist.addEventListener('trackingend', this.onTrackingEnd.bind(this));
        // wrist.addEventListener('poseupdate', this.onPoseUpdate.bind(this));
        
        // Try other potential events
        // const potentialEvents = ['positionchange', 'rotationchange', 'visibilitychange'];
        // potentialEvents.forEach(eventType => {
        //     wrist.addEventListener(eventType, (e) => {
        //         console.log(`Event ${eventType} fired:`, e.detail);
        //     });
        // });

        // this.testAllPossibleEvents(wrist)
        // this.checkTrackingState(wrist)
    }
    


    export const checkTrackingState=(wrist) =>{
    
    
    console.log('=== CHECKING TRACKING STATE ===');
    
    // Check if there are methods to start/stop tracking
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(wrist));
    console.log('Available methods:', methods);
    
    // Look for tracking control methods
    const trackingMethods = methods.filter(method => 
        method.includes('track') || 
        method.includes('start') || 
        method.includes('stop') ||
        method.includes('enable') ||
        method.includes('disable')
    );
    console.log('Tracking-related methods:', trackingMethods);
    
    // Try calling potential tracking methods
    trackingMethods.forEach(method => {
        console.log(`Testing method: ${method}`);
        try {
            const result = wrist[method]();
        } catch (err) {
            // Method doesn't exist or wrong parameters
        }
    });
}


export const symbolAccess = (obj) => {
    const symbols = Object.getOwnPropertySymbols(obj);
    const xrSpaceSymbol = symbols.find(sym => sym.description === '@iwer/xr-space');
    const xrJointSymbol = symbols.find(sym => sym.description === '@iwer/xr-joint-space');

    // Now access that shit directly
    if (xrSpaceSymbol) {
        const spaceData = obj[xrSpaceSymbol];
        console.log('XR Space data:', spaceData);
        console.log('Offset matrix:', spaceData.offsetMatrix);
        console.log('Parent space:', spaceData.parentSpace);
    }

    if (xrJointSymbol) {
        const jointData = obj[xrJointSymbol];
        console.log('Joint name:', jointData.jointName);
        console.log('Radius:', jointData.radius);
    }
}