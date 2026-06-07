'use strict';
/* =====================================================================
   Admin API — boshqaruv paneli uchun. Barcha yo'nalishlar:
   requireAuth + requireRole('admin') + CSRF (mutatsiyalarda).
   ===================================================================== */
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { ah, cleanStr, oneOf, clampInt, toInt, toCsv } = require('../util');

const router = express.Router();
router.use(auth.requireAuth, auth.requireRole('admin'), auth.verifyCsrf);

const APP_STATUSES = ['new', 'contacted', 'enrolled', 'rejected'];
const TIERS = ['nexus', 'dominion', 'imperial'];

/* ---- Dashboard statistikasi ---- */
router.get('/stats', ah((req, res) => {
  const one = (sql, ...a) => db.prepare(sql).get(...a).c;
  res.json({
    totalApps: one('SELECT COUNT(*) c FROM applications'),
    newApps: one("SELECT COUNT(*) c FROM applications WHERE status='new'"),
    todayApps: one("SELECT COUNT(*) c FROM applications WHERE date(created_at)=date('now')"),
    enrolled: one("SELECT COUNT(*) c FROM applications WHERE status='enrolled'"),
    totalTests: one('SELECT COUNT(*) c FROM test_results'),
    byStatus: db.prepare('SELECT status, COUNT(*) c FROM applications GROUP BY status').all(),
    byDivision: db.prepare('SELECT division, COUNT(*) c FROM applications GROUP BY division').all(),
    byTier: db
      .prepare('SELECT tier, COUNT(*) c, ROUND(AVG(percent)) avg FROM test_results GROUP BY tier')
      .all(),
    trend: db
      .prepare(
        `SELECT date(created_at) d, COUNT(*) c FROM applications
         WHERE created_at >= date('now','-13 days')
         GROUP BY date(created_at) ORDER BY d`
      )
      .all(),
    recent: db
      .prepare(
        'SELECT id,student_first,student_last,division,status,created_at FROM applications ORDER BY id DESC LIMIT 6'
      )
      .all(),
  });
}));

/* ---- Arizalar ro'yxati ---- */
router.get('/applications', ah((req, res) => {
  const status = oneOf(String(req.query.status || ''), APP_STATUSES, '');
  const q = cleanStr(req.query.q, 60);
  const page = Math.max(1, toInt(req.query.page, 1));
  const pageSize = clampInt(req.query.pageSize, 5, 100, 20);

  const where = [];
  const params = {};
  if (status) {
    where.push('status=@status');
    params.status = status;
  }
  if (q) {
    where.push(
      '(student_first LIKE @q OR student_last LIKE @q OR student_phone LIKE @q OR parent_name LIKE @q OR parent_phone LIKE @q)'
    );
    params.q = '%' + q + '%';
  }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM applications ${wsql}`).get(params).c;
  const rows = db
    .prepare(`SELECT * FROM applications ${wsql} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  res.json({ rows, total, page, pageSize });
}));

/* ---- Bitta ariza (+ bog'liq test natijalari) ---- */
router.get('/applications/:id', ah((req, res) => {
  const row = db.prepare('SELECT * FROM applications WHERE id=?').get(toInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const tests = db
    .prepare(
      'SELECT * FROM test_results WHERE application_id=? OR (phone<>\'\' AND phone=?) ORDER BY id DESC'
    )
    .all(row.id, row.student_phone || '');
  res.json({ application: row, tests });
}));

/* ---- Arizani yangilash (status / izoh) ---- */
router.patch('/applications/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const row = db.prepare('SELECT id FROM applications WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'not_found' });

  const b = req.body || {};
  let status;
  if (b.status != null) {
    status = oneOf(String(b.status), APP_STATUSES, null);
    if (status === null) return res.status(400).json({ error: 'invalid_status' });
  }
  const notes = b.notes != null ? cleanStr(b.notes, 1000) : undefined;

  db.prepare(
    `UPDATE applications SET status=COALESCE(?,status), notes=COALESCE(?,notes),
     updated_at=datetime('now') WHERE id=?`
  ).run(status ?? null, notes ?? null, id);

  auth.audit(req.user.id, 'application_update', `#${id} ${status || ''}`.trim(), req.ip);
  res.json({ ok: true });
}));

/* ---- Arizani o'chirish ---- */
router.delete('/applications/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const info = db.prepare('DELETE FROM applications WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  auth.audit(req.user.id, 'application_delete', `#${id}`, req.ip);
  res.json({ ok: true });
}));

/* ---- CSV eksport ---- */
router.get('/export/applications.csv', ah((req, res) => {
  const rows = db.prepare('SELECT * FROM applications ORDER BY id DESC').all();
  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'Sana' },
    { key: 'student_first', label: 'Ism' },
    { key: 'student_last', label: 'Familiya' },
    { key: 'grade', label: 'Sinf' },
    { key: 'division', label: "Bo'lim" },
    { key: 'student_phone', label: 'Telefon' },
    { key: 'parent_name', label: 'Ota-ona' },
    { key: 'parent_phone', label: 'Ota-ona tel' },
    { key: 'address', label: 'Manzil' },
    { key: 'interests', label: 'Qiziqish' },
    { key: 'status', label: 'Holat' },
    { key: 'notes', label: 'Izoh' },
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="forward-arizalar.csv"');
  res.send(toCsv(rows, cols));
}));

/* ---- Test natijalari ---- */
router.get('/results', ah((req, res) => {
  const page = Math.max(1, toInt(req.query.page, 1));
  const pageSize = clampInt(req.query.pageSize, 5, 100, 20);
  const tier = oneOf(String(req.query.tier || ''), TIERS, '');
  const where = tier ? 'WHERE tier=@tier' : '';
  const params = tier ? { tier } : {};

  const total = db.prepare(`SELECT COUNT(*) c FROM test_results ${where}`).get(params).c;
  const rows = db
    .prepare(`SELECT * FROM test_results ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  res.json({ rows, total, page, pageSize });
}));

/* ---- Sozlamalar (aloqa ma'lumotlari) ---- */
const SETTING_KEYS = [
  'public.phone',
  'public.email',
  'public.address',
  'public.telegram',
  'public.instagram',
  'public.workingHours',
];

router.get('/settings', ah((req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach((r) => {
    out[r.key] = r.value;
  });
  res.json(out);
}));

router.put('/settings', ah((req, res) => {
  const b = req.body || {};
  const up = db.prepare(
    `INSERT INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
  );
  const tx = db.transaction((obj) => {
    for (const k of SETTING_KEYS) {
      if (obj[k] != null) up.run(k, cleanStr(obj[k], 200));
    }
  });
  tx(b);
  auth.audit(req.user.id, 'settings_update', '', req.ip);
  res.json({ ok: true });
}));

/* ---- Audit jurnali ---- */
router.get('/audit', ah((req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.username FROM audit_log a
       LEFT JOIN users u ON u.id=a.user_id
       ORDER BY a.id DESC LIMIT 100`
    )
    .all();
  res.json({ rows });
}));

/* ---- O'z parolini o'zgartirish ---- */
router.post('/account/password', ah((req, res) => {
  const b = req.body || {};
  const current = String(b.current || '');
  const next = String(b.next || '');
  if (next.length < 8) return res.status(400).json({ error: 'weak_password' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!auth.verifyPassword(current, user.password_hash)) {
    return res.status(401).json({ error: 'wrong_current' });
  }
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(auth.hashPassword(next), user.id);
  // boshqa barcha sessiyalarni bekor qilamiz
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
  auth.audit(user.id, 'password_change', '', req.ip);
  res.json({ ok: true });
}));

module.exports = router;
