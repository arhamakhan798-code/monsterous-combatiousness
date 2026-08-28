/**
 * MONSTEROUS COMBATIOUSNESS — Google Sheets database backend
 *
 * Deploy this Apps Script as:
 *   Deploy -> New deployment -> Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Then paste the /exec URL into js/google-config.js.
 *
 * Sheets created automatically:
 *   Users    -> account/profile/stat data
 *   History  -> one row per completed battle
 *   Sessions -> short-lived login sessions
 *
 * Passwords are SHA-256 hashed. Plaintext passwords are NEVER written to a sheet.
 */

const CONFIG = {
  SESSION_DAYS: 30,
  MAX_LOGIN_ATTEMPTS: 10
};

const HEADERS = {
  Users: ['id','email','password_hash','username','age','selected_char','total_wins','total_losses','games_played','created_at','updated_at','avatar'],
  History: ['id','user_id','email','outcome','fighter','played_at'],
  Sessions: ['token_hash','user_id','email','created_at','expires_at']
};

function doGet() {
  return json_({ ok: true, service: 'Monsterous Combatiousness database', status: 'online' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e?.postData?.contents || '{}');
    const action = String(data.action || '');
    const result = route_(action, data);
    return json_({ ok: true, ...result });
  } catch (err) {
    const out = normalizeError_(err);
    return json_({ ok: false, ...out });
  } finally {
    lock.releaseLock();
  }
}

function route_(action, data) {
  switch (action) {
    case 'signUp': return signUp_(data);
    case 'signIn': return signIn_(data);
    case 'restoreSession': return restoreSession_(data);
    case 'saveProfile': return saveProfile_(data);
    case 'recordMatch': return recordMatch_(data);
    case 'signOut': return signOut_(data);
    default: throw err_('invalid_request', 'Unknown action.');
  }
}

function signUp_(d) {
  const email = normalizeEmail_(d.email);
  validateEmail_(email);
  validatePassword_(d.password);
  const users = sheet_('Users');
  const existing = findBy_(users, 2, email);
  if (existing) throw err_('email_exists', 'That email already has an account.');

  const now = new Date();
  const id = Utilities.getUuid();
  users.appendRow([
    id, email, sha256_(String(d.password)),
    '', '', '', 0, 0, 0, now.toISOString(), now.toISOString(), '🐉'
  ]);

  return createSessionAndProfile_(findBy_(users, 2, email));
}

function signIn_(d) {
  const email = normalizeEmail_(d.email);
  validateEmail_(email);
  const users = sheet_('Users');
  const found = findBy_(users, 2, email);
  if (!found || sha256_(String(d.password || '')) !== found.row[2]) {
    throw err_('invalid_credentials', 'Incorrect email or password.');
  }
  return createSessionAndProfile_(found);
}

function restoreSession_(d) {
  const token = String(d.token || '');
  if (!token) throw err_('session_expired', 'No active session.');
  const sessions = sheet_('Sessions');
  const found = findBy_(sessions, 1, sha256_(token));
  if (!found || new Date(found.row[4]).getTime() < Date.now()) {
    if (found) sessions.deleteRow(found.rowNumber);
    throw err_('session_expired', 'Your session expired.');
  }
  const users = sheet_('Users');
  const user = findBy_(users, 1, found.row[1]);
  if (!user) throw err_('session_expired', 'Account no longer exists.');
  return { profile: profile_(user.row) };
}

function saveProfile_(d) {
  const user = authenticatedUser_(d.token);
  const username = String(d.username || '').trim();
  const age = Number(d.age);
  const avatar = String(d.avatar || '🐉').trim().slice(0, 8) || '🐉';
  if (username.length < 2 || username.length > 20) throw err_('invalid_profile', 'Username must be 2–20 characters.');
  if (!Number.isFinite(age) || age < 1 || age > 150) throw err_('invalid_profile', 'Enter a valid age.');
  const users = sheet_('Users');
  users.getRange(user.rowNumber, 4, 1, 2).setValues([[username, age]]);
  users.getRange(user.rowNumber, 11).setValue(new Date().toISOString());
  users.getRange(user.rowNumber, 12).setValue(avatar);
  return { profile: profile_(users.getRange(user.rowNumber, 1, 1, 12).getValues()[0]) };
}

