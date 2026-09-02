/**
 * combat-ui.js — Enhanced Combat Interface
 * 
 * Adds:
 * - Combo counter
 * - Special meter (charged by attacks)
 * - Critical hit feedback
 * - Damage numbers with color coding
 * - Animation feedback system
 */

'use strict';

const CombatUI = {
  playerCombo: 0,
  playerSpecialMeter: 0,
  monsterCombo: 0,
  monsterSpecialMeter: 0,
  maxSpecialMeter: 100,
  
  init() {
    // Initialize combo displays if they don't exist
    this._ensureElements();
  },
  
  _ensureElements() {
    // Combo display for player
    if (!document.getElementById('player-combo-display')) {
      const display = document.createElement('div');
      display.id = 'player-combo-display';
      display.className = 'combo-display';
      display.innerHTML = '<span class="combo-text">0 HIT COMBO</span>';
      document.querySelector('.battle-player')?.appendChild(display);
    }
    
    // Special meter for player
    if (!document.getElementById('player-special-meter')) {
      const meter = document.createElement('div');
      meter.id = 'player-special-meter';
      meter.className = 'special-meter';
      meter.innerHTML = '<div class="special-bar"><div class="special-fill" style="width: 0%"></div></div><span>SPECIAL</span>';
      document.querySelector('.health-bar-container')?.appendChild(meter);
    }
    
    // Combo display for monster
    if (!document.getElementById('monster-combo-display')) {
      const display = document.createElement('div');
      display.id = 'monster-combo-display';
      display.className = 'combo-display';
      display.innerHTML = '<span class="combo-text">0 HIT COMBO</span>';
      document.querySelector('.battle-monster')?.appendChild(display);
    }
    
    // Special meter for monster
    if (!document.getElementById('monster-special-meter')) {
      const meter = document.createElement('div');
      meter.id = 'monster-special-meter';
      meter.className = 'special-meter';
      meter.innerHTML = '<div class="special-bar"><div class="special-fill" style="width: 0%"></div></div><span>SPECIAL</span>';
      document.querySelectorAll('.health-bar-container')[1]?.appendChild(meter);
    }
  },
  
  addPlayerCombo() {
    this.playerCombo++;
    this.playerSpecialMeter = Math.min(this.maxSpecialMeter, this.playerSpecialMeter + 8);
    this.updateComboDisplay();
    this.updateSpecialMeter();
    
    // Visual feedback
    this._showComboFeedback('.battle-player', this.playerCombo);
  },
  
  addMonsterCombo() {
    this.monsterCombo++;
    this.monsterSpecialMeter = Math.min(this.maxSpecialMeter, this.monsterSpecialMeter + 8);
    this.updateComboDisplay();
    this.updateSpecialMeter();
    
    // Visual feedback
    this._showComboFeedback('.battle-monster', this.monsterCombo);
  },
  
  resetPlayerCombo() {
    this.playerCombo = 0;
    this.updateComboDisplay();
  },
  
  resetMonsterCombo() {
    this.monsterCombo = 0;
    this.updateComboDisplay();
  },
  
  resetAllCombos() {
    this.playerCombo = 0;
    this.monsterCombo = 0;
    this.playerSpecialMeter = 0;
    this.monsterSpecialMeter = 0;
    this.updateComboDisplay();
    this.updateSpecialMeter();
  },
  
  updateComboDisplay() {
    const playerDisplay = document.getElementById('player-combo-display');
    if (playerDisplay && this.playerCombo > 0) {
      playerDisplay.querySelector('.combo-text').textContent = `${this.playerCombo} HIT COMBO`;
      playerDisplay.classList.add('active');
    } else if (playerDisplay) {
      playerDisplay.classList.remove('active');
    }
    
    const monsterDisplay = document.getElementById('monster-combo-display');
    if (monsterDisplay && this.monsterCombo > 0) {
      monsterDisplay.querySelector('.combo-text').textContent = `${this.monsterCombo} HIT COMBO`;
      monsterDisplay.classList.add('active');
    } else if (monsterDisplay) {
      monsterDisplay.classList.remove('active');
    }
  },
  
  updateSpecialMeter() {
    const playerMeterFill = document.querySelector('#player-special-meter .special-fill');
    if (playerMeterFill) {
      const width = (this.playerSpecialMeter / this.maxSpecialMeter) * 100;
      playerMeterFill.style.width = `${width}%`;
      if (this.playerSpecialMeter >= this.maxSpecialMeter) {
        playerMeterFill.classList.add('full');
      } else {
        playerMeterFill.classList.remove('full');
      }
    }
    
    const monsterMeterFill = document.querySelector('#monster-special-meter .special-fill');
    if (monsterMeterFill) {
      const width = (this.monsterSpecialMeter / this.maxSpecialMeter) * 100;
      monsterMeterFill.style.width = `${width}%`;
      if (this.monsterSpecialMeter >= this.maxSpecialMeter) {
        monsterMeterFill.classList.add('full');
      } else {
        monsterMeterFill.classList.remove('full');
      }
    }
  },
  
  usePlayerSpecial() {
    if (this.playerSpecialMeter >= this.maxSpecialMeter) {
      this.playerSpecialMeter = 0;
      this.updateSpecialMeter();
      return true;
    }
    return false;
  },
  
  useMonsterSpecial() {
    if (this.monsterSpecialMeter >= this.maxSpecialMeter) {
      this.monsterSpecialMeter = 0;
      this.updateSpecialMeter();
      return true;
    }
    return false;
  },
  
  _showComboFeedback(selector, comboCount) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    // Add combo flash
    element.classList.add('combo-flash');
    setTimeout(() => element.classList.remove('combo-flash'), 300);
    
    // Show combo milestone effects
    if (comboCount % 5 === 0 && comboCount > 0) {
      this._showMilestoneEffect(selector, comboCount);
    }
  },
  
  _showMilestoneEffect(selector, comboCount) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const milestone = document.createElement('div');
    milestone.className = 'combo-milestone';
    milestone.textContent = `${comboCount}x COMBO!`;
    element.appendChild(milestone);
    
    setTimeout(() => milestone.remove(), 1200);
  },
  
  showCriticalHit(target = 'monster') {
    const display = document.createElement('div');
    display.className = 'critical-effect';
    display.textContent = 'CRITICAL HIT!';
    
    const element = document.querySelector(target === 'player' ? '.battle-player' : '.battle-monster');
    if (element) {
      element.appendChild(display);
      setTimeout(() => display.remove(), 1000);
    }
  },
  
  showSpecialCast(target = 'player', specialName = 'SPECIAL') {
    const display = document.createElement('div');
    display.className = 'special-cast';
    display.textContent = specialName;
    
    const element = document.querySelector(target === 'player' ? '.battle-player' : '.battle-monster');
    if (element) {
      element.appendChild(display);
      setTimeout(() => display.remove(), 1200);
    }
  }
};

window.CombatUI = CombatUI;
