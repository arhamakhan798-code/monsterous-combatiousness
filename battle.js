/**
 * battle.js — Monsterous Combatiousness Core Game Engine (Full Rewrite)
 *
 * Mechanics (Python parity):
 *  - Uh = 100, Mh = 100
 *  - A (Fist): Mh -= randint(1, 40)
 *  - B (Kick):  Mh -= randint(20, 30)
 *  - C (Heal):  Uh = min(100, Uh + randint(20, 30))
 *  - Monster:   Uh -= randint(20, 40)
 *
 * Features:
 *  - Real 2D Puppet Rig animation via PuppetRig class (Canvas-based)
 *  - True fighter grounding (feet anchored to arena floor)
 *  - Canonical facing: Player → right, Monster → left (no double-flip)
 *  - Animation State Machine: IDLE, PUNCH, KICK, BLOCK, HIT, VICTORY, DEFEAT
 *  - Continuous rhythmic victory dance (not a static pose)
 *  - Physical ragdoll defeat fall (puppet joints collapse)
 *  - Cinematic defeat camera zoom → POV → blood flow from top → red screen
 *  - Game history recorded once atomically per match
 *  - All profanity replaced with clean trash-talk
 */
'use strict';

/* =====================================================================
   BLOOD CANVAS ANIMATION (Defeat only)
   ===================================================================== */
const BloodAnim = {
  canvas: null, ctx: null, drops: [], streams: [], dropTimers: [], animId: null, running: false,

  init(canvas) {
    this.canvas = canvas;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this._resize();
      if (!this._resizeAttached) {
        this._resizeAttached = true;
        window.addEventListener('resize', () => this._resize());
      }
    }
  },

  _resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  start() {
    if (!this.canvas || !this.ctx) return;
    this.stop();
    this._resize();
    this.drops = []; this.streams = []; this.dropTimers = [];
    this.running = true;
    this.curtainY = 0;
    this.startTime = Date.now();

    const W = this.canvas.width;
    const count = Math.max(26, Math.floor(W / 42));
    for (let i = 0; i < count; i++) {
      this.streams.push({
        x: (i / count) * W + (Math.random() * 24 - 12),
        w: 12 + Math.random() * 28,
        headY: 0,
        speed: 4 + Math.random() * 9,
        accel: 0.14 + Math.random() * 0.22,
        startTime: Date.now() + Math.random() * 900,
        color: Math.random() > 0.4 ? '#8B0000' : '#550000',
        alpha: 0.88 + Math.random() * 0.12,
        beadR: 8 + Math.random() * 14
      });
    }
    for (let i = 0; i < 18; i++) this._scheduleDrop(200 + Math.random() * 1800);
    this._render();
  },

  _scheduleDrop(delay) {
    const tid = setTimeout(() => {
      this.dropTimers = this.dropTimers.filter(t => t !== tid);
      if (!this.running) return;
      window.SoundFX?.playBloodSplat?.();
      const W = this.canvas.width, H = this.canvas.height;
      const x = Math.random() * W, y = Math.random() * H * 0.75;
      const r = 14 + Math.random() * 38, num = 5 + Math.floor(Math.random() * 7);
      const spokes = Array.from({ length: num }, (_, s) => {
        const a = (Math.PI * 2 / num) * s + (Math.random() * 0.5 - 0.25);
        const d = r * (1.2 + Math.random() * 1.5);
        return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: r * (0.13 + Math.random() * 0.18) };
      });
      this.drops.push({ x, y, r, spokes, cur: 1, drip: 0, maxDrip: 60 + Math.random() * 190, dripSpd: 1.5 + Math.random() * 3, color: '#8B0000', alpha: 0.9 });
    }, delay);
    this.dropTimers.push(tid);
  },

  _render() {
    if (!this.running) return;
    const ctx = this.ctx, canvas = this.canvas, now = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.curtainY < canvas.height) this.curtainY += (canvas.height - this.curtainY) * 0.015 + 1.2;
    ctx.fillStyle = 'rgba(80,0,10,0.96)';
    ctx.fillRect(0, 0, canvas.width, Math.min(canvas.height, this.curtainY * 0.45));

    this.streams.forEach(s => {
      if (now < s.startTime) return;
      s.headY += s.speed; s.speed += s.accel;
      ctx.save(); ctx.globalAlpha = s.alpha;
      const grad = ctx.createLinearGradient(s.x - s.w / 2, 0, s.x + s.w / 2, 0);
      grad.addColorStop(0, '#480005'); grad.addColorStop(0.28, '#9E000D');
      grad.addColorStop(0.65, '#D40018'); grad.addColorStop(1, '#5A0008');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(s.x - s.w / 2, 0);
      ctx.lineTo(s.x - s.w * 0.28, s.headY);
      ctx.arc(s.x, s.headY, s.beadR, 0, Math.PI);
      ctx.lineTo(s.x + s.w / 2, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.headY + s.beadR * 0.35, s.beadR * 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,235,0.65)';
      ctx.beginPath(); ctx.ellipse(s.x - s.w * 0.12, s.headY * 0.55, Math.max(1.5, s.w * 0.1), Math.min(s.headY * 0.45, 75), 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    this.drops.forEach(d => {
      if (d.cur < d.r) d.cur += (d.r - d.cur) * 0.32 + 0.6;
      ctx.save(); ctx.globalAlpha = d.alpha; ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.cur, 0, Math.PI * 2); ctx.fill();
      if (d.cur > d.r * 0.55) d.spokes.forEach(sp => { ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill(); });
      if (d.cur >= d.r * 0.88 && d.drip < d.maxDrip) d.drip += d.dripSpd;
      if (d.drip > 0) {
        const dw = d.r * 0.26;
        ctx.beginPath(); ctx.moveTo(d.x - dw / 2, d.y); ctx.lineTo(d.x - dw * 0.12, d.y + d.drip);
        ctx.arc(d.x, d.y + d.drip, dw * 0.3, 0, Math.PI * 2); ctx.lineTo(d.x + dw / 2, d.y); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });

    this.animId = requestAnimationFrame(() => this._render());
  },

  stop() {
    this.running = false;
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    this.dropTimers.forEach(id => clearTimeout(id)); this.dropTimers = [];
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drops = []; this.streams = [];
  }
};

/* =====================================================================
   PUPPET RIG MANAGER (wraps PuppetRig instances on canvases)
   ===================================================================== */
const PuppetManager = {
  playerRig: null,
  monsterRig: null,
  playerCanvas: null,
  monsterCanvas: null,
  rafId: null,
  lastTime: 0,

  init(playerCanvas, monsterCanvas, charType = 'male') {
    this.playerCanvas  = playerCanvas;
    this.monsterCanvas = monsterCanvas;

    if (typeof PuppetRig === 'undefined') {
      console.warn('[PuppetManager] PuppetRig not available — using sprite fallback');
      return;
    }

    // Clean up any previous rigs
    this.destroy();

    // Player faces right (+1), Monster faces left (−1) — canonical orientation
    this.playerRig = new PuppetRig(charType, playerCanvas, {
      facing: 1,
      scale: 0.85,
      groundY: playerCanvas.height * 0.88,
      rootX:   playerCanvas.width  * 0.5
    });

    this.monsterRig = new PuppetRig('monster', monsterCanvas, {
      facing: -1,    // monster faces LEFT toward player — canonical, no double-flip
      scale: 0.38,
      groundY: monsterCanvas.height * 0.88,
      rootX:   monsterCanvas.width  * 0.5
    });

    this.playerRig.playState('IDLE');
    this.monsterRig.playState('IDLE');

    this._startLoop();
  },

  _startLoop() {
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.playerRig && !this.monsterRig) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      // Clear canvases
      if (this.playerCanvas) {
        const ctx = this.playerCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.playerCanvas.width, this.playerCanvas.height);
      }
      if (this.monsterCanvas) {
        const ctx = this.monsterCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.monsterCanvas.width, this.monsterCanvas.height);
      }

      this.playerRig?.update(dt);
      this.playerRig?.render();
      this.monsterRig?.update(dt);
      this.monsterRig?.render();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },

  playPlayer(state, options = {}) { this.playerRig?.playState(state, options); },
  playMonster(state, options = {}) { this.monsterRig?.playState(state, options); },

  resetPlayer() { this.playerRig?.playState('IDLE'); },
  resetMonster() { this.monsterRig?.playState('IDLE'); },

  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.playerRig  = null;
    this.monsterRig = null;
  }
};

