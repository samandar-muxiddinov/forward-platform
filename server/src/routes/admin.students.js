'use strict';
/* =====================================================================
   Admin API — O'quvchilar boshqaruvi.
   ===================================================================== */
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { ah, cleanStr, oneOf, clampInt, toInt, normPhone } = require('../util');

const router = express.Router();
router.use(auth.requireAuth, auth.requireRole('admin'), auth.verifyCsrf);

const ST = ['active', 'paused', 'graduated', 'archived'];

function readBody(b) {
  return {
    full_name: cleanStr(b.full_name, 80),
    phone: normPhone(b.phone),
    grade: cleanStr(b.grade, 20),
    division: oneOf(String(b.division || ''), ['1', '2', '3'], ''),
    tier: oneOf(String(b.tier || ''), ['nexus', 'dominion', 'imperial'], ''),
    status: oneOf(String(b.status || 'active'), ST, 'active'),
    parent_name: cleanStr(b.parent_name, 80),
    parent_phone: normPhone(b.parent_phone),
    address: cleanStr(b.address, 120),
    notes: cleanStr(b.notes, 1000),
  };
}

// Ro'yxat
router.get('/students', ah((req, res) => {
  const status = oneOf(String(req.query.status || ''), ST, '');
  const division = oneOf(String(req.query.division || ''), ['1', '2', '3'], '');
  const tier = oneOf(String(req.query.tier || ''), ['nexus', 'dominion', 'imperial'], '');
  const q = cleanStr(req.query.q, 60);
  const page = Math.max(1, toInt(req.query.page, 1));
  const pageSize = clampInt(req.query.pageSize, 5, 100, 20);

  const where = [];
  const params = {};
  if (status) { where.push('status=@status'); params.status = status; }
  if (division) { where.push('division=@division'); params.division = division; }
  if (tier) { where.push('tier=@tier'); params.tier = tier; }
  if (q) { where.push('(full_name LIKE @q OR phone LIKE @q OR parent_name LIKE @q)'); params.q = '%' + q + '%'; }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM students ${wsql}`).get(params).c;
  const rows = db
    .prepare(`SELECT * FROM students ${wsql} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });
  res.json({ rows, total, page, pageSize });
}));

// Bitta o'quvchi (+ test natijalari + to'lovlar)
router.get('/students/:id', ah((req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id=?').get(toInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'not_found' });
  const tests = db
    .prepare("SELECT * FROM test_results WHERE phone<>'' AND phone=? ORDER BY id DESC")
    .all(s.phone || '');
  const payments = db.prepare('SELECT * FROM payments WHERE student_id=? ORDER BY id DESC').all(s.id);
  res.json({ student: s, tests, payments });
}));

// Yaratish
router.post('/students', ah((req, res) => {
  const r = readBody(req.body || {});
  if (r.full_name.length < 2) return res.status(400).json({ error: 'invalid_name' });
  const info = db
    .prepare(
      `INSERT INTO students (full_name,phone,grade,division,tier,status,parent_name,parent_phone,address,notes)
       VALUES (@full_name,@phone,@grade,@division,@tier,@status,@parent_name,@parent_phone,@address,@notes)`
    )
    .run(r);
  auth.audit(req.user.id, 'student_create', '#' + info.lastInsertRowid + ' ' + r.full_name, req.ip);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

// Tahrirlash
router.patch('/students/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  if (!db.prepare('SELECT id FROM students WHERE id=?').get(id)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const r = readBody(req.body || {});
  if (r.full_name.length < 2) return res.status(400).json({ error: 'invalid_name' });
  db.prepare(
    `UPDATE students SET full_name=@full_name,phone=@phone,grade=@grade,division=@division,
     tier=@tier,status=@status,parent_name=@parent_name,parent_phone=@parent_phone,
     address=@address,notes=@notes,updated_at=datetime('now') WHERE id=@id`
  ).run({ ...r, id });
  auth.audit(req.user.id, 'student_update', '#' + id, req.ip);
  res.json({ ok: true });
}));

// O'chirish
router.delete('/students/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const info = db.prepare('DELETE FROM students WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  auth.audit(req.user.id, 'student_delete', '#' + id, req.ip);
  res.json({ ok: true });
}));

// Arizadan o'quvchi yaratish (enroll)
router.post('/applications/:id/enroll', ah((req, res) => {
  const a = db.prepare('SELECT * FROM applications WHERE id=?').get(toInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'not_found' });

  const existing = db.prepare('SELECT id FROM students WHERE application_id=?').get(a.id);
  if (existing) return res.status(409).json({ error: 'already_enrolled', id: existing.id });

  // darajani oxirgi test natijasidan olamiz (telefon bo'yicha)
  let tier = '';
  if (a.student_phone) {
    const t = db.prepare('SELECT tier FROM test_results WHERE phone=? ORDER BY id DESC LIMIT 1').get(a.student_phone);
    if (t) tier = t.tier;
  }
  const info = db
    .prepare(
      `INSERT INTO students (full_name,phone,grade,division,tier,status,parent_name,parent_phone,address,application_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      (a.student_first + ' ' + a.student_last).trim(),
      a.student_phone || '', a.grade || '', a.division || '', tier, 'active',
      a.parent_name || '', a.parent_phone || '', a.address || '', a.id
    );
  db.prepare("UPDATE applications SET status='enrolled', updated_at=datetime('now') WHERE id=?").run(a.id);
  auth.audit(req.user.id, 'student_enroll', 'app#' + a.id + ' -> student#' + info.lastInsertRowid, req.ip);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

module.exports = router;
