'use strict';
/* =====================================================================
   FORWARD backend — markazlashgan sozlamalar.
   Barcha qiymatlar muhit o'zgaruvchilaridan o'qiladi (xavfsiz standartlar bilan).
   ===================================================================== */
const path = require('path');
const crypto = require('crypto');

const ENV = process.env.NODE_ENV || 'development';
const isProd = ENV === 'production';

function parseOrigins(s) {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

const config = {
  env: ENV,
  isProd,
  port: parseInt(process.env.PORT, 10) || 4000,
  host: process.env.HOST || '0.0.0.0',

  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'forward.db'),

  // Sessiya imzosi: prod'da majburiy; dev'da vaqtinchalik tasodifiy.
  sessionSecret:
    process.env.SESSION_SECRET || (isProd ? '' : crypto.randomBytes(32).toString('hex')),
  sessionTtlMs: (parseInt(process.env.SESSION_TTL_HOURS, 10) || 12) * 3600 * 1000,
  cookieName: 'fwd_sess',
  csrfCookieName: 'fwd_csrf',

  // Public API (ariza yuborish) uchun CORS allowlist.
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),

  // Marketing saytni ham shu serverdan ko'rsatish (lokal "hammasi birga" rejimi).
  serveSite: process.env.SERVE_SITE === 'true',

  trustProxy: process.env.TRUST_PROXY === 'true',

  admin: {
    username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    // seed paytida bo'sh bo'lsa — tasodifiy parol yaratiladi.
    password: process.env.ADMIN_PASSWORD || '',
  },
};

if (isProd && !config.sessionSecret) {
  // eslint-disable-next-line no-console
  console.error('FATAL: SESSION_SECRET production muhitida majburiy.');
  process.exit(1);
}

module.exports = config;
