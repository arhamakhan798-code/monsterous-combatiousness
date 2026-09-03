/**
 * battle-init.js — Battle Initialization
 * Initializes the BattleEngine when the battle page is shown.
 * Character is already selected on the char-select-page before entering here.
 */
'use strict';

const BattleInit = {
  selectedCharForBattle: null,

  /**
   * Called when #battle-page becomes visible.
   * Reads the character from App.state and starts BattleEngine.
   */
  startBattle() {
    const selectedChar = (window.App && window.App.state.selectedChar) || 'male';
    const username = (window.App && window.App.state.username) || 'Player';

    this.selectedCharForBattle = selectedChar;

    // Hide the start-fight button — we auto-start
    const startBtn = document.getElementById('btn-start-fight');
    if (startBtn) startBtn.style.display = 'none';

    // Initialize BattleEngine
    if (typeof BattleEngine !== 'undefined') {
      BattleEngine.init(username, selectedChar);
    } else {
      console.error('BattleEngine not found!');
    }
  },

  // Legacy stubs — kept for compatibility
  init() {},
  show() { this.startBattle(); },
  hideCharSelect() {}
};

window.BattleInit = BattleInit;

// Wire up on DOMContentLoaded (legacy: do nothing now, startBattle called by App.showPage)
document.addEventListener('DOMContentLoaded', () => {
  // No-op: BattleInit.startBattle() is called by App.showPage('battle-page')
});
