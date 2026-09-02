/**
 * landing.js — Landing Page Logic (Particles + Monster Reveal + CTA)
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Floating particles
  const particleContainer = document.getElementById('landing-particles');
  if (particleContainer) {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.classList.add('landing-particle');
      p.style.left              = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay   = (Math.random() * 10) + 's';
      p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
      particleContainer.appendChild(p);
    }
  }

  // Monster reveal
  setTimeout(() => {
    document.getElementById('landing-monster')?.classList.add('revealed');
  }, 800);

  // CTA navigation
  document.getElementById('btn-enter-arena')?.addEventListener('click', () => {
    AudioEngine?.unlock?.();
    if (App.state.isLoggedIn) {
      App.showPage(App._hasFullProfile() ? 'battle-page' : 'profile-page');
    } else {
      App.showPage('login-page');
    }
  });
});
