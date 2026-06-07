'use strict';
/* =====================================================================
   Autentifikatsiya yo'nalishlari: login / logout / me.
   Login: rate-limit + parol tekshiruvi + akkaunt qulflanishi (lockout).
   ===================================================================== */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auth = require('../auth');
const config = require('../config');
const { ah, cleanStr } = require('../util');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

router.post('/login', loginLimiter, ah((req, res) => {
  const username = cleanStr((req.body || {}).username, 60).toLowerCase();
  const password = String((req.body || {}).password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  const now = Date.now();

  // Akkaunt qulflanganmi?
  if (user && user.locked_until && new Date(user.locked_until).getTime() > now) {
    return res.status(429).json({ error: 'locked' });
  }

  const ok = user && auth.verifyPassword(password, user.password_hash);
  if (!ok) {
    if (user) {
      const attempts = (user.failed_attempts || 0) + 1;
      const lock = attempts >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
      db.prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?').run(
        attempts, lock, user.id
      );
    }
    auth.audit(user ? user.id : null, 'login_failed', username, req.ip);
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  db.prepare(
    "UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=datetime('now') WHERE id=?"
  ).run(user.id);

  const { token, expires } = auth.createSession(user, req);
  auth.setSessionCookie(res, token, expires);
  auth.issueCsrf(res);
  auth.audit(user.id, 'login_success', '', req.ip);

  res.json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
  });
}));

router.post('/logout', ah((req, res) => {
  const token = auth.parseCookies(req)[config.cookieName];
  auth.destroySession(token);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
}));

router.get('/me', ah((req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  const u = req.user;
  res.json({
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      fullName: u.full_name,
      email: u.email,
      lastLogin: u.last_login_at,
    },
  });
}));

module.exports = router;
