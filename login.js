/**
 * login.js — Authentication UI Controller
 * Uses Auth.js (SHA-256) backend. Accepts any valid email format without verification.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('login-form');
  const emailInput  = document.getElementById('login-email');
  const passInput   = document.getElementById('login-password');
  const errorEl     = document.getElementById('login-error');
  const btnBack     = document.getElementById('btn-back-to-landing');
  const submitBtn   = form?.querySelector('.login-submit');

  let isRegisterMode = false;
  let isSubmitting   = false;

  // ---- Error helpers ----
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
    clearTimeout(errorEl._t);
    errorEl._t = setTimeout(() => errorEl.classList.remove('visible'), 5500);
  }
  function hideError() {
    if (!errorEl) return;
    errorEl.classList.remove('visible');
    clearTimeout(errorEl._t);
  }

  [emailInput, passInput].forEach(i => i?.addEventListener('input', hideError));

  // ---- Toggle register/login mode ----
  document.querySelector('.login-footer')?.addEventListener('click', e => {
    const link = e.target.closest('#btn-register-toggle');
    if (!link) return;
    e.preventDefault();
    hideError();
    isRegisterMode = !isRegisterMode;

    const title    = document.querySelector('.login-title');
    const subtitle = document.querySelector('.login-subtitle');
    const footer   = document.querySelector('.login-footer');

    if (isRegisterMode) {
      if (title)    title.textContent    = 'Join the Arena';
      if (subtitle) subtitle.textContent = 'Create your warrior account';
      if (submitBtn) submitBtn.textContent = 'Create Account';
      if (footer)   footer.innerHTML = '<p>Already a warrior? <a id="btn-register-toggle">Sign in</a></p>';
    } else {
      if (title)    title.textContent    = 'Welcome Back';
      if (subtitle) subtitle.textContent = 'Enter your credentials, warrior';
      if (submitBtn) submitBtn.textContent = 'Enter Arena';
      if (footer)   footer.innerHTML = '<p>New warrior? <a id="btn-register-toggle">Create an account</a></p>';
    }
  });

  // ---- Form submit ----
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (isSubmitting) return;

    hideError();
    const email    = (emailInput?.value || '').trim();
    const password = (passInput?.value  || '').trim();

    if (!email) { showError('Please enter your email address.'); emailInput?.focus(); return; }
    if (!Auth.isValidEmail(email)) { showError('Please enter a valid email (e.g. warrior@arena.com).'); emailInput?.focus(); return; }
    if (!password) { showError('Please enter your password.'); passInput?.focus(); return; }
    if (password.length < 4) { showError('Password must be at least 4 characters.'); passInput?.focus(); return; }

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = isRegisterMode ? 'Creating Account…' : 'Authenticating…';
    }

    try {
      let account;
      if (isRegisterMode) {
        account = await Auth.register(email, password);
      } else {
        account = await Auth.login(email, password);
      }

      // Restore profile state from account record
      App.state.isLoggedIn  = true;
      App.state.email       = account.email;
      App.state.username    = account.username  || '';
      App.state.age         = account.age       || 0;
      App.state.avatar      = account.avatar    || 'skull';
      App.state.wins        = account.wins      || 0;
      App.state.losses      = account.losses    || 0;
      App.state.totalGames  = account.totalGames || 0;
      App.state.selectedChar = account.lastFighter || null;
      App.saveState();

      if (window.GoogleBackend) {
        window.GoogleBackend.saveLoginData(App.state.email, App.state.username, new Date().toISOString());
      }

      // Navigate: complete profile → battle, else profile setup
      const hasProfile = App.state.username?.trim().length > 0 && Number(App.state.age) >= 1;
      const hasChar    = App.state.selectedChar === 'male' || App.state.selectedChar === 'female';

      if (hasProfile && hasChar) {
        App.showPage('battle-page');
      } else {
        App.showPage('profile-page');
      }

    } catch (err) {
      showError(err.message || 'Authentication failed. Please try again.');
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled  = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = isRegisterMode ? 'Create Account' : 'Enter Arena';
      }
    }
  });

  // ---- Back button ----
  btnBack?.addEventListener('click', () => {
    hideError();
    App.showPage('landing-page');
  });
});
