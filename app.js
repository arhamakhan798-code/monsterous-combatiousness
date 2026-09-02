/**
 * app.js — Page Router & Global State Management
 * Single source of truth for user session state.
 */
'use strict';

const App = {
  currentPage: 'landing-page',

  state: {
    isLoggedIn: false,
    email: '',
    username: '',
    age: 0,
    avatar: 'skull',
    selectedChar: null, // 'male' | 'female' — FIGHTER, not profile avatar
    wins: 0,
    losses: 0,
    totalGames: 0,
    lastFighter: null,
  },

  showPage(pageId) {
    // Redirect logged-in users away from login
    if (pageId === 'login-page' && this.state.isLoggedIn) {
      pageId = this._hasFullProfile() ? 'battle-page' : 'profile-page';
    }

    // Auth guard
    if ((pageId === 'profile-page' || pageId === 'battle-page') && !this.state.isLoggedIn) {
      pageId = 'login-page';
      this._flashError('login-error', '🔒 Login required to enter the arena.');
    }

    // Profile guard
    if (pageId === 'battle-page' && !this._hasFullProfile()) {
      pageId = 'profile-page';
      this._flashError('profile-error', '⚠️ Complete your profile and choose a fighter first.');
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById(pageId);
    if (target) {
      requestAnimationFrame(() => {
        target.classList.add('active');
        this.currentPage = pageId;

        if (pageId === 'profile-page' && window.Profile?.syncUI) {
          window.Profile.syncUI();
        }

        if (pageId === 'battle-page' && typeof BattleEngine !== 'undefined') {
          BattleEngine.init(this.state.username, this.state.selectedChar);
        }

        // Play appropriate pleasing theme music per page
        if (window.AudioEngine?.musicEnabled || !window.MusicSystem?.isMuted) {
          if (pageId === 'battle-page') {
            window.MusicSystem?.playBattleTheme?.();
          } else if (pageId === 'landing-page') {
            window.MusicSystem?.playLandingTheme?.();
          } else {
            window.MusicSystem?.playSelectionTheme?.();
          }
        }
      });
    }
  },

  _hasFullProfile() {
    return (
      this.state.username?.trim().length > 0 &&
      Number(this.state.age) >= 1 &&
      (this.state.selectedChar === 'male' || this.state.selectedChar === 'female')
    );
  },

  _flashError(id, msg) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.add('visible');
      setTimeout(() => el.classList.remove('visible'), 5000);
    }, 250);
  },

  saveState() {
    try {
      localStorage.setItem('mc_state', JSON.stringify(this.state));
    } catch (e) {}
  },

  loadState() {
    try {
      const saved = localStorage.getItem('mc_state');
      if (saved) Object.assign(this.state, JSON.parse(saved));
    } catch (e) {}
  },

  clearState() {
    this.state = {
      isLoggedIn: false,
      email: '', username: '', age: 0, avatar: 'skull',
      selectedChar: null, wins: 0, losses: 0, totalGames: 0, lastFighter: null,
    };
    try { localStorage.removeItem('mc_state'); } catch (e) {}
  },

  notify(msg, type = 'info', dur = 4000) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `app-toast toast-${type} visible`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('visible'), dur);
  },

  init() {
    this.loadState();
    window.addEventListener('error', e => console.error('[App Error]', e.message));
    this.showPage('landing-page');
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
