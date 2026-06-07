'use strict';
/* =====================================================================
   Autentifikatsiya va xavfsizlik:
   - parol xeshlash: scrypt (Node built-in crypto, qo'shimcha paketsiz)
   - sessiya: bazada saqlanadigan token (cookie httpOnly), bekor qilsa bo'ladi
   - CSRF: double-submit cookie + X-CSRF-Token header
   - RBAC: requireAuth / requireRole
   - audit log
   ===================================================================== */
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [, N, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem,
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (e) {
    return false;
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/* ---- Sessions ---- */
function createSession(user, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const id = sha256(token);
  const expires = new Date(Date.now() + config.sessionTtlMs).toISOString();
  db.prepare(
    'INSERT INTO sessions (id,user_id,expires_at,ip,user_agent) VALUES (?,?,?,?,?)'
  ).run(id, user.id, expires, req.ip || '', String(req.headers['user-agent'] || '').slice(0, 200));
  return { token, expires };
}

function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE id=?').run(sha256(token));
}

function getSessionUser(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.id AS sid, s.expires_at, u.*
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(sha256(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id=?').run(row.sid);
    return null;
  }
  return row;
}

/* ---- Cookies ---- */
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  h.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSessionCookie(res, token, expires) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    path: '/',
    expires: new Date(expires),
  });
}
function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}

/* ---- Middleware ---- */
function authenticate(req, res, next) {
  req.cookies = parseCookies(req);
  req.user = getSessionUser(req.cookies[config.cookieName]) || null;
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

/* ---- CSRF (double-submit) ---- */
function issueCsrf(res) {
  const t = crypto.randomBytes(24).toString('hex');
  res.cookie(config.csrfCookieName, t, {
    httpOnly: false, // SPA o'qiy olishi kerak
    sameSite: 'strict',
    secure: config.isProd,
    path: '/',
  });
  return t;
}
function verifyCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const cookies = req.cookies || parseCookies(req);
  const c = cookies[config.csrfCookieName];
  const h = req.headers['x-csrf-token'];
  if (!c || !h || c !== h) return res.status(403).json({ error: 'csrf' });
  next();
}

/* ---- Audit ---- */
function audit(userId, action, detail, ip) {
  try {
    db.prepare(
      'INSERT INTO audit_log (user_id,action,detail,ip) VALUES (?,?,?,?)'
    ).run(userId || null, action, detail || '', ip || '');
  } catch (e) {
    /* audit yozuvi ilovani to'xtatmasligi kerak */
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSessionUser,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  authenticate,
  requireAuth,
  requireRole,
  issueCsrf,
  verifyCsrf,
  audit,
};
