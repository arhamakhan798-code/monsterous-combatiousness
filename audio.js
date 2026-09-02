/**
 * audio.js — High-Impact Web Audio API Sound Engine for Monsterous Combatiousness
 *
 * Implements:
 *  - Global gesture unlocker (starts/resumes AudioContext on first user action)
 *  - Procedural/Synthesized Fighting Game Background Music (dark synth combat beat)
 *  - Punch whoosh + impact crunch
 *  - Karate kick whoosh + heavy impact
 *  - Beast roar / claw slash
 *  - Ascending healing harmonic chime
 *  - Triumphant victory fanfare
 *  - Deep acoustic heartbeat during defeat POV sequence
 *  - Doom chord & viscera blood splatter
 *  - Music ON/OFF & SFX ON/OFF controls with persistent settings
 */

'use strict';

const AudioEngine = {
  ctx: null,
  musicEnabled: true,
  sfxEnabled: true,
  isUnlocked: false,
  musicNode: null,
  musicTimer: null,
  musicTempo: 124, // BPM
  musicStep: 0,

  init() {
    // Load saved audio preferences
    try {
      const savedMusic = localStorage.getItem('mc_music_enabled');
      if (savedMusic !== null) this.musicEnabled = savedMusic === 'true';
      const savedSfx = localStorage.getItem('mc_sfx_enabled');
      if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
    } catch (e) {}

    // Attach unlock events to window
    const unlockEvents = ['click', 'keydown', 'touchstart', 'pointerdown'];
    const unlockHandler = () => {
      this.unlock();
      unlockEvents.forEach(evt => window.removeEventListener(evt, unlockHandler));
    };
    unlockEvents.forEach(evt => window.addEventListener(evt, unlockHandler, { passive: true }));
  },

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isUnlocked = true;
    if (this.musicEnabled && !this.musicTimer) {
      this.startMusic();
    }
  },

  _getCtx() {
    this.unlock();
    return this.ctx;
  },

  /* ------------------------------------------------------------------
     Preferences & Controls
  ------------------------------------------------------------------ */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    try {
      localStorage.setItem('mc_music_enabled', String(this.musicEnabled));
    } catch (e) {}

    if (this.musicEnabled) {
      window.MusicSystem?.unmute?.();
      this.startMusic();
    } else {
      window.MusicSystem?.mute?.();
      this.stopMusic();
    }
    this._updateAudioUI();
    return this.musicEnabled;
  },

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    try {
      localStorage.setItem('mc_sfx_enabled', String(this.sfxEnabled));
    } catch (e) {}
    this._updateAudioUI();
    if (this.sfxEnabled) {
      this.playButtonClick();
    }
    return this.sfxEnabled;
  },

  _updateAudioUI() {
    const musicBtns = document.querySelectorAll('.btn-toggle-music');
    musicBtns.forEach(btn => {
      btn.textContent = this.musicEnabled ? '🎵 MUSIC: ON' : '🔇 MUSIC: OFF';
      btn.classList.toggle('active', this.musicEnabled);
    });

    const sfxBtns = document.querySelectorAll('.btn-toggle-sfx');
    sfxBtns.forEach(btn => {
      btn.textContent = this.sfxEnabled ? '🔊 SFX: ON' : '🔈 SFX: OFF';
      btn.classList.toggle('active', this.sfxEnabled);
    });
  },

  /* ------------------------------------------------------------------
     Synthesized Dynamic Background Music Engine (delegates to MusicSystem)
  ------------------------------------------------------------------ */
  startMusic(track) {
    if (!this.musicEnabled) return;
    this.stopMusic();

    if (window.MusicSystem) {
      window.MusicSystem.unmute();
      const curPage = window.App?.currentPage;
      if (track === 'victory') {
        window.MusicSystem.playVictoryTheme();
      } else if (track === 'defeat') {
        window.MusicSystem.playDefeatTheme();
      } else if (curPage === 'battle-page' || track === 'battle') {
        window.MusicSystem.playBattleTheme();
      } else if (curPage === 'landing-page') {
        window.MusicSystem.playLandingTheme();
      } else {
        window.MusicSystem.playSelectionTheme();
      }
    }
  },

  stopMusic() {
    if (window.MusicSystem) {
      window.MusicSystem.stopAll();
    }
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  },

  _synthTone(t, freq, dur, type = 'sawtooth', vol = 0.1, lowpass = false) {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      if (lowpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  },

  _synthDrum(t, startFreq, endFreq, dur, vol) {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  },

  _synthSnare(t, dur, vol) {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      // Noise buffer for snare snap
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
    } catch (e) {}
  },

  _synthHiHat(t, dur, vol) {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6500, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
    } catch (e) {}
  },

  /* ------------------------------------------------------------------
     Sound FX Suite (High-Impact Combat Effects)
  ------------------------------------------------------------------ */
  playFist() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Whoosh + Punch Snap + Low impact thud
    this._synthDrum(t, 220, 45, 0.18, 0.45);
    this._synthTone(t, 160, 0.15, 'sawtooth', 0.35, true);
    this._synthSnare(t + 0.02, 0.12, 0.3);
  },

  playKick() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Heavy whoosh + hard crack
    this._synthDrum(t, 280, 32, 0.26, 0.55);
    this._synthTone(t, 190, 0.22, 'triangle', 0.45, true);
    this._synthSnare(t + 0.03, 0.18, 0.38);
  },

  playMonsterHit() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Heavy crunch
    this._synthDrum(t, 140, 24, 0.32, 0.6);
    this._synthTone(t, 95, 0.35, 'sawtooth', 0.4, true);
  },

  playMonsterAttack() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Beast roar modulation + claw slash
    this._synthDrum(t, 180, 30, 0.4, 0.55);
    this._synthTone(t, 110, 0.45, 'sawtooth', 0.45, true);
    this._synthSnare(t + 0.06, 0.22, 0.4);
  },

  playMonsterCrash() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._synthDrum(t, 160, 20, 0.75, 0.7);
    this._synthTone(t, 85, 0.7, 'sawtooth', 0.5, true);
  },

  playHeal() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const freqs = [440, 554.37, 659.25, 880, 1108.73];
    freqs.forEach((f, i) => {
      this._synthTone(ctx.currentTime + i * 0.07, f, 0.42, 'sine', 0.22, false);
    });
  },

  playVictoryFanfare() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const notes = [
      { f: 523.25, d: 0.18, t: 0 },
      { f: 659.25, d: 0.18, t: 0.18 },
      { f: 783.99, d: 0.22, t: 0.36 },
      { f: 1046.50, d: 0.65, t: 0.58 }
    ];
    notes.forEach(n => {
      this._synthTone(ctx.currentTime + n.t, n.f, n.d, 'triangle', 0.35, false);
      this._synthTone(ctx.currentTime + n.t, n.f * 0.5, n.d, 'sine', 0.25, true);
    });
  },

  playHeartbeat(delay = 0) {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    // Acoustic double-pulse (lub-dub)
    [0, 0.18].forEach(offset => {
      const t = ctx.currentTime + delay + offset;
      this._synthDrum(t, 85, 28, 0.16, 0.65);
    });
  },

  playBloodSplat() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._synthDrum(t, 260, 35, 0.28, 0.35);
    this._synthSnare(t, 0.15, 0.25);
  },

  playDoomChord() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const freqs = [65.41, 77.78, 98.00, 130.81];
    freqs.forEach(f => {
      this._synthTone(ctx.currentTime, f, 3.8, 'sawtooth', 0.2, true);
    });
  },

  playButtonClick() {
    if (!this.sfxEnabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    this._synthTone(ctx.currentTime, 580, 0.04, 'sine', 0.15, false);
  }
};

// Global backward-compatible bridge for existing codebase references
window.SoundFX = {
  _ctx() { return AudioEngine._getCtx(); },
  playFist() { AudioEngine.playFist(); },
  playKick() { AudioEngine.playKick(); },
  playMonsterHit() { AudioEngine.playMonsterHit(); },
  playMonsterAttack() { AudioEngine.playMonsterAttack(); },
  playMonsterCrash() { AudioEngine.playMonsterCrash(); },
  playBloodSplat() { AudioEngine.playBloodSplat(); },
  playHeal() { AudioEngine.playHeal(); },
  playVictoryFanfare() { AudioEngine.playVictoryFanfare(); },
  playHeartbeat(delay) { AudioEngine.playHeartbeat(delay); },
  playDoomChord() { AudioEngine.playDoomChord(); }
};

window.AudioEngine = AudioEngine;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AudioEngine.init();
});
