/**
 * google-backend.js — Google Sheets Integration for Login Data
 * Saves login credentials and game data to Google Sheets via Apps Script
 * 
 * Google Sheet: https://docs.google.com/spreadsheets/d/1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU/
 */
'use strict';

const GoogleBackend = {
  // Your Google Sheet ID
  SHEET_ID: '1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU',
  
  // Replace with your Google Apps Script webhook URL
  // Follow the guide in google-apps-script-setup.md to create this
  SHEET_WEBHOOK: 'https://script.google.com/macros/s/AKfycby_D3prhdRjzcVtQJGzO4ZdsEpZBJSTzCZm_X0uGjqf3fzSIFSUeNTuYeTrs_thYKU33g/exec',
  
  /**
   * Save login info to Google Sheets
   * @param {string} email - User email
   * @param {string} username - Display username
   * @param {string} timestamp - ISO timestamp
   */
  async saveLoginData(email, username, timestamp = new Date().toISOString()) {
    if (!email || !this.SHEET_WEBHOOK) return false;

    try {
      const payload = {
        action: 'saveLogin',
        email: String(email).trim(),
        username: String(username || '').trim(),
        timestamp: timestamp,
        platform: 'web'
      };

      const response = await fetch(this.SHEET_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      console.log('Google Sheets login request sent:', response.type);
      return true;
    } catch (err) {
      console.warn('⚠️ Google Sheets sync failed (non-critical):', err.message);
      console.warn('This usually means the Apps Script web app is not deployed, the URL is wrong, or the script has no doPost() handler.');
      return false;
    }
  },

  /**
   * Save game result to Google Sheets
   * @param {Object} gameData - Match result data
   */
  async saveGameResult(gameData) {
    if (!gameData || !this.SHEET_WEBHOOK) return false;

    try {
      const payload = {
        action: 'saveGame',
        email: String(gameData.email || '').trim(),
        username: String(gameData.username || '').trim(),
        character: String(gameData.character || '').trim(),
        result: gameData.result || 'UNKNOWN',
        finalPlayerHp: Number(gameData.finalPlayerHp || 0),
        finalMonsterHp: Number(gameData.finalMonsterHp || 0),
        timestamp: new Date().toISOString()
      };

      const response = await fetch(this.SHEET_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      console.log('Google Sheets game request sent:', response.type);
      return true;
    } catch (err) {
      console.warn('⚠️ Game result sync failed (non-critical):', err.message);
      return false;
    }
  }
};

window.GoogleBackend = GoogleBackend;

// Auto-save login on user authentication & auto-load Firebase backend
document.addEventListener('DOMContentLoaded', () => {
  // Dynamically load firebase-backend.js if not already present
  if (!window.FirebaseBackend && !document.querySelector('script[src*="firebase-backend.js"]')) {
    const s = document.createElement('script');
    s.src = 'js/firebase-backend.js';
    document.head.appendChild(s);
  }

  // Hook into App.showPage to detect login completion
  if (window.App) {
    const originalShowPage = window.App.showPage;
    window.App.showPage = function(pageId) {
      const result = originalShowPage.call(this, pageId);
      
      // When transitioning to profile or battle page, user has logged in
      if ((pageId === 'profile-page' || pageId === 'battle-page') && App.state.email) {
        GoogleBackend.saveLoginData(App.state.email, App.state.username);
        window.FirebaseBackend?.saveUser?.({ email: App.state.email, username: App.state.username });
      }
      
      return result;
    };
  }
});

