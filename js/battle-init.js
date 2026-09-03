/**
 * battle-init.js — Pre-Battle Character Selection & Initialization
 * Ensures user selects a fighter every time before entering the arena
 */
'use strict';

const BattleInit = {
  selectedCharForBattle: null,

  init() {
    const overlay = document.getElementById('battle-char-select-overlay');
    const cards = document.querySelectorAll('.battle-char-card');
    const startBtn = document.getElementById('btn-start-fight');

    if (!overlay || !startBtn) return;

    // Character selection
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedCharForBattle = card.dataset.char;
        startBtn.disabled = false;
      });
    });

    // Start fight button
    startBtn.addEventListener('click', () => {
      if (this.selectedCharForBattle) {
        App.state.selectedChar = this.selectedCharForBattle;
        App.saveState();
        this.hideCharSelect();
        // Initialize battle with selected character
        if (typeof BattleEngine !== 'undefined') {
          BattleEngine.init(App.state.username, this.selectedCharForBattle);
        }
      }
    });
  },

  show() {
    const overlay = document.getElementById('battle-char-select-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const currentChar = (window.App && (window.App.state.selectedChar || window.App.state.sex)) || null;
      this.selectedCharForBattle = currentChar;
      const startBtn = document.getElementById('btn-start-fight');
      if (startBtn) startBtn.disabled = !currentChar;
      // Sync selected card state
      document.querySelectorAll('.battle-char-card').forEach(c => {
        c.classList.toggle('selected', Boolean(currentChar && c.dataset.char === currentChar));
      });
    }
  },

  hideCharSelect() {
    const overlay = document.getElementById('battle-char-select-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  BattleInit.init();
});
