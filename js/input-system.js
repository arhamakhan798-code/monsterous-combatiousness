/**
 * input-system.js — Keyboard & Controller Input Management
 * 
 * Supports:
 * - Keyboard controls (A=Punch, B=Kick, C=Heal, Space=Pause)
 * - Gamepad/Controller (Buttons, D-Pad, Analog sticks)
 * - Touch gestures (swipes)
 * - Rebindable keys
 */

'use strict';

const InputSystem = {
  // Key bindings (can be remapped)
  keyBindings: {
    punch: 'KeyA',
    kick: 'KeyB',
    heal: 'KeyC',
    pause: 'Space',
    select: 'Enter',
    back: 'Escape'
  },
  
  // Controller button mappings
  // Standard Gamepad API button indices
  gamepadButtons: {
    0: 'punch',     // X button
    1: 'kick',      // O button
    2: 'heal',      // Square button
    3: 'special',   // Triangle button
    7: 'pause',     // Start
    6: 'back'       // Select
  },
  
  // Active key presses (for debouncing)
  activeKeys: new Set(),
  gamepadConnected: false,
  pollInterval: null,
  
  init() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    document.addEventListener('keyup', (e) => this._handleKeyUp(e));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => this._handleGamepadConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this._handleGamepadDisconnect(e));
    
    // Start polling gamepads (some browsers need this)
    this.startGamepadPolling();
    
    // Touch/swipe support
    this._setupTouchControls();
  },
  
  _handleKeyDown(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (window.App?.currentPage !== 'battle-page') return;
    if (this.activeKeys.has(e.code)) return;  // Debounce
    this.activeKeys.add(e.code);
    
    const action = Object.entries(this.keyBindings).find(
      ([_, key]) => key === e.code
    )?.[0];
    
    if (action) {
      e.preventDefault();
      this._executeAction(action);
    }
  },
  
  _handleKeyUp(e) {
    this.activeKeys.delete(e.code);
  },
  
  _handleGamepadConnect(e) {
    console.log(`[InputSystem] Gamepad connected: ${e.gamepad.id}`);
    this.gamepadConnected = true;
    this._showGamepadNotification('Gamepad Connected!');
  },
  
  _handleGamepadDisconnect(e) {
    console.log(`[InputSystem] Gamepad disconnected`);
    this.gamepadConnected = false;
    this._showGamepadNotification('Gamepad Disconnected!');
  },
  
  startGamepadPolling() {
    this.pollInterval = setInterval(() => {
      const gamepads = navigator.getGamepads?.() || [];
      
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp) continue;
        
        // Check buttons
        gp.buttons.forEach((button, idx) => {
          if (button.pressed) {
            const action = this.gamepadButtons[idx];
            if (action) this._executeAction(action);
          }
        });
        
        // Check D-pad (buttons 12-15)
        if (gp.buttons[12]?.pressed) this._executeAction('up');
        if (gp.buttons[13]?.pressed) this._executeAction('down');
        if (gp.buttons[14]?.pressed) this._executeAction('left');
        if (gp.buttons[15]?.pressed) this._executeAction('right');
      }
    }, 50);  // Poll at 20Hz
  },
  
  stopGamepadPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },
  
  _setupTouchControls() {
    // Optional: Add touch swipe gestures for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const threshold = 50;
      
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) this._executeAction('swipe-right');  // Kick
        else this._executeAction('swipe-left');              // Punch
      } else if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) this._executeAction('swipe-down');   // Heal
        else this._executeAction('swipe-up');                // Punch
      }
    });
  },
  
  _executeAction(action) {
    // Dispatch custom events that the game can listen to
    const event = new CustomEvent('game-action', {
      detail: { action: action }
    });
    document.dispatchEvent(event);
    
    // Also handle direct calls
    switch (action) {
      case 'punch':
      case 'swipe-left':
      case 'swipe-up':
        if (window.BattleEngine?._playerMove) {
          window.BattleEngine._playerMove('A');
        }
        break;
        
      case 'kick':
      case 'swipe-right':
        if (window.BattleEngine?._playerMove) {
          window.BattleEngine._playerMove('B');
        }
        break;
        
      case 'heal':
      case 'swipe-down':
        if (window.BattleEngine?._playerMove) {
          window.BattleEngine._playerMove('C');
        }
        break;
        
      case 'pause':
        if (window.BattleEngine?.togglePause) {
          window.BattleEngine.togglePause();
        }
        break;
        
      case 'select':
      case 'enter':
        // Handle navigation/menu selection
        document.querySelector('.action-btn:not(.disabled)')?.click();
        break;
        
      case 'back':
      case 'escape':
        // Handle back navigation
        document.querySelector('.btn-back')?.click() || 
        document.querySelector('[data-action="back"]')?.click();
        break;
    }
  },
  
  _showGamepadNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'gamepad-notification';
    notification.textContent = `🎮 ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 2000);
  },
  
  remapKey(action, newKeyCode) {
    if (this.keyBindings.hasOwnProperty(action)) {
      this.keyBindings[action] = newKeyCode;
      console.log(`[InputSystem] Remapped ${action} to ${newKeyCode}`);
    }
  },
  
  getControlsDisplay() {
    return `
      <div class="controls-display">
        <h3>Controls</h3>
        <div class="controls-list">
          <p><strong>Keyboard:</strong></p>
          <ul>
            <li>${this.keyBindings.punch} - Punch</li>
            <li>${this.keyBindings.kick} - Kick</li>
            <li>${this.keyBindings.heal} - Heal</li>
            <li>${this.keyBindings.pause} - Pause</li>
          </ul>
          <p><strong>Gamepad:</strong></p>
          <ul>
            <li>X - Punch</li>
            <li>O - Kick</li>
            <li>Square - Heal</li>
            <li>Start - Pause</li>
          </ul>
          <p><strong>Mobile:</strong></p>
          <ul>
            <li>Swipe Left - Punch</li>
            <li>Swipe Right - Kick</li>
            <li>Swipe Down - Heal</li>
          </ul>
        </div>
      </div>
    `;
  }
};

// Listen for game actions
document.addEventListener('game-action', (e) => {
  console.log(`[InputSystem] Action: ${e.detail.action}`);
});

window.InputSystem = InputSystem;