function recordMatch_(d) {
  const user = authenticatedUser_(d.token);
  const outcome = String(d.outcome || '').toUpperCase();
  const fighter = ['male','female'].includes(String(d.fighter || '')) ? String(d.fighter) : '';
  if (!['VICTORY','DEFEAT'].includes(outcome)) throw err_('invalid_request', 'Invalid match outcome.');
  const users = sheet_('Users');
  const row = users.getRange(user.rowNumber, 1, 1, 12).getValues()[0];
  const wins = Number(row[6] || 0) + (outcome === 'VICTORY' ? 1 : 0);
  const losses = Number(row[7] || 0) + (outcome === 'DEFEAT' ? 1 : 0);
  const games = Number(row[8] || 0) + 1;
  users.getRange(user.rowNumber, 7, 1, 3).setValues([[wins, losses, games]]);
  users.getRange(user.rowNumber, 11).setValue(new Date().toISOString());
  sheet_('History').appendRow([Utilities.getUuid(), row[0], row[1], outcome, fighter, new Date().toISOString()]);
  return { profile: profile_(users.getRange(user.rowNumber, 1, 1, 12).getValues()[0]) };
}

function signOut_(d) {
  if (!d.token) return {};
  const sessions = sheet_('Sessions');
  const found = findBy_(sessions, 1, sha256_(String(d.token)));
  if (found) sessions.deleteRow(found.rowNumber);
  return {};
}

function createSessionAndProfile_(user) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const sessions = sheet_('Sessions');
  const now = new Date();
  const expires = new Date(now.getTime() + CONFIG.SESSION_DAYS * 86400000);
  sessions.appendRow([sha256_(token), user.row[0], user.row[1], now.toISOString(), expires.toISOString()]);
  return { token: token, profile: profile_(user.row) };
}

function authenticatedUser_(token) {
  const raw = String(token || '');
  if (!raw) throw err_('session_expired', 'Please sign in again.');
  const sessions = sheet_('Sessions');
  const s = findBy_(sessions, 1, sha256_(raw));
  if (!s || new Date(s.row[4]).getTime() < Date.now()) throw err_('session_expired', 'Your session expired.');
  const user = findBy_(sheet_('Users'), 1, s.row[1]);
  if (!user) throw err_('session_expired', 'Account not found.');
  return user;
}

function profile_(r) {
  return {
    id: r[0], email: r[1], username: r[3] || '', age: Number(r[4] || 0), selected_char: '',
    total_wins: Number(r[6] || 0), total_losses: Number(r[7] || 0), games_played: Number(r[8] || 0),
    created_at: r[9] || '', updated_at: r[10] || '', avatar: r[11] || '🐉'
  };
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const headers = HEADERS[name];
  if (headers && sh.getLastRow() === 0) sh.appendRow(headers);
  // Backward-compatible migration for an older Users sheet.
  if (name === 'Users' && sh.getLastColumn() < headers.length) {
    sh.getRange(1, headers.length).setValue(headers[headers.length - 1]);
  }
  return sh;
}

function findBy_(sh, col, value) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][col - 1]).toLowerCase() === String(value).toLowerCase()) {
      return { row: values[i], rowNumber: i + 2 };
    }
  }
  return null;
}

function normalizeEmail_(email) { return String(email || '').trim().toLowerCase(); }
function validateEmail_(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw err_('invalid_email', 'Enter a valid email address.');
}
function validatePassword_(password) {
  if (String(password || '').length < 8) throw err_('invalid_password', 'Password must be at least 8 characters long.');
}
function sha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function err_(code, message) { const e = new Error(message); e.code = code; return e; }
function normalizeError_(e) { return { code: e.code || 'server_error', message: e.message || 'Something went wrong.' }; }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
