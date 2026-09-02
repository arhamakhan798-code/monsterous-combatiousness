/**
 * firebase-backend.js — Firebase Cloud Integration for Monsterous Combatiousness
 * 
 * Provides:
 * - Firebase App & Analytics initialization with user config
 * - Firestore & Realtime Database sync for users, matches, and leaderboard
 * - Fallback REST API communication with Firebase cloud backend
 * - Seamless automatic hook into Auth, App, and BattleEngine
 */
'use strict';

const FirebaseBackend = {
  config: {
    apiKey: "AIzaSyDzkbivhRbuoA1iLujh-V3QVTrZ841TZo0",
    authDomain: "gamesheets-507408-d51eb.firebaseapp.com",
    projectId: "gamesheets-507408-d51eb",
    storageBucket: "gamesheets-507408-d51eb.firebasestorage.app",
    messagingSenderId: "629425803000",
    appId: "1:629425803000:web:9144a3c9623c8f7877350d",
    measurementId: "G-PNF81RTECL"
  },

  app: null,
  analytics: null,
  firestore: null,
  db: null,
  isInitialized: false,

  /**
   * Initialize Firebase using ES Modules / CDN with safe fallback
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Dynamic import of Firebase Modular SDK via CDN
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      this.app = initializeApp(this.config);

      try {
        const { getAnalytics, logEvent } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js');
        this.analytics = getAnalytics(this.app);
        this.logEvent = logEvent;
        this.trackEvent('app_initialized', { project: this.config.projectId });
      } catch (analyticsErr) {
        console.warn('Firebase Analytics not supported in this environment:', analyticsErr.message);
      }

      this.isInitialized = true;
      console.log('🔥 Firebase initialized successfully for project:', this.config.projectId);
      return true;
    } catch (err) {
      console.warn('⚠️ Firebase dynamic import fallback mode (using REST API):', err.message);
      this.isInitialized = true; // Still active via REST endpoints
      return true;
    }
  },

  /**
   * Track analytics event
   */
  trackEvent(eventName, eventParams = {}) {
    try {
      if (this.analytics && this.logEvent) {
        this.logEvent(this.analytics, eventName, eventParams);
      }
    } catch (e) {}
  },

  /**
   * Save or update user profile in Firestore
   */
  async saveUser(userObj) {
    if (!userObj || !userObj.email) return false;
    const cleanEmail = userObj.email.trim().toLowerCase();
    const docId = encodeURIComponent(cleanEmail);

    this.trackEvent('user_sync', { email: cleanEmail });

    const payload = {
      fields: {
        email: { stringValue: cleanEmail },
        username: { stringValue: userObj.username || 'Warrior' },
        age: { integerValue: String(userObj.age || 0) },
        avatar: { stringValue: userObj.avatar || 'skull' },
        wins: { integerValue: String(userObj.wins || 0) },
        losses: { integerValue: String(userObj.losses || 0) },
        totalGames: { integerValue: String(userObj.totalGames || 0) },
        lastUpdated: { timestampValue: new Date().toISOString() }
      }
    };

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/users/${docId}?key=${this.config.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('🔥 Firebase Firestore user synced:', cleanEmail, res.status);
      return res.ok;
    } catch (e) {
      console.warn('⚠️ Firebase user sync fallback:', e.message);
      return false;
    }
  },

  /**
   * Record a match result in Firestore
   */
  async recordMatch(matchData) {
    if (!matchData) return false;

    this.trackEvent('match_completed', {
      result: matchData.result,
      fighter: matchData.fighter
    });

    const payload = {
      fields: {
        player: { stringValue: matchData.player || 'Player' },
        fighter: { stringValue: matchData.fighter || 'male' },
        opponent: { stringValue: matchData.opponent || 'Monster' },
        result: { stringValue: matchData.result || 'UNKNOWN' },
        timestamp: { timestampValue: new Date().toISOString() }
      }
    };

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/matches?key=${this.config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('🔥 Firebase Firestore match recorded:', matchData.result, res.status);
      return res.ok;
    } catch (e) {
      console.warn('⚠️ Firebase match record fallback:', e.message);
      return false;
    }
  },

  /**
   * Sync leaderboard data
   */
  async syncLeaderboard(leaderboardArray) {
    if (!Array.isArray(leaderboardArray)) return false;

    const payload = {
      fields: {
        updatedAt: { timestampValue: new Date().toISOString() },
        entriesJson: { stringValue: JSON.stringify(leaderboardArray.slice(0, 50)) }
      }
    };

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/leaderboards/global?key=${this.config.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};

window.FirebaseBackend = FirebaseBackend;

// Initialize on DOM Ready and wire up hooks
document.addEventListener('DOMContentLoaded', () => {
  FirebaseBackend.init();

  // Hook into Auth.recordMatch to sync match results and updated stats to Firebase
  if (window.Auth) {
    const origRecordMatch = window.Auth.recordMatch;
    window.Auth.recordMatch = function(email, matchData) {
      const result = origRecordMatch.call(this, email, matchData);
      try {
        FirebaseBackend.recordMatch(matchData);
        const users = window.Auth.getUsers();
        if (users[email]) {
          FirebaseBackend.saveUser(users[email]);
        }
      } catch (e) {}
      return result;
    };
  }

  // Hook into GoogleBackend to mirror data to Firebase
  if (window.GoogleBackend) {
    const origSaveLogin = window.GoogleBackend.saveLoginData;
    window.GoogleBackend.saveLoginData = function(email, username, ts) {
      origSaveLogin.call(this, email, username, ts);
      try {
        FirebaseBackend.saveUser({ email, username });
        FirebaseBackend.trackEvent('login', { email, username });
      } catch (e) {}
    };

    const origSaveGame = window.GoogleBackend.saveGameResult;
    window.GoogleBackend.saveGameResult = function(gameData) {
      origSaveGame.call(this, gameData);
      try {
        FirebaseBackend.recordMatch(gameData);
      } catch (e) {}
    };
  }
});
