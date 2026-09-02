/**
 * hit-effects.js — Enhanced Hit Detection & Visual Feedback
 * Provides visual and audio feedback for every hit, dodge, and critical strike
 * Includes camera shake and dramatic defeat effects
 */
'use strict';

const HitEffects = {
  /**
   * Display hit damage number with floating animation
   */
  showDamageNumber(element, damage, isCrit = false) {
    if (!element) return;
    
    const dmgEl = document.createElement('div');
    dmgEl.className = `damage-number ${isCrit ? 'critical' : ''}`;
    dmgEl.textContent = isCrit ? `CRITICAL! ${damage}` : `−${damage}`;
    dmgEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      font-weight: bold;
      font-size: ${isCrit ? '28px' : '20px'};
      color: ${isCrit ? '#FF1744' : '#DC143C'};
      text-shadow: 0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.8);
      z-index: 500;
      font-family: 'Orbitron', sans-serif;
      letter-spacing: 1px;
    `;
    
    const rect = element.getBoundingClientRect();
    dmgEl.style.left = (rect.left + rect.width / 2) + 'px';
    dmgEl.style.top = (rect.top + rect.height / 4) + 'px';
    dmgEl.style.transform = 'translate(-50%, 0)';
    
    document.body.appendChild(dmgEl);
    
    // Animate upward and fade
    let frame = 0;
    const animate = () => {
      frame++;
      const progress = frame / 40;
      dmgEl.style.opacity = Math.max(0, 1 - progress);
      dmgEl.style.transform = `translate(-50%, ${-progress * 60}px)`;
      
      if (frame < 40) {
        requestAnimationFrame(animate);
      } else {
        dmgEl.remove();
      }
    };
    animate();
  },

  /**
   * Screen shake effect for impact
   */
  screenShake(intensity = 'normal', duration = 200) {
    const arena = document.getElementById('battle-arena');
    if (!arena) return;
    
    const amount = intensity === 'heavy' ? 8 : intensity === 'normal' ? 4 : 2;
    const interval = 30;
    const shakes = Math.floor(duration / interval);
    let shakeCount = 0;
    
    const shakeTimer = setInterval(() => {
      if (shakeCount >= shakes) {
        clearInterval(shakeTimer);
        arena.style.transform = 'translate(0, 0)';
        return;
      }
      
      const x = (Math.random() - 0.5) * amount * 2;
      const y = (Math.random() - 0.5) * amount * 2;
      arena.style.transform = `translate(${x}px, ${y}px)`;
      shakeCount++;
    }, interval);
  },

  /**
   * Dramatic camera zoom effect on defeat
   */
  cameraZoom(targetElement, duration = 1000) {
    if (!targetElement) return;
    
    const arena = document.getElementById('battle-arena');
    if (!arena) return;
    
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    arena.style.transformOrigin = `${centerX}px ${centerY}px`;
    arena.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    arena.style.transform = 'scale(1.4) translateZ(0)';
    
    setTimeout(() => {
      arena.style.transition = 'none';
      arena.style.transformOrigin = 'center center';
    }, duration);
  },

  /**
   * POV (point of view) effect for defeat cinematic
   */
  defeatPOVEffect(duration = 800) {
    const battlePage = document.getElementById('battle-page');
    if (!battlePage) return;
    
    const povOverlay = document.createElement('div');
    povOverlay.id = 'pov-overlay';
    povOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 80;
      background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.7) 100%);
      pointer-events: none;
    `;
    
    document.body.appendChild(povOverlay);
    
    setTimeout(() => {
      povOverlay.remove();
    }, duration);
  },

  /**
   * Blood drain/screen fill effect
   */
  bloodDrainEffect(duration = 2000) {
    const canvas = document.getElementById('blood-canvas');
    if (!canvas) {
      // Create canvas if it doesn't exist
      const newCanvas = document.createElement('canvas');
      newCanvas.id = 'blood-canvas';
      newCanvas.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 90;
        pointer-events: none;
      `;
      document.body.appendChild(newCanvas);
      return this.bloodDrainEffect(duration); // Retry
    }
    
    // Use BloodAnim if available
    if (window.BloodAnim) {
      BloodAnim.init(canvas);
      BloodAnim.start();
    }
  },

  /**
   * Flash effect on hit
   */
  flashOnHit(element, color = '#FF1744', duration = 100) {
    if (!element) return;
    
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = color;
    element.style.filter = 'brightness(1.3)';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBg;
      element.style.filter = '';
    }, duration);
  },

  /**
   * Impact particle burst
   */
  impactBurst(element, type = 'punch') {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const particleCount = type === 'kick' ? 12 : 8;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = 3 + Math.random() * 5;
      const life = 300 + Math.random() * 200;
      
      particle.style.cssText = `
        position: fixed;
        pointer-events: none;
        width: ${6 + Math.random() * 6}px;
        height: ${6 + Math.random() * 6}px;
        background: ${type === 'kick' ? '#FFA500' : '#DC143C'};
        border-radius: 50%;
        z-index: 400;
        left: ${cx}px;
        top: ${cy}px;
        box-shadow: 0 0 8px ${type === 'kick' ? 'rgba(255,165,0,0.8)' : 'rgba(220,20,60,0.8)'};
      `;
      
      document.body.appendChild(particle);
      
      let frame = 0;
      const maxFrames = life / 16;
      
      const animate = () => {
        frame++;
        const progress = frame / maxFrames;
        const x = Math.cos(angle) * speed * progress * 20;
        const y = Math.sin(angle) * speed * progress * 20 + progress * progress * 10;
        
        particle.style.opacity = Math.max(0, 1 - progress);
        particle.style.transform = `translate(${x}px, ${y}px) scale(${1 - progress * 0.8})`;
        
        if (frame < maxFrames) {
          setTimeout(animate, 16);
        } else {
          particle.remove();
        }
      };
      animate();
    }
  },

  /**
   * Play impact animation with visual feedback
   */
  playHitAnimation(target, damage, isCrit = false) {
    if (!target) return;
    
    // Combine effects
    this.flashOnHit(target, isCrit ? '#FF1744' : '#DC143C', 150);
    this.screenShake(isCrit ? 'heavy' : 'normal', 150);
    this.impactBurst(target, damage > 25 ? 'kick' : 'punch');
    this.showDamageNumber(target, damage, isCrit);
    
    // Recoil animation
    const originalTransform = target.style.transform;
    target.style.transform = 'translateX(' + (target.classList.contains('battle-monster') ? -8 : 8) + 'px)';
    
    setTimeout(() => {
      target.style.transform = originalTransform;
    }, 100);
  },

  /**
   * Play defeat cinematic sequence
   */
  playDefeatCinematic(duration = 3500) {
    const monsterElement = document.getElementById('battle-monster');
    
    // 1. Camera zoom to monster face (800ms)
    setTimeout(() => {
      this.cameraZoom(monsterElement, 800);
    }, 0);
    
    // 2. POV effect (800ms in)
    setTimeout(() => {
      this.defeatPOVEffect(1500);
    }, 800);
    
    // 3. Blood drain/screen fill (1200ms in)
    setTimeout(() => {
      this.bloodDrainEffect(2000);
    }, 1200);
  }
};

window.HitEffects = HitEffects;

// Add CSS for damage numbers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('style[data-hit-effects]')) {
      const style = document.createElement('style');
      style.setAttribute('data-hit-effects', '');
      style.textContent = `
        .damage-number {
          font-weight: bold;
          animation: floatUp 0.8s ease-out forwards;
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
        }
        
        #pov-overlay {
          animation: povFade 0.5s ease-in-out forwards;
        }
        @keyframes povFade {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  });
} else {
  if (!document.querySelector('style[data-hit-effects]')) {
    const style = document.createElement('style');
    style.setAttribute('data-hit-effects', '');
    style.textContent = `
      .damage-number {
        font-weight: bold;
        animation: floatUp 0.8s ease-out forwards;
      }
      @keyframes floatUp {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
      }
      
      #pov-overlay {
        animation: povFade 0.5s ease-in-out forwards;
      }
      @keyframes povFade {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
