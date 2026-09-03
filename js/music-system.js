/**
 * music-system.js — Music Engine
 * Background music disabled as requested by user.
 * Ready for custom user music file drop.
 */
'use strict';

const MusicSystem = {
  ctx: null,
  currentTrack: null,
  isMuted: true,
  volume: 0,

  init() { return null; },
  resume() { return Promise.resolve(); },
  setVolume(val) {},
  mute() {},
  unmute() {},
  toggleMute() { return false; },
  toggleMusic() { return false; },
  stopAll() {},

  // All background music themes disabled until user drops custom audio file
  playLandingTheme() {},
  playSelectionTheme() {},
  playBattleTheme() {},
  playVictoryTheme() {},
  playDefeatTheme() {}
};

window.MusicSystem = MusicSystem;