/* =====================================================================
   ANIMATION STATE MACHINE — Manages animation transitions & guards
   ===================================================================== */
const AnimationStateMachine = {
  // State tracking for both fighter and monster
  playerState: 'IDLE',
  playerAnimTimer: null,
  monsterState: 'IDLE',
  monsterAnimTimer: null,

  // Transition guards: prevent conflicting animations
  _canTransition(from, to) {
    // DEFEAT is terminal—cannot leave it
    if (from === 'DEFEAT' && to !== 'DEFEAT' && to !== 'IDLE') return false;
    // VICTORY is terminal—cannot interrupt with combat actions
    if (from === 'VICTORY' && ['PUNCH', 'KICK', 'BLOCK', 'HIT', 'ATTACK'].includes(to)) return false;
    return true;
  },

  /* ---- Player Animation Control ---- */
  playPlayerAnimation(state, duration = 0.7, onComplete = null) {
    if (!this._canTransition(this.playerState, state)) return false;

    // Cancel previous timer if any
    if (this.playerAnimTimer) clearTimeout(this.playerAnimTimer);

    this.playerState = state;
    PuppetManager.playPlayer(state, { duration, onComplete });

    // Auto-transition to IDLE after animation completes (unless VICTORY/DEFEAT)
    if (!['VICTORY', 'DEFEAT', 'IDLE'].includes(state) && duration > 0) {
      this.playerAnimTimer = setTimeout(() => {
        if (this.playerState === state) {
          this.playerState = 'IDLE';
          PuppetManager.resetPlayer();
        }
        this.playerAnimTimer = null;
      }, duration * 1000);
    }

    return true;
  },

  resetPlayerToIdle() {
    if (this.playerAnimTimer) clearTimeout(this.playerAnimTimer);
    this.playerAnimTimer = null;
    this.playerState = 'IDLE';
    PuppetManager.resetPlayer();
  },

  /* ---- Monster Animation Control ---- */
  playMonsterAnimation(state, duration = 0.7, onComplete = null) {
    if (!this._canTransition(this.monsterState, state)) return false;

    // Cancel previous timer if any
    if (this.monsterAnimTimer) clearTimeout(this.monsterAnimTimer);

    this.monsterState = state;
    PuppetManager.playMonster(state, { duration, onComplete });

    // Auto-transition to IDLE after animation completes (unless VICTORY/DEFEAT)
    if (!['VICTORY', 'DEFEAT', 'IDLE'].includes(state) && duration > 0) {
      this.monsterAnimTimer = setTimeout(() => {
        if (this.monsterState === state) {
          this.monsterState = 'IDLE';
          PuppetManager.resetMonster();
        }
        this.monsterAnimTimer = null;
      }, duration * 1000);
    }

    return true;
  },

  resetMonsterToIdle() {
    if (this.monsterAnimTimer) clearTimeout(this.monsterAnimTimer);
    this.monsterAnimTimer = null;
    this.monsterState = 'IDLE';
    PuppetManager.resetMonster();
  },

  /* ---- Global Reset (e.g., battle end or character change) ---- */
  resetAll() {
    if (this.playerAnimTimer) clearTimeout(this.playerAnimTimer);
    if (this.monsterAnimTimer) clearTimeout(this.monsterAnimTimer);
    this.playerAnimTimer = null;
    this.monsterAnimTimer = null;
    this.playerState = 'IDLE';
    this.monsterState = 'IDLE';
    PuppetManager.resetPlayer();
    PuppetManager.resetMonster();
  },

  /* ---- Query current state ---- */
  getPlayerState() { return this.playerState; },
  getMonsterState() { return this.monsterState; },
  isPlayerBusy() { return !['IDLE'].includes(this.playerState); },
  isMonsterBusy() { return !['IDLE'].includes(this.monsterState); }
};

