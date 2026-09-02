/**
 * auth.js — Secure Authentication, SHA-256 Hashing & Google Sheets Storage
 *
 * Implements:
 *  - Client-side SHA-256 password hashing (Web Crypto API)
 *  - Google Sheets Apps Script API integration with robust offline local storage cache
 *  - Acceptance of any valid email format without verification blockers
 *  - Full account persistence across logout/login and page reloads
 *  - Atomic match history recording and win/loss/total game stats tracking
 */

'use strict';

const Auth = {
  // Optional Google Apps Script Endpoint for Google Sheets integration
  SHEETS_ENDPOINT: window.GOOGLE_SHEETS_ENDPOINT || '',

  /**
   * Compute SHA-256 hash of a string using Web Crypto API
   */
  async hashPassword(password) {
    if (!password) return '';
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      // Fallback simple deterministic hash if Web Crypto is unavailable
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return 'fallback_' + Math.abs(hash).toString(16);
    }
  },

  /**
   * Validate email format (RFC standard regex)
   */
  isValidEmail(email) {
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return EMAIL_REGEX.test(String(email || '').trim());
  },

  /**
   * Load all users from persistent storage
   */
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem('mc_accounts') || '{}');
    } catch (e) {
      return {};
    }
  },

  /**
   * Save all users to persistent storage
   */
  saveUsers(users) {
    try {
      localStorage.setItem('mc_accounts', JSON.stringify(users));
    } catch (e) {}
  },

  /**
   * Register a new user account
   */
  async register(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. warrior@arena.com).');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    const users = this.getUsers();
    if (users[cleanEmail]) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const passwordHash = await this.hashPassword(password);
    const newAccount = {
      email: cleanEmail,
      passwordHash: passwordHash,
      username: '',
      age: 0,
      avatar: 'skull', // default profile avatar icon
      wins: 0,
      losses: 0,
      totalGames: 0,
      history: [],
      createdAt: Date.now()
    };

    users[cleanEmail] = newAccount;
    this.saveUsers(users);

    // Sync to Google Sheets if endpoint configured
    this._syncToGoogleSheets('register', newAccount);

    return newAccount;
  },

  /**
   * Authenticate and sign in user
   */
  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const users = this.getUsers();
    const account = users[cleanEmail];
    if (!account) {
      throw new Error('No account found for this email. Create an account first!');
    }

    const passwordHash = await this.hashPassword(password);
    if (account.passwordHash !== passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Sync from Google Sheets if endpoint configured
    this._syncFromGoogleSheets(cleanEmail);

    return account;
  },

  /**
   * Update user profile information (Name, Age, Avatar)
   */
  updateProfile(email, profileData) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const users = this.getUsers();
    const account = users[cleanEmail];
    if (!account) return null;

    if (profileData.username !== undefined) account.username = String(profileData.username).trim();
    if (profileData.age !== undefined) account.age = Number(profileData.age) || 0;
    if (profileData.avatar !== undefined) account.avatar = profileData.avatar;

    users[cleanEmail] = account;
    this.saveUsers(users);

    this._syncToGoogleSheets('updateProfile', account);
    return account;
  },

  /**
   * Record match outcome atomically and update statistics
   */
  recordMatch(email, matchRecord) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const users = this.getUsers();
    const account = users[cleanEmail];
    if (!account) return;

    if (!Array.isArray(account.history)) account.history = [];

    // Guard against duplicate match records within 2 seconds
    const now = Date.now();
    const lastRecord = account.history[account.history.length - 1];
    if (lastRecord && (now - lastRecord.timestamp < 2000) && lastRecord.result === matchRecord.result) {
      return; // duplicate match end guard
    }

    const entry = {
      player: matchRecord.player || account.username || 'Warrior',
      fighter: matchRecord.fighter || 'male',
      opponent: matchRecord.opponent || 'Monster',
      result: matchRecord.result, // 'VICTORY' | 'DEFEAT'
      timestamp: now,
      dateStr: new Date(now).toLocaleDateString() + ' ' + new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    account.history.push(entry);
    account.totalGames = (account.totalGames || 0) + 1;
    if (matchRecord.result === 'VICTORY') {
      account.wins = (account.wins || 0) + 1;
    } else {
      account.losses = (account.losses || 0) + 1;
    }

    users[cleanEmail] = account;
    this.saveUsers(users);

    this._syncToGoogleSheets('recordMatch', { email: cleanEmail, match: entry, wins: account.wins, losses: account.losses, totalGames: account.totalGames });
  },

  /* ------------------------------------------------------------------
     Google Sheets Integration Client (with silent error resilience)
  ------------------------------------------------------------------ */
  async _syncToGoogleSheets(action, payload) {
    if (!this.SHEETS_ENDPOINT) return;
    try {
      await fetch(this.SHEETS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: payload }),
        mode: 'no-cors'
      });
    } catch (err) {
      console.warn('[Google Sheets Sync Notice] Operating in offline mode:', err.message);
    }
  },

  async _syncFromGoogleSheets(email) {
    if (!this.SHEETS_ENDPOINT) return;
    try {
      const resp = await fetch(`${this.SHEETS_ENDPOINT}?action=getAccount&email=${encodeURIComponent(email)}`);
      if (resp.ok) {
        const remoteData = await resp.json();
        if (remoteData && remoteData.email) {
          const users = this.getUsers();
          users[email] = Object.assign(users[email] || {}, remoteData);
          this.saveUsers(users);
        }
      }
    } catch (e) {}
  }
};

window.Auth = Auth;
