import {  AssetType } from '@iwsdk/core';

export const all_assets = {
  
  /* textures  and images */
  outside: {
    url: '/textures/djlogo.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  lobby: {
    url: '/textures/lobby.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  gameover: {
    url: '/textures/gameover.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  pause: {
    url: '/textures/pause.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  /// tutorial screen
  tutorial_1: {
    url: '/textures/t1.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  tutorial_2: {
    url: '/textures/t2.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  tutorial_3: {
    url: '/textures/t3.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  tutorial_4: {
    url: '/textures/t4.png',
    type: AssetType.Texture,
    priority: 'critical'
  },
  
  // GLTF assets
  

  // robot: {
  //   url: '/gltf/robot/robot.gltf',
  //   type: AssetType.GLTF,
  //   priority: 'critical'
  // },

  env2: {
    url: '/gltf/d3-c.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },

  punch: {
    // url: '/gltf/Skull.glb',
    // url: '/gltf/skull1.glb',
    url: '/gltf/skull2.glb',
    
    type: AssetType.GLTF,
    priority: 'critical'
  },
  slap: {
    // url: '/gltf/bat.glb',
    url: '/gltf/bat_no_face.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },
  poke: {
    url: '/gltf/eye.glb',
    // url: '/gltf/EYE2.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },

  heart_one: {
    url: '/gltf/heart_one.glb',
    // url: '/gltf/eye.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },

  scroll: {
    url: '/gltf/SCROLLDUNJ.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },


  spell_one: {
    url: '/gltf/spell_flask.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },
  flaming_orb: {
    url: '/gltf/flball.glb',
    // url: '/gltf/flaming_orb.glb',
    type: AssetType.GLTF,
    priority: 'critical'
  },


  ///////////////////audio assets
  
  // bgm_one: {
  //   url: '/audio/dunjunbgm1.ogg',
  //   type: AssetType.Audio,
  //   priority: 'critical'
  // },

  // damage_one: {
  //   url: '/audio/damage.ogg',
  //   type: AssetType.Audio,
  //   priority: 'background'
  // },

  // damage_two: {
  //   url: '/audio/damage_two.ogg',
  //   type: AssetType.Audio,
  //   priority: 'background'
  // },

  // pause_one: {
  //   url: '/audio/pause_one.ogg',
  //   type: AssetType.Audio,
  //   priority: 'background'
  // },
  // spawn_one: {
  //   url: '/audio/spawn_one.ogg',
  //   type: AssetType.Audio,
  //   priority: 'background'
  // },

};