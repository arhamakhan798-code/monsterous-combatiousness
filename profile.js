/**
 * profile.js — Profile Setup, Avatar, Stats, History & Fighter Selection
 *
 * Design rules:
 *  - App.state.selectedChar = FIGHTER (male|female) — NEVER the profile avatar
 *  - Profile Avatar (warrior icon) is cosmetic only, set via App.state.avatar
 *  - Fighter is LOCKED once entering battle; only changeable from post-match screen
 *  - syncUI() refreshes all UI from live App.state
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('profile-form');
  const nameInput = document.getElementById('profile-name');
  const ageInput  = document.getElementById('profile-age');
  const errorEl   = document.getElementById('profile-error');
  const charGrid  = document.querySelector('.char-select-grid');
  const charCards = document.querySelectorAll('.char-card');
  const btnBack   = document.getElementById('btn-back-to-login');
  const submitBtn = form?.querySelector('[type="submit"]');

  const VALID_CHARS = new Set(['male', 'female']);

  /* ---- Avatar Selection ---- */
  const AVATAR_ICONS = {
    skull: '💀', dragon: '🐉', wolf: '🐺', fire: '🔥',
    lightning: '⚡', warrior: '⚔️', ghost: '👻', demon: '😈'
  };

  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.avatar;
      if (!key) return;
      App.state.avatar = key;
      App.saveState();
      _syncAvatarUI();
      // Persist to account
      if (App.state.email) {
        Auth.updateProfile(App.state.email, { avatar: key });
      }
    });
  });

  function _syncAvatarUI() {
    const active = App.state.avatar || 'skull';
    document.querySelectorAll('.avatar-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.avatar === active);
    });
    const display = document.getElementById('profile-avatar-display');
    if (display) display.textContent = AVATAR_ICONS[active] || '💀';
  }

  /* ---- Fighter Card Selection ---- */
  function _setSelection(charKey) {
    if (!VALID_CHARS.has(charKey)) return;
    App.state.selectedChar = charKey;
    App.saveState();
    _syncCards();
    _syncSubmitBtn();
    _clearError();
  }

  function _syncCards() {
    const active = App.state.selectedChar;
    charCards.forEach(card => {
      const sel = card.dataset.char === active;
      card.classList.toggle('selected', sel);
      card.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });
    charGrid?.classList.toggle('has-selection', VALID_CHARS.has(active));
  }

  function _syncSubmitBtn() {
    if (!submitBtn) return;
    const ready = VALID_CHARS.has(App.state.selectedChar);
    submitBtn.disabled   = false;
    submitBtn.textContent = 'Ready to Fight 🔥';
    submitBtn.style.opacity = ready ? '1' : '0.55';
    submitBtn.title = ready ? 'Enter the Arena!' : 'Select a fighter first';
  }

  charCards.forEach(card => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const handleSelect = () => {
      const key = card.dataset.char;
      if (!VALID_CHARS.has(key)) return;
      if (App.state.selectedChar === key) return;
      _setSelection(key);
    };
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
    });
  });

  /* ---- Error Helpers ---- */
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
    clearTimeout(errorEl._t);
    errorEl._t = setTimeout(() => errorEl.classList.remove('visible'), 4500);
  }
  function _clearError() {
    if (!errorEl) return;
    errorEl.classList.remove('visible');
    clearTimeout(errorEl._t);
  }

  /* ---- Stats & History Display ---- */
  function _syncStatsUI() {
    const wins       = App.state.wins       || 0;
    const losses     = App.state.losses     || 0;
    const total      = App.state.totalGames || 0;
    const winRate    = total > 0 ? Math.round((wins / total) * 100) : 0;

    const winsEl   = document.getElementById('profile-stat-wins');
    const lossEl   = document.getElementById('profile-stat-losses');
    const totalEl  = document.getElementById('profile-stat-total');
    const rateEl   = document.getElementById('profile-stat-winrate');
    if (winsEl)  winsEl.textContent  = wins;
    if (lossEl)  lossEl.textContent  = losses;
    if (totalEl) totalEl.textContent = total;
    if (rateEl)  rateEl.textContent  = `${winRate}%`;

    // Match history table
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    const account = Auth.getUsers()[App.state.email] || {};
    const history = (account.history || []).slice().reverse().slice(0, 15);
    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="history-empty">No battles yet — enter the arena!</td></tr>';
    } else {
      tbody.innerHTML = history.map(h => `
        <tr class="history-row ${h.result === 'VICTORY' ? 'victory-row' : 'defeat-row'}">
          <td>${h.dateStr || '—'}</td>
          <td>${h.fighter || '—'}</td>
          <td>${h.opponent || 'Monster'}</td>
          <td class="history-result ${h.result === 'VICTORY' ? 'result-win' : 'result-loss'}">
            ${h.result === 'VICTORY' ? '🏆 Victory' : '💀 Defeat'}
          </td>
        </tr>
      `).join('');
    }
  }

  /* ---- syncUI (called every time profile page becomes visible) ---- */
  function syncUI() {
    if (nameInput && App.state.username) nameInput.value = App.state.username;
    if (ageInput  && App.state.age)      ageInput.value  = App.state.age;

    if (App.state.selectedChar && !VALID_CHARS.has(App.state.selectedChar)) {
      App.state.selectedChar = null;
      App.saveState();
    }

    // Display logged-in email
    const emailDisplay = document.getElementById('profile-email-display');
    if (emailDisplay) emailDisplay.textContent = App.state.email || '';

    _syncAvatarUI();
    _syncCards();
    _syncSubmitBtn();
    _syncStatsUI();
    _clearError();
  }

  window.Profile = { syncUI };
  syncUI();

  /* ---- Form Submit → Battle ---- */
  form?.addEventListener('submit', e => {
    e.preventDefault();

    const name   = nameInput?.value.trim() || '';
    const ageRaw = ageInput?.value.trim()  || '';

    if (!name)         { showError('Enter your warrior name!'); nameInput?.focus(); return; }
    if (name.length < 2) { showError('Name must be at least 2 characters.'); nameInput?.focus(); return; }
    if (!ageRaw)       { showError('Enter your age, warrior!'); ageInput?.focus(); return; }

    let age;
    try {
      age = parseInt(ageRaw, 10);
      if (!Number.isFinite(age) || age < 1 || age > 150) throw new Error();
    } catch {
      showError('Enter a valid age.'); ageInput?.focus(); return;
    }

    if (!VALID_CHARS.has(App.state.selectedChar)) {
      showError('Choose your fighter first!');
      charGrid?.classList.remove('error-shake');
      void charGrid?.offsetWidth;
      charGrid?.classList.add('error-shake');
      setTimeout(() => charGrid?.classList.remove('error-shake'), 650);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled    = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Entering Arena…';
    }

    App.state.username     = name;
    App.state.age          = age;
    App.saveState();

    // Persist profile changes to account store
    if (App.state.email) {
      Auth.updateProfile(App.state.email, { username: name, age });
    }

    setTimeout(() => App.showPage('battle-page'), 200);
  });

  [nameInput, ageInput].forEach(i => i?.addEventListener('input', _clearError));

  /* ---- Logout / Switch Account ---- */
  btnBack?.addEventListener('click', () => {
    AudioEngine?.startMusic?.();
    App.clearState();
    _syncCards();
    _syncSubmitBtn();
    if (nameInput) nameInput.value = '';
    if (ageInput)  ageInput.value  = '';
    App.showPage('login-page');
  });
});
