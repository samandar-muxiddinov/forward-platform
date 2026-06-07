'use strict';
/* =====================================================================
   Express ilovasini yig'ish: xavfsizlik sarlavhalari (helmet), JSON
   parser, sessiya, yo'nalishlar, admin SPA va xato ishlovchisi.
   ===================================================================== */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const auth = require('./auth');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

// Baseline xavfsizlik sarlavhalari (CSP'siz) — barcha javoblar uchun.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Qat'iy CSP faqat admin SPA va API uchun (inline JS yo'q). Statik marketing
// sayt o'zining meta-CSP'siga ega (u Google Fonts'ga ruxsat beradi), shuning
// uchun unga server tomonidan qat'iy CSP qo'llanmaydi.
app.use(['/admin', '/api'], helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'img-src': ["'self'", 'data:'],
    'style-src': ["'self'"],
    'script-src': ["'self'"],
    'connect-src': ["'self'"],
    'font-src': ["'self'", 'data:'],
    'form-action': ["'self'"],
  },
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(auth.authenticate);

// CORS — faqat ochiq ariza yuborish yo'nalishlari uchun (kerak bo'lsa).
function corsPublic(req, res, next) {
  const origin = req.headers.origin;
  const allow = config.allowedOrigins;
  if (origin && (allow.length === 0 || allow.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', corsPublic, publicRoutes);

// 404 — har qanday boshqa /api so'rovi
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

// Admin SPA (statik). Auth API tomonida majburlanadi; /me 401 bo'lsa SPA login ko'rsatadi.
const adminDir = path.join(__dirname, '..', 'admin');
app.use('/admin', express.static(adminDir, { extensions: ['html'] }));
app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDir, 'index.html')));

// Marketing saytni shu serverdan ko'rsatish (ixtiyoriy, lokal demo).
if (config.serveSite) {
  const siteRoot = path.join(__dirname, '..', '..');
  app.use((req, res, next) => {
    // server kodi va .git hech qachon ko'rsatilmaydi
    if (/^\/(server|\.git)(\/|$)/.test(req.path)) return res.status(404).end();
    next();
  });
  app.use('/', express.static(siteRoot, { index: 'index.html', dotfiles: 'ignore' }));
} else {
  app.get('/', (req, res) => res.redirect('/admin/'));
}

// Markaziy xato ishlovchisi
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'invalid_json' });
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: config.isProd ? 'server_error' : String((err && err.message) || err) });
});

module.exports = app;
