'use strict';
/* =====================================================================
   Admin API — To'lovlar hisobi.
   ===================================================================== */
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { ah, cleanStr, oneOf, clampInt, toInt } = require('../util');

const router = express.Router();
router.use(auth.requireAuth, auth.requireRole('admin'), auth.verifyCsrf);

const METHODS = ['Payme', 'Click', 'Uzum', 'Naqd'];
const PLANS = ['nexus', 'dominion', 'imperial', 'custom'];
const PSTATUS = ['paid', 'pending'];

function curMonth() {
  return new Date().toISOString().slice(0, 7);
}
function validPeriod(v) {
  return /^\d{4}-\d{2}$/.test(String(v || '')) ? String(v) : '';
}

// Ro'yxat
router.get('/payments', ah((req, res) => {
  const period = validPeriod(req.query.period);
  const status = oneOf(String(req.query.status || ''), PSTATUS, '');
  const studentId = toInt(req.query.student_id, null);
  const page = Math.max(1, toInt(req.query.page, 1));
  const pageSize = clampInt(req.query.pageSize, 5, 100, 20);

  const where = [];
  const params = {};
  if (period) { where.push('p.period=@period'); params.period = period; }
  if (status) { where.push('p.status=@status'); params.status = status; }
  if (studentId) { where.push('p.student_id=@sid'); params.sid = studentId; }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM payments p ${wsql}`).get(params).c;
  const rows = db
    .prepare(
      `SELECT p.*, s.full_name FROM payments p JOIN students s ON s.id=p.student_id
       ${wsql} ORDER BY p.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });
  res.json({ rows, total, page, pageSize });
}));

// Davr bo'yicha xulosa: tushum, soni, usul bo'yicha, qarzdorlar
router.get('/payments/summary', ah((req, res) => {
  const period = validPeriod(req.query.period) || curMonth();
  const rev = db
    .prepare("SELECT COALESCE(SUM(amount),0) sum, COUNT(*) c FROM payments WHERE period=? AND status='paid'")
    .get(period);
  const byMethod = db
    .prepare("SELECT method, COUNT(*) c, COALESCE(SUM(amount),0) sum FROM payments WHERE period=? AND status='paid' GROUP BY method")
    .all(period);
  const debtors = db
    .prepare(
      `SELECT s.id, s.full_name, s.phone, s.tier, s.division FROM students s
       WHERE s.status='active' AND NOT EXISTS (
         SELECT 1 FROM payments p WHERE p.student_id=s.id AND p.period=? AND p.status='paid'
       ) ORDER BY s.full_name`
    )
    .all(period);
  res.json({ period, revenue: rev.sum, count: rev.c, byMethod, debtors });
}));

// Yaratish
router.post('/payments', ah((req, res) => {
  const b = req.body || {};
  const studentId = toInt(b.student_id, null);
  if (!studentId || !db.prepare('SELECT id FROM students WHERE id=?').get(studentId)) {
    return res.status(400).json({ error: 'invalid_student' });
  }
  const status = oneOf(String(b.status || 'paid'), PSTATUS, 'paid');
  const rec = {
    student_id: studentId,
    amount: Math.max(0, Number(b.amount) || 0),
    currency: cleanStr(b.currency, 10) || 'soʻm',
    plan: oneOf(String(b.plan || ''), PLANS, ''),
    method: oneOf(String(b.method || ''), METHODS, ''),
    period: validPeriod(b.period) || curMonth(),
    status: status,
    note: cleanStr(b.note, 300),
    paid_at: status === 'paid' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
  };
  const info = db
    .prepare(
      `INSERT INTO payments (student_id,amount,currency,plan,method,period,status,note,paid_at)
       VALUES (@student_id,@amount,@currency,@plan,@method,@period,@status,@note,@paid_at)`
    )
    .run(rec);
  auth.audit(req.user.id, 'payment_create', 'student#' + studentId + ' ' + rec.amount + ' ' + rec.currency, req.ip);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

// O'chirish
router.delete('/payments/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const info = db.prepare('DELETE FROM payments WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  auth.audit(req.user.id, 'payment_delete', '#' + id, req.ip);
  res.json({ ok: true });
}));

module.exports = router;
