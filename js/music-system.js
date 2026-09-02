/**
 * music-system.js — Pleasing, Harmonious Synthesized Music Engine
 * Built with Web Audio API using low-pass filtering, smooth ADSR envelopes,
 * warm multi-oscillator voicings, and melodic chord progressions.
 */
'use strict';

const MusicSystem = {
  ctx: null,
  masterGain: null,
  compressor: null,
  currentTrack: null,
  isMuted: false,
  volume: 0.28,
  activeNodes: [],
  intervals: [],
  timeouts: [],

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Master dynamics compressor to keep audio smooth and prevent distortion
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(40, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      const resume = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    }

    return this.ctx;
  },

  resume() {
    const ctx = this.init();
    if (ctx && ctx.state === 'suspended') {
      return ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  },

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  },

  mute() {
    this.isMuted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  },

  unmute() {
    this.isMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  },

  toggleMute() {
    this.isMuted ? this.unmute() : this.mute();
    return !this.isMuted;
  },

  toggleMusic() {
    return this.toggleMute();
  },

  stopAll() {
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];

    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
    this.currentTrack = null;
  },

  /**
   * Helper to play a smooth filtered melodic tone (bell / pad / pluck)
   */
  _playNote(freq, dur, type = 'sine', gainVal = 0.1, filterFreq = 1200, detune = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    // Warm envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.05);

    this.activeNodes.push(osc);
  },

  /* =========================================================================
     1. LANDING THEME: Pleasing, Ethereal Ambient Harmony
     ========================================================================= */
  playLandingTheme() {
    if (!this.init()) return;
    this.stopAll();
    this.currentTrack = 'landing';

    // Harmonic progression: Am9 -> Fmaj7 -> Cmaj7 -> Gsus4
    const chords = [
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9 (A, C, E, G, B)
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj7 (F, A, C, E, G)
      [130.81, 164.81, 196.00, 246.94, 329.63], // Cmaj7 (C, E, G, B, E)
      [196.00, 246.94, 293.66, 392.00, 440.00]  // Gsus4 (G, B, D, G, A)
    ];

    let chordIdx = 0;
    const playChordCycle = () => {
      if (this.currentTrack !== 'landing') return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      // Warm background chord
      currentChord.forEach((f, idx) => {
        this._playNote(f, 3.8, 'sine', 0.04, 900, (idx % 2 === 0 ? -5 : 5));
        this._playNote(f, 3.8, 'triangle', 0.025, 750, 0);
      });

      // Melodic gentle bell arpeggios
      currentChord.forEach((f, i) => {
        const tid = setTimeout(() => {
          if (this.currentTrack === 'landing') {
            this._playNote(f * 2, 1.2, 'sine', 0.035, 2200);
          }
        }, i * 450 + 200);
        this.timeouts.push(tid);
      });
    };

    playChordCycle();
    const interval = setInterval(playChordCycle, 3600);
    this.intervals.push(interval);
  },

  /* =========================================================================
     2. CHARACTER SELECTION: Elegant, Mysterious & Melodic
     ========================================================================= */
  playSelectionTheme() {
    if (!this.init()) return;
    this.stopAll();
    this.currentTrack = 'selection';

    // D minor ambient progression: Dm9 -> Bbmaj7 -> Gm9 -> Asus4
    const chords = [
      [146.83, 220.00, 261.63, 329.63], // Dm9
      [116.54, 174.61, 220.00, 293.66], // Bbmaj7
      [98.00,  146.83, 174.61, 220.00], // Gm9
      [110.00, 164.81, 220.00, 293.66]  // Asus4
    ];

    let chordIdx = 0;
    const playCycle = () => {
      if (this.currentTrack !== 'selection') return;
      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((f, i) => {
        this._playNote(f, 3.2, 'triangle', 0.04, 1100, i * 3);
        this._playNote(f * 2, 1.8, 'sine', 0.02, 1600);
      });
    };

    playCycle();
    const interval = setInterval(playCycle, 3200);
    this.intervals.push(interval);
  },

  /* =========================================================================
     3. BATTLE THEME: Melodic, Exciting & Pleasing Combat Synth
     ========================================================================= */
  playBattleTheme() {
    if (!this.init()) return;
    this.stopAll();
    this.currentTrack = 'battle';

    // D minor upbeat melodic battle progression: Dm -> Bb -> F -> C
    const bassRhythm = [
      73.42, 73.42, 146.83, 110.00,  // D
      58.27, 58.27, 116.54, 87.31,   // Bb
      87.31, 87.31, 174.61, 130.81,  // F
      65.41, 65.41, 130.81, 98.00    // C
    ];

    const leadMelody = [
      [293.66, 349.23, 440.00, 523.25], // D, F, A, C
      [466.16, 440.00, 349.23, 293.66], // Bb, A, F, D
      [349.23, 440.00, 523.25, 587.33], // F, A, C, D
      [523.25, 440.00, 392.00, 349.23]  // C, A, G, F
    ];

    let step = 0;
    const stepDuration = 240; // ~125 BPM sixteenth feel

    const tick = () => {
      if (this.currentTrack !== 'battle') return;

      const bassNote = bassRhythm[step % bassRhythm.length];
      const bar = Math.floor(step / 4) % leadMelody.length;
      const melNote = leadMelody[bar][step % 4];

      // Warm bass pluck
      this._playNote(bassNote, 0.22, 'triangle', 0.08, 650);

      // Soft melodic lead
      if (step % 2 === 0) {
        this._playNote(melNote, 0.35, 'sine', 0.055, 1800);
      }

      // Soft rhythm percussion (hi-hat / kick simulation with filtered sine)
      if (step % 4 === 0) {
        // Soft kick
        this._playNote(55, 0.12, 'sine', 0.12, 180);
      } else if (step % 2 === 0) {
        // Soft snap / hat
        this._playNote(2200, 0.04, 'triangle', 0.015, 3000);
      }

      step++;
    };

    tick();
    const interval = setInterval(tick, stepDuration);
    this.intervals.push(interval);
  },

  /* =========================================================================
     4. VICTORY THEME: Triumphant, Cheerful, Uplifting Fanfare
     ========================================================================= */
  playVictoryTheme() {
    if (!this.init()) return;
    this.stopAll();
    this.currentTrack = 'victory';

    // Uplifting progression: C -> G -> Am -> F -> C
    const fanfareChords = [
      [261.63, 329.63, 392.00, 523.25], // C major (C, E, G, C)
      [196.00, 246.94, 293.66, 392.00], // G major (G, B, D, G)
      [220.00, 261.63, 329.63, 440.00], // A minor (A, C, E, A)
      [174.61, 220.00, 261.63, 349.23], // F major (F, A, C, F)
      [261.63, 329.63, 392.00, 523.25, 659.25] // C major high finale
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (this.currentTrack !== 'victory') return;
      const chord = fanfareChords[chordIdx % fanfareChords.length];
      chordIdx++;

      chord.forEach((f, i) => {
        // Warm brass/bell synth
        this._playNote(f, 0.85, 'triangle', 0.065, 1400, (i % 2 === 0 ? -4 : 4));
        // Sparkle overtone
        this._playNote(f * 2, 0.5, 'sine', 0.035, 2400);
      });
    };

    playNextChord();
    const interval = setInterval(playNextChord, 650);
    this.intervals.push(interval);
  },

  /* =========================================================================
     5. DEFEAT THEME: Somber, Atmospheric Cello/Heartbeat
     ========================================================================= */
  playDefeatTheme() {
    if (!this.init()) return;
    this.stopAll();
    this.currentTrack = 'defeat';

    const defeatNotes = [110.00, 130.81, 146.83, 98.00]; // A2, C3, D3, G2
    let idx = 0;

    const playDefeat = () => {
      if (this.currentTrack !== 'defeat') return;
      const note = defeatNotes[idx % defeatNotes.length];
      idx++;

      this._playNote(note, 2.5, 'sine', 0.06, 500);
      this._playNote(note * 0.5, 2.5, 'triangle', 0.04, 350);
    };

    playDefeat();
    const interval = setInterval(playDefeat, 2200);
    this.intervals.push(interval);
  }
};

window.MusicSystem = MusicSystem;