/* =====================================================================
   BATTLE ENGINE — Main Combat State Machine
   ===================================================================== */
const BattleEngine = {
  state: {
    status: 'IDLE',
    playerHp: 100, monsterHp: 100,
    playerName: 'Player', selectedChar: 'male',
    turnId: 0, busy: false, over: false
  },
  _outcomeId: 0,
  _matchRecorded: false,

  // Legacy getters for backward compat
  get uh() { return this.state.playerHp; },
  set uh(v) { this.state.playerHp = v; },
  get mh() { return this.state.monsterHp; },
  set mh(v) { this.state.monsterHp = v; },

  el: {},
  _activeTimers: [],

  /* ---- Timer Management ---- */
  _setTimeout(fn, delay) {
    const id = setTimeout(() => {
      this._activeTimers = this._activeTimers.filter(t => t !== id);
      fn();
    }, delay);
    this._activeTimers.push(id);
    return id;
  },

  _clearAllTimers() {
    this._activeTimers.forEach(clearTimeout);
    this._activeTimers = [];
    clearTimeout(this._speechT); this._speechT = null;
    clearTimeout(this._dramT);   this._dramT   = null;
  },

  /* ---- init ---- */
  init(playerName, selectedChar) {
    window.AudioEngine?.unlock?.();
    this._clearAllTimers();

    const $ = id => document.getElementById(id);
    this.el = {
      playerBar:       $('player-health-bar'),
      playerHpText:    $('player-hp-text'),
      monsterBar:      $('monster-health-bar'),
      monsterHpText:   $('monster-hp-text'),
      playerName:      $('player-name-display'),
      playerNameText:  $('player-name-text'),
      monsterName:     $('monster-name-display'),
      monsterNameText: $('monster-name-text'),
      playerTurnDot:   $('player-turn-dot'),
      monsterTurnDot:  $('monster-turn-dot'),
      statusBar:       $('battle-status-bar'),
      btnRow:          $('battle-btn-row'),
      // Puppet canvases
      playerCanvas:    $('player-puppet-canvas'),
      monsterCanvas:   $('monster-puppet-canvas'),
      // Legacy sprite fallbacks
      player:          $('battle-player'),
      monster:         $('battle-monster'),
      playerSprite:    $('player-sprite'),
      monsterSprite:   $('monster-sprite'),
      combatFx:        $('combat-fx-layer'),
      speechBubble:    $('speech-bubble'),
      speechText:      $('speech-text'),
      dramText:        $('dramatic-text'),
      arenaInner:      $('battle-arena'),
      arena:           $('battle-page'),
      defeatWrap:      $('defeat-cinematic'),
      bloodCanvas:     $('blood-canvas'),
      victoryWrap:     $('victory-cinematic'),
      victoryCongrats: $('victory-congrats'),
    };

    BloodAnim.init(this.el.bloodCanvas);

    this.state.playerName  = playerName || window.App?.state?.username || 'Player';
    this.state.selectedChar = selectedChar || window.App?.state?.selectedChar || 'male';

    // Initialize puppet rigs if canvases available
    if (this.el.playerCanvas && this.el.monsterCanvas) {
      PuppetManager.init(this.el.playerCanvas, this.el.monsterCanvas, this.state.selectedChar);
    }

    this._setupButtons();
    this._resetGame();
  },

  /* ---- Sprite helpers (fallback when puppet canvas not available) ---- */
  _getSprites() {
    const char = this.state.selectedChar || 'male';
    const m = char === 'male';
    return {
      idle:         m ? 'assets/male-char.gif'    : 'assets/female-char.gif',
      punch:        m ? 'assets/male-punch.gif'   : 'assets/female-punch.gif',
      kick:         m ? 'assets/male-kick.gif'    : 'assets/female-kick.gif',
      hurt:         m ? 'assets/male-hurt.gif'    : 'assets/female-hurt.gif',
      victory:      m ? 'assets/male-victory.gif' : 'assets/female-victory.gif',
      monsterIdle:  'assets/monster.gif',
      monsterAttack:'assets/monster-attack.gif',
    };
  },

  /* ---- Button Setup ---- */
  _setupButtons() {
    const actionsEl = document.getElementById('battle-actions');
    if (actionsEl && !actionsEl._listenerAttached) {
      actionsEl._listenerAttached = true;
      actionsEl.addEventListener('click', e => {
        const btn = e.target.closest('.action-btn');
        if (!btn || this.state.busy || this.state.over) return;
        this._ripple(btn, e);
        this._playerMove(btn.dataset.action);
      });
    }

    if (!window._battleKeyAttached) {
      window._battleKeyAttached = true;
      window.addEventListener('keydown', e => {
        if (window.App?.currentPage !== 'battle-page') return;
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (this.state.busy || this.state.over) return;
        let action = null;
        if (e.key === 'a' || e.key === 'A' || e.key === '1') action = 'A';
        else if (e.key === 'b' || e.key === 'B' || e.key === '2') action = 'B';
        else if (e.key === 'c' || e.key === 'C' || e.key === '3') action = 'C';
        if (action) {
          e.preventDefault();
          const btn = document.querySelector(`.action-btn[data-action="${action}"]`);
          if (btn) this._ripple(btn);
          this._playerMove(action);
        }
      });
    }

    // Audio toggles
    document.querySelectorAll('.btn-toggle-music').forEach(btn => {
      if (!btn._listenerAttached) {
        btn._listenerAttached = true;
        btn.addEventListener('click', () => window.AudioEngine?.toggleMusic?.());
      }
    });
    document.querySelectorAll('.btn-toggle-sfx').forEach(btn => {
      if (!btn._listenerAttached) {
        btn._listenerAttached = true;
        btn.addEventListener('click', () => window.AudioEngine?.toggleSfx?.());
      }
    });

    this._btn('btn-victory-replay',      () => this._resetGame());
    this._btn('btn-victory-change-char', () => { this._hideVictory(); App.showPage('profile-page'); });
    this._btn('btn-defeat-retry',        () => this._resetGame());
    this._btn('btn-defeat-change-char',  () => { this._hideDefeat(); App.showPage('profile-page'); });
    this._btn('btn-battle-leave',        () => {
      this._clearAllTimers();
      PuppetManager.destroy();
      this.state.busy = false; this.state.over = true;
      this._hideDefeat(); this._hideVictory();
      App.showPage('profile-page');
    });
  },

  _btn(id, fn) {
    const el = document.getElementById(id);
    if (el && !el._listenerAttached) { el._listenerAttached = true; el.addEventListener('click', fn); }
  },

  /* ---- Reset Game ---- */
  _resetGame() {
    this._clearAllTimers();
    AnimationStateMachine.resetAll();
    this._matchRecorded = false;

    this.state.turnId++;
    this.state.playerHp = this.state.monsterHp = 100;
    this.state.busy = this.state.over = false;
    this.state.status = 'IDLE';

    if (this.el.arenaInner) this.el.arenaInner.classList.remove('zoom-to-eyes', 'camera-impact');
    if (this.el.arena) this.el.arena.classList.remove('battle-shake','heavy-screen-shake','violent-knockout-shake');

    if (this.el.combatFx) this.el.combatFx.innerHTML = '';
    document.querySelectorAll('.damage-number,.heal-particle,.victory-sparkle,.screen-impact-flash,.shockwave-ring-fx,.hit-burst-fx,.punch-shockwave,.kick-crescent-slash,.claw-scratch-mark').forEach(e => e.remove());

    if (this.el.player)  this.el.player.className  = 'battle-player';
    if (this.el.monster) this.el.monster.className  = 'battle-monster';

    const sp = this._getSprites();
    if (this.el.playerSprite)  this.el.playerSprite.src  = sp.idle;
    if (this.el.monsterSprite) this.el.monsterSprite.src = sp.monsterIdle;

    if (this.el.playerNameText) this.el.playerNameText.textContent = (this.state.playerName || 'PLAYER').toUpperCase();

    this._hideDefeat(); this._hideVictory();
    this._enableBtns(true);
    this._resetBars();
    this._setTurn('PLAYER');
    this._setStatus('YOUR TURN — CHOOSE YOUR MOVE', 'player');

    if (this.el.speechBubble) this.el.speechBubble.classList.remove('visible');
    if (this.el.dramText) this.el.dramText.className = 'dramatic-text';

    // Clean trash-talk opening taunt (no profanity)
    this._speech('Monster: Haha! You think YOU can challenge ME? Pathetic little rookie!', 5500);
    this._dramatic('FIGHT!', 1800);
  },

  _hideDefeat() {
    BloodAnim.stop();
    const pov = document.querySelector('.defeat-pov-monster');
    if (pov) pov.classList.add('anim-paused');
    if (this.el.defeatWrap) this.el.defeatWrap.className = 'defeat-cinematic';
    if (pov) pov.classList.remove('anim-paused');
  },

  _hideVictory() {
    if (this.el.victoryWrap) this.el.victoryWrap.className = 'victory-cinematic';
  },

  /* ---- Core Utilities ---- */
  _rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },

  _setStatus(text, type = 'neutral') {
    if (!this.el.statusBar) return;
    this.el.statusBar.textContent = text;
    this.el.statusBar.className = `battle-status-bar status-${type}`;
  },

  _setTurn(turn) {
    const isPlayer  = turn === 'PLAYER' || turn === 'IDLE';
    const isMonster = turn === 'MONSTER';
    this.el.playerName?.classList.toggle('is-turn', isPlayer);
    this.el.monsterName?.classList.toggle('is-turn', isMonster);
    this.el.btnRow?.classList.toggle('enemy-turn-active', isMonster);
  },

  _enableBtns(on, activeAction = null) {
    document.querySelectorAll('.action-btn').forEach(b => {
      b.classList.toggle('disabled', !on);
      b.disabled = !on;
      if (!on && activeAction && b.dataset.action === activeAction) b.classList.add('btn-busy');
      else b.classList.remove('btn-busy');
    });
    if (on) { this._setTurn('PLAYER'); this._setStatus('YOUR TURN — CHOOSE YOUR MOVE', 'player'); }
  },

  _hud() {
    const uh = Math.max(0, Math.min(100, Math.round(this.state.playerHp)));
    const mh = Math.max(0, Math.min(100, Math.round(this.state.monsterHp)));

    [['playerBar', 'playerHpText', uh], ['monsterBar', 'monsterHpText', mh]].forEach(([barK, txtK, hp]) => {
      const bar = this.el[barK];
      const txt = this.el[txtK];
      if (bar) {
        bar.style.width = `${hp}%`;
        bar.classList.remove('health-mid','health-low','health-zero');
        if      (hp === 0)  bar.classList.add('health-zero');
        else if (hp <= 25)  bar.classList.add('health-low');
        else if (hp <= 55)  bar.classList.add('health-mid');
      }
      if (txt) {
        txt.textContent = hp <= 25 && hp > 0 ? `${hp} / 100 [CRITICAL]` : `${hp} / 100`;
        txt.classList.toggle('critical-hp', hp <= 25 && hp > 0);
      }
    });
  },

  _resetBars() {
    [this.el.playerBar, this.el.monsterBar].forEach(bar => {
      if (!bar) return;
      bar.classList.add('no-transition');
      bar.classList.remove('health-mid','health-low','health-zero');
      bar.style.width = '100%';
      requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove('no-transition')));
    });
    if (this.el.playerHpText)  this.el.playerHpText.textContent  = '100 / 100';
    if (this.el.monsterHpText) this.el.monsterHpText.textContent = '100 / 100';
  },

  _speech(text, dur = 3000) {
    if (!this.el.speechBubble || !this.el.speechText) return;
    this.el.speechText.textContent = text;
    this.el.speechBubble.classList.add('visible');
    clearTimeout(this._speechT);
    this._speechT = setTimeout(() => this.el.speechBubble?.classList.remove('visible'), dur);
  },

  _dramatic(text, dur = 1400, win = false) {
    const el = this.el.dramText;
    if (!el) return;
    el.textContent = text;
    el.className = `dramatic-text${win ? ' win' : ''} visible`;
    clearTimeout(this._dramT);
    this._dramT = setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => { el.className = 'dramatic-text'; }, 500);
    }, dur);
  },

  _shake(level = 'normal') {
    const targets = [this.el.arena, this.el.arenaInner, document.getElementById('app')].filter(Boolean);
    const cls = level === 'violent' ? 'violent-knockout-shake' : (level === 'heavy' ? 'heavy-screen-shake' : 'battle-shake');
    const dur = level === 'violent' ? 1250 : (level === 'heavy' ? 750 : 420);

    targets.forEach(el => {
      el.classList.remove('battle-shake', 'heavy-screen-shake', 'violent-knockout-shake');
      void el.offsetWidth;
      el.classList.add(cls);
    });

    this._setTimeout(() => {
      targets.forEach(el => el.classList.remove('battle-shake', 'heavy-screen-shake', 'violent-knockout-shake'));
    }, dur);
  },

  _triggerHitStop(target, isHeavy = false) {
    if (!target) return;
    if (this.el.arenaInner) {
      this.el.arenaInner.classList.remove('camera-impact');
      void this.el.arenaInner.offsetWidth;
      this.el.arenaInner.classList.add('camera-impact');
      this._setTimeout(() => this.el.arenaInner?.classList.remove('camera-impact'), 380);
    }
    if (this.el.arena) {
      const flash = document.createElement('div');
      flash.className = 'screen-impact-flash';
      this.el.arena.appendChild(flash);
      this._setTimeout(() => flash.remove(), 320);
    }
    const ring = document.createElement('div');
    ring.className = 'shockwave-ring-fx';
    target.appendChild(ring);
    this._setTimeout(() => ring.remove(), 520);
  },

  _hitBurst(target, icon = '💥') {
    if (!target) return;
    const b = document.createElement('div');
    b.className = 'hit-burst-fx';
    b.textContent = icon;
    target.appendChild(b);
    this._setTimeout(() => b.remove(), 700);
  },

  _spawnPunchShockwave(target) {
    if (!target) return;
    const fx = document.createElement('div');
    fx.className = 'punch-shockwave';
    target.appendChild(fx);
    this._setTimeout(() => fx.remove(), 500);
  },

  _spawnKickCrescent(target) {
    if (!target) return;
    const fx = document.createElement('div');
    fx.className = 'kick-crescent-slash';
    target.appendChild(fx);
    this._setTimeout(() => fx.remove(), 550);
  },

  _spawnClawScratch(target) {
    if (!target) return;
    const fx = document.createElement('div');
    fx.className = 'claw-scratch-mark';
    fx.innerHTML = '<span></span>';
    target.appendChild(fx);
    this._setTimeout(() => fx.remove(), 600);
  },

  _dmgNum(amount, target, heal = false) {
    const el = document.createElement('div');
    el.className = `damage-number${heal ? ' heal' : ''}`;
    el.textContent = heal ? `+${amount}` : `-${amount}`;
    target.appendChild(el);
    this._setTimeout(() => el.remove(), 1300);
  },

  _healParticles() {
    const p = this.el.player;
    if (!p) return;
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement('div');
      dot.className = 'heal-particle';
      dot.style.left   = `${20 + Math.random() * 60}%`;
      dot.style.bottom = `${Math.random() * 60}%`;
      dot.style.animationDelay = `${Math.random() * 0.35}s`;
      p.appendChild(dot);
      this._setTimeout(() => dot.remove(), 1300);
    }
  },

  _ripple(btn, e) {
    const rip = document.createElement('span');
    rip.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const sz = Math.max(rect.width, rect.height);
    rip.style.cssText = `width:${sz}px;height:${sz}px;left:${(e?.clientX ?? rect.left + rect.width / 2) - rect.left - sz / 2}px;top:${(e?.clientY ?? rect.top + rect.height / 2) - rect.top - sz / 2}px`;
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 650);
  },

  /* ---- Player Move Pipeline ---- */
  _playerMove(move) {
    if (this.state.busy || this.state.over) return;
    this.state.busy = true;
    this.state.status = 'PLAYER_TURN';
    this._enableBtns(false, move);

    const sp   = this._getSprites();
    const turn = this.state.turnId;

    if (move === 'A') { // Fist: 1..40 dmg
      const dmg = this._rand(1, 40);
      window.SoundFX?.playFist?.();
      this._setStatus('EXECUTING PUNCH COMBO…', 'player');

      // Puppet: trigger punch animation (state machine handles auto-IDLE)
      AnimationStateMachine.playPlayerAnimation('PUNCH', 0.7);
      window.AnimationController?.playPunch?.(this.el.player, 650);

      // Fallback sprite
      if (this.el.playerSprite) this.el.playerSprite.src = sp.punch;
      this.el.player?.classList.add('anim-fist');

      this._setTimeout(() => {
        if (turn !== this.state.turnId || this.state.over) return;
        this.state.monsterHp = Math.max(0, this.state.monsterHp - dmg);
        this._hud();
        this._shake(dmg >= 30 ? 'heavy' : 'normal');
        this._triggerHitStop(this.el.monster, dmg >= 30);
        this._spawnPunchShockwave(this.el.monster);
        this._hitBurst(this.el.monster, dmg >= 30 ? '💥' : '👊');
        this._dmgNum(dmg, this.el.monster);
        this.el.monster?.classList.add('anim-hit');
        AnimationStateMachine.playMonsterAnimation('HIT', 0.5);
        if (dmg >= 30) this._dramatic(`CRITICAL PUNCH! −${dmg}`, 900);

        this._setTimeout(() => {
          if (turn !== this.state.turnId || this.state.over) return;
          if (this.el.playerSprite) this.el.playerSprite.src = sp.idle;
          this.el.player?.classList.remove('anim-fist');
          this.el.monster?.classList.remove('anim-hit');
          AnimationStateMachine.resetPlayerToIdle();
          AnimationStateMachine.resetMonsterToIdle();
          this._afterPlayer(turn);
        }, 620);
      }, 340);

    } else if (move === 'B') { // Kick: 20..30 dmg
      const dmg = this._rand(20, 30);
      window.SoundFX?.playKick?.();
      this._setStatus('EXECUTING KARATE KICK…', 'player');
      AnimationStateMachine.playPlayerAnimation('KICK', 0.75);
      window.AnimationController?.playKick?.(this.el.player, 650);

      if (this.el.playerSprite) this.el.playerSprite.src = sp.kick;
      this.el.player?.classList.add('anim-kick');

      this._setTimeout(() => {
        if (turn !== this.state.turnId || this.state.over) return;
        this.state.monsterHp = Math.max(0, this.state.monsterHp - dmg);
        this._hud();
        this._shake('heavy');
        this._triggerHitStop(this.el.monster, true);
        this._spawnKickCrescent(this.el.monster);
        this._hitBurst(this.el.monster, '🦶⚡');
        this._dmgNum(dmg, this.el.monster);
        this.el.monster?.classList.add('anim-hit');
        AnimationStateMachine.playMonsterAnimation('HIT', 0.5);

        this._setTimeout(() => {
          if (turn !== this.state.turnId || this.state.over) return;
          if (this.el.playerSprite) this.el.playerSprite.src = sp.idle;
          this.el.player?.classList.remove('anim-kick');
          this.el.monster?.classList.remove('anim-hit');
          AnimationStateMachine.resetPlayerToIdle();
          AnimationStateMachine.resetMonsterToIdle();
          this._afterPlayer(turn);
        }, 620);
      }, 340);

    } else if (move === 'C') { // Heal: +20..30 HP ≤ 100
      window.SoundFX?.playHeal?.();
      this._setStatus('RECOVERING HEALTH…', 'player');
      this.el.player?.classList.add('anim-heal');
      AnimationStateMachine.playPlayerAnimation('BLOCK', 0.9); // guard-like healing pose
      this._healParticles();
      const prev = this.state.playerHp;
      this.state.playerHp = Math.min(100, this.state.playerHp + this._rand(20, 30));
      this._hud();
      this._dmgNum(this.state.playerHp - prev, this.el.player, true);
      this._setTimeout(() => {
        if (turn !== this.state.turnId || this.state.over) return;
        this.el.player?.classList.remove('anim-heal');
        AnimationStateMachine.resetPlayerToIdle();
        this._afterPlayer(turn);
      }, 1100);
    }
  },

  _afterPlayer(turn) {
    if (turn !== this.state.turnId || this.state.over) return;
    if (this.state.playerHp > 100) this.state.playerHp = 100;
    if (this.state.monsterHp <= 0) {
      this.state.monsterHp = 0; this._hud();
      this._endBattle('VICTORY'); return;
    }
    this._setTurn('MONSTER');
    this._setStatus('MONSTER PREPARING COUNTER-ATTACK…', 'enemy');
    this._setTimeout(() => this._monsterTurn(turn), 720);
  },

  /* ---- Monster Turn ---- */
  _monsterTurn(turn) {
    if (turn !== this.state.turnId || this.state.over) return;
    this.state.status = 'MONSTER_TURN';
    this._setTurn('MONSTER');
    this._setStatus('ENEMY TURN — MONSTER ATTACKING!', 'enemy');

    // Clean trash-talk (no profanity)
    const taunts = [
      'Monster: Nice try, rookie! Your attacks are like a gentle breeze!',
      'Monster: Is that all you got? What a disappointment!',
      'Monster: Hahaha! A fool dares to challenge the beast!',
      'Monster: You call that a punch? My grandmother hits harder!',
      'Monster: PATHETIC! Prepare to feel real power!',
    ];
    this._speech(taunts[this._rand(0, taunts.length - 1)], 2800);

    this._setTimeout(() => {
      if (turn !== this.state.turnId || this.state.over) return;
      const sp = this._getSprites();
      if (this.el.monsterSprite) this.el.monsterSprite.src = sp.monsterAttack;
      this.el.monster?.classList.add('anim-attack');
      window.SoundFX?.playMonsterAttack?.();
      AnimationStateMachine.playMonsterAnimation('ATTACK', 0.8);
      window.AnimationController?.playMonsterAttack?.(this.el.monster, 700);

      this._setTimeout(() => {
        if (turn !== this.state.turnId || this.state.over) return;
        const dmg = this._rand(20, 40);
        this.state.playerHp = Math.max(0, this.state.playerHp - dmg);
        this._hud();
        this._shake('heavy');
        this._triggerHitStop(this.el.player, dmg >= 35);
        this._spawnClawScratch(this.el.player);
        this._hitBurst(this.el.player, '👹💥');
        this._dmgNum(dmg, this.el.player);
        if (this.el.playerSprite) this.el.playerSprite.src = sp.hurt;
        this.el.player?.classList.add('anim-hit');
        AnimationStateMachine.playPlayerAnimation('HIT', 0.5);
        if (dmg >= 35) this._dramatic('BRUTAL SMASH!', 900);

        this._setTimeout(() => {
          if (turn !== this.state.turnId || this.state.over) return;
          if (this.el.monsterSprite) this.el.monsterSprite.src = sp.monsterIdle;
          if (this.el.playerSprite)  this.el.playerSprite.src  = sp.idle;
          this.el.monster?.classList.remove('anim-attack');
          this.el.player?.classList.remove('anim-hit');
          AnimationStateMachine.resetPlayerToIdle();
          AnimationStateMachine.resetMonsterToIdle();

          if (this.state.playerHp <= 0) {
            this.state.playerHp = 0; this._hud();
            this._endBattle('DEFEAT');
          } else {
            this.state.busy = false; this.state.status = 'IDLE';
            this._enableBtns(true);
          }
        }, 620);
      }, 360);
    }, 620);
  },

  /* ---- Victory Sparkles ---- */
  _spawnVictorySparkles(outcomeId) {
    const p = this.el.player;
    if (!p) return;
    const icons = ['✨','⭐','🌟','🏆','🎉','💫'];
    for (let i = 0; i < 24; i++) {
      this._setTimeout(() => {
        if (this._outcomeId !== outcomeId) return;
        const sp = document.createElement('div');
        sp.className = 'victory-sparkle';
        sp.textContent = icons[Math.floor(Math.random() * icons.length)];
        sp.style.left   = `${10 + Math.random() * 80}%`;
        sp.style.bottom = `${20 + Math.random() * 60}%`;
        sp.style.setProperty('--tx', `${(Math.random() - 0.5) * 160}px`);
        sp.style.setProperty('--ty', `${-(40 + Math.random() * 100)}px`);
        p.appendChild(sp);
        this._setTimeout(() => sp.remove(), 1650);
      }, i * 120);
    }
  },

  /* ---- _endBattle (atomic, idempotent) ---- */
  _endBattle(outcome) {
    if (this.state.over) return;
    this.state.over  = true;
    this.state.busy  = true;
    this.state.status = outcome;
    this._outcomeId++;
    const outcomeId = this._outcomeId;

    this._enableBtns(false);
    this._clearAllTimers();

    // Record match result exactly once
    if (!this._matchRecorded && App?.state?.email) {
      this._matchRecorded = true;
      Auth.recordMatch(App.state.email, {
        player:   this.state.playerName,
        fighter:  this.state.selectedChar,
        opponent: 'Monster',
        result:   outcome
      });
      // Sync updated stats back to App.state
      const account = Auth.getUsers()[App.state.email] || {};
      App.state.wins        = account.wins       || 0;
      App.state.losses      = account.losses     || 0;
      App.state.totalGames  = account.totalGames || 0;
      App.state.lastFighter = this.state.selectedChar;
      App.saveState();
    }

    if (outcome === 'VICTORY') {
      this._setTurn('PLAYER');
      this._setStatus('VICTORY! THE BEAST IS DEFEATED!', 'player');
      this._runVictoryCinematic(outcomeId);
    } else {
      this._setTurn('MONSTER');
      this._setStatus('DEFEATED IN COMBAT', 'enemy');
      this._runDefeatCinematic(outcomeId);
    }
  },

  /* ---- VICTORY Cinematic ---- */
  _runVictoryCinematic(outcomeId) {
    if (this.el.monster) this.el.monster.classList.add('anim-smash-floor');
    this._shake('violent');
    if (this.el.monster) this._hitBurst(this.el.monster, '💥💥');
    window.SoundFX?.playMonsterCrash?.();

    // Clean victory speech
    this._speech('Monster: Impossible! A worthy warrior after all… well played, fool!', 5000);

    this._setTimeout(() => {
      if (this._outcomeId !== outcomeId) return;

      // Puppet: continuous victory dance and monster defeat fall
      AnimationStateMachine.playPlayerAnimation('VICTORY', 999, null); // 999 = loops indefinitely
      AnimationStateMachine.playMonsterAnimation('DEFEAT', 1.8);

      // Sprite fallback
      const sp = this._getSprites();
      if (this.el.playerSprite) this.el.playerSprite.src = sp.victory;
      this.el.player?.classList.add('anim-victory-dance');
      this._spawnVictorySparkles(outcomeId);
      window.SoundFX?.playVictoryFanfare?.();
      this._dramatic('VICTORY!', 3200, true);

      this._setTimeout(() => {
        if (this._outcomeId !== outcomeId) return;
        const win = this.el.victoryWrap;
        if (!win) return;
        this._hideDefeat();
        win.classList.add('active');
        requestAnimationFrame(() => requestAnimationFrame(() => win.classList.add('fade-in-black')));
        this._setTimeout(() => {
          if (this._outcomeId !== outcomeId) return;
          if (this.el.victoryCongrats) {
            this.el.victoryCongrats.textContent =
              `Outstanding, ${this.state.playerName}! The beast has been completely demolished!`;
          }
          win.classList.add('show-victory-content');
        }, 1900);
      }, 3400);
    }, 850);
  },

  /* ---- DEFEAT Cinematic (Puppet fall → Camera zoom → POV → Blood flow) ---- */
  _runDefeatCinematic(outcomeId) {
    // Puppet: physical defeat fall and monster victory
    AnimationStateMachine.playPlayerAnimation('DEFEAT', 1.8);
    AnimationStateMachine.playMonsterAnimation('VICTORY', 999); // loops indefinitely

    if (this.el.player) this.el.player.classList.add('anim-fall-ground');
    this._shake('violent');
    if (this.el.player) this._hitBurst(this.el.player, '💀💥');
    window.SoundFX?.playHeartbeat?.(0);
    window.SoundFX?.playHeartbeat?.(0.7);

    // Camera zooms in toward defeated player's eyes
    this._setTimeout(() => {
      if (this._outcomeId !== outcomeId) return;
      if (this.el.arenaInner) this.el.arenaInner.classList.add('zoom-to-eyes');
      window.SoundFX?.playHeartbeat?.(0);

      // Show defeat POV overlay
      this._setTimeout(() => {
        if (this._outcomeId !== outcomeId) return;
        const def = this.el.defeatWrap;
        if (!def) return;
        this._hideVictory();
        def.classList.add('active');
        requestAnimationFrame(() => requestAnimationFrame(() => def.classList.add('show-pov')));
        window.SoundFX?.playHeartbeat?.(0.3);

        // Blood starts flowing from top
        this._setTimeout(() => {
          if (this._outcomeId !== outcomeId) return;
          BloodAnim.start();

          // Screen fills with crimson
          this._setTimeout(() => {
            if (this._outcomeId !== outcomeId) return;
            def.classList.add('blood-filled');
            window.SoundFX?.playDoomChord?.();

            // Defeat title reveals
            this._setTimeout(() => {
              if (this._outcomeId !== outcomeId) return;
              def.classList.add('show-end-content');
            }, 1000);
          }, 1600);
        }, 900);
      }, 1700);
    }, 950);
  }
};

window.BattleEngine = BattleEngine;
