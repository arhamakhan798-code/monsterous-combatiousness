/**
 * animation-controller.js — Smooth Character Animations
 * Provides smooth, natural-looking character animations with proper timing
 * Includes: breathing, running attacks, victory celebrations, defeat falls
 */
'use strict';

const AnimationController = {
  playerAnimState: 'idle',
  monsterAnimState: 'idle',
  breathingIntervals: {},
  
  /**
   * Start idle breathing animation (continuous)
   */
  startBreathing(element, isMonster = false) {
    if (!element) return;
    
    const key = isMonster ? 'monster-breathing' : 'player-breathing';
    
    // Clear existing breathing
    if (this.breathingIntervals[key]) {
      clearInterval(this.breathingIntervals[key]);
    }
    
    // Add breathing class for continuous animation
    element.classList.add('breathing-idle');
    
    // Breathing pulse effect (in and out)
    let cycle = 0;
    this.breathingIntervals[key] = setInterval(() => {
      cycle = (cycle + 1) % 4;
      element.style.opacity = 0.95 + (Math.sin(cycle * Math.PI / 2) * 0.05);
    }, 500);
  },

  /**
   * Stop breathing animation
   */
  stopBreathing(element, isMonster = false) {
    const key = isMonster ? 'monster-breathing' : 'player-breathing';
    if (this.breathingIntervals[key]) {
      clearInterval(this.breathingIntervals[key]);
      delete this.breathingIntervals[key];
    }
    if (element) {
      element.classList.remove('breathing-idle');
      element.style.opacity = '1';
    }
  },

  /**
   * Running charge attack animation
   */
  playRunningAttack(element, duration = 600, isKick = false) {
    if (!element) return;
    
    element.classList.remove('anim-heal', 'anim-hit');
    element.classList.add(isKick ? 'anim-kick' : 'anim-fist');
    
    element.style.animation = 'none';
    setTimeout(() => {
      const animName = isKick ? 'runningKick' : 'runningPunch';
      element.style.animation = `${animName} ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
    }, 10);
    
    setTimeout(() => {
      element.classList.remove('anim-fist', 'anim-kick');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play running punch animation on character (runs forward to strike monster)
   */
  playPunch(element, duration = 650) {
    if (!element) return;
    
    element.classList.remove('anim-kick', 'anim-heal', 'anim-hit');
    element.classList.add('anim-fist');
    
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = `fistAttack ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    }, 10);
    
    setTimeout(() => {
      element.classList.remove('anim-fist');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play running kick animation on character (charges forward to kick monster)
   */
  playKick(element, duration = 650) {
    if (!element) return;
    
    element.classList.remove('anim-fist', 'anim-heal', 'anim-hit');
    element.classList.add('anim-kick');
    
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = `kickAttack ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    }, 10);
    
    setTimeout(() => {
      element.classList.remove('anim-kick');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play monster lunging claw attack
   */
  playMonsterAttack(element, duration = 700) {
    if (!element) return;
    element.classList.remove('anim-hit');
    element.classList.add('anim-attack');

    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = `monsterAttack ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    }, 10);

    setTimeout(() => {
      element.classList.remove('anim-attack');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play heal animation on character
   */
  playHeal(element, duration = 600) {
    if (!element) return;
    
    element.classList.remove('anim-fist', 'anim-kick', 'anim-hit');
    element.classList.add('anim-heal');
    
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = `healGlow ${duration}ms ease-in-out forwards`;
    }, 10);
    
    setTimeout(() => {
      element.classList.remove('anim-heal');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play hit/recoil animation on character
   */
  playHit(element, duration = 200) {
    if (!element) return;
    
    element.classList.add('anim-hit');
    
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = `takeHit ${duration}ms ease-out forwards`;
    }, 10);
    
    setTimeout(() => {
      element.classList.remove('anim-hit');
      element.style.animation = 'none';
    }, duration);
  },

  /**
   * Play idle breathing animation
   */
  playIdle(element, isMonster = false) {
    if (!element) return;
    element.classList.remove('anim-fist', 'anim-kick', 'anim-heal', 'anim-hit');
    element.style.animation = 'none';
    this.startBreathing(element, isMonster);
  },

  /**
   * Play victory dance/twerk (continuous and provocative)
   */
  playVictoryDance(element) {
    if (!element) return;
    this.stopBreathing(element);
    element.classList.remove('anim-fist', 'anim-kick', 'anim-heal', 'anim-hit', 'breathing-idle');
    element.classList.add('victory-dance');
    element.style.animation = 'victoryTwerk 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite';
  },

  /**
   * Stop all animations and return to idle
   */
  stopAll(element, isMonster = false) {
    if (!element) return;
    this.stopBreathing(element, isMonster);
    element.classList.remove('anim-fist', 'anim-kick', 'anim-heal', 'anim-hit', 'victory-dance', 'breathing-idle');
    element.style.animation = 'none';
  }
};

window.AnimationController = AnimationController;

// Add comprehensive animation CSS
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('style[data-animation-controller]')) {
    const style = document.createElement('style');
    style.setAttribute('data-animation-controller', '');
    style.textContent = `
      /* === BREATHING IDLE ANIMATION === */
      @keyframes breathing {
        0%, 100% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.02) translateY(-2px); }
      }

      .breathing-idle {
        animation: breathing 3s ease-in-out infinite !important;
      }

      /* === RUNNING PUNCH ANIMATION === */
      @keyframes runningPunch {
        0% { transform: translateX(0) scaleX(1); }
        20% { transform: translateX(20px) scaleX(1.02); }
        50% { transform: translateX(45px) scaleX(1.08); }
        75% { transform: translateX(35px) scaleX(1.05); }
        100% { transform: translateX(0) scaleX(1); }
      }

      /* === RUNNING KICK ANIMATION === */
      @keyframes runningKick {
        0% { transform: translateX(0) scaleY(1); }
        15% { transform: translateX(15px) scaleY(0.95) rotate(-2deg); }
        40% { transform: translateX(35px) scaleY(1.12) rotate(3deg); }
        70% { transform: translateX(20px) scaleY(1.05) rotate(0deg); }
        100% { transform: translateX(0) scaleY(1) rotate(0deg); }
      }

      /* === STANDARD PUNCH ANIMATION === */
      @keyframes punchAttack {
        0% { transform: translateX(0) scaleX(1); }
        30% { transform: translateX(15px) scaleX(1.05); }
        60% { transform: translateX(30px) scaleX(1.08); }
        100% { transform: translateX(0) scaleX(1); }
      }

      /* === STANDARD KICK ANIMATION === */
      @keyframes kickAttack {
        0% { transform: translateX(0) scaleY(1); }
        25% { transform: translateX(8px) scaleY(0.95); }
        50% { transform: translateX(25px) scaleY(1.1); }
        75% { transform: translateX(15px) scaleY(1.05); }
        100% { transform: translateX(0) scaleY(1); }
      }

      /* === HEAL GLOW === */
      @keyframes healGlow {
        0% { filter: brightness(1) drop-shadow(0 0 0px #00ff00); }
        50% { filter: brightness(1.15) drop-shadow(0 0 20px #00ff00); }
        100% { filter: brightness(1) drop-shadow(0 0 0px #00ff00); }
      }

      /* === TAKE HIT RECOIL === */
      @keyframes takeHit {
        0% { transform: translateX(0); }
        50% { transform: translateX(-12px); }
        100% { transform: translateX(0); }
      }

      /* === VICTORY TWERK DANCE === */
      @keyframes victoryTwerk {
        0% { transform: translateY(0) rotateZ(0deg) scaleX(1); }
        10% { transform: translateY(-6px) rotateZ(2deg) scaleX(1.02); }
        20% { transform: translateY(-12px) rotateZ(4deg) scaleX(1.04); }
        30% { transform: translateY(-8px) rotateZ(3deg) scaleX(1.03); }
        40% { transform: translateY(0) rotateZ(0deg) scaleX(1); }
        50% { transform: translateY(-8px) rotateZ(-3deg) scaleX(1.03); }
        60% { transform: translateY(-12px) rotateZ(-4deg) scaleX(1.04); }
        70% { transform: translateY(-6px) rotateZ(-2deg) scaleX(1.02); }
        80% { transform: translateY(2px) rotateZ(-1deg) scaleX(1.01); }
        90% { transform: translateY(0) rotateZ(0deg) scaleX(1); }
        100% { transform: translateY(0) rotateZ(0deg) scaleX(1); }
      }

      /* === SMOOTH TRANSITIONS === */
      .battle-player, .battle-monster {
        transition: transform 0.1s ease-out;
      }

      /* Prevent double animations */
      .battle-player.anim-fist,
      .battle-player.anim-kick,
      .battle-player.anim-heal,
      .battle-player.anim-hit,
      .battle-monster.anim-fist,
      .battle-monster.anim-kick,
      .battle-monster.anim-heal,
      .battle-monster.anim-hit {
        animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
    `;
    document.head.appendChild(style);
  }
});
