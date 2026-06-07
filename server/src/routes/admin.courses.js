'use strict';
/* =====================================================================
   Admin API — Kurslar va darslar.
   ===================================================================== */
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { ah, cleanStr, oneOf, toInt } = require('../util');

const router = express.Router();
router.use(auth.requireAuth, auth.requireRole('admin'), auth.verifyCsrf);

function courseFields(b) {
  return {
    title: cleanStr(b.title, 120),
    division: oneOf(String(b.division || ''), ['1', '2', '3'], ''),
    tier: oneOf(String(b.tier || ''), ['nexus', 'dominion', 'imperial'], ''),
    description: cleanStr(b.description, 1000),
    sort: toInt(b.sort, 0) || 0,
    active: b.active === false || b.active === 0 ? 0 : 1,
  };
}

// Kurslar ro'yxati (+ dars soni)
router.get('/courses', ah((req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count
       FROM courses c ORDER BY c.sort, c.id`
    )
    .all();
  res.json({ rows });
}));

// Kurs + darslari
router.get('/courses/:id', ah((req, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(toInt(req.params.id));
  if (!c) return res.status(404).json({ error: 'not_found' });
  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id=? ORDER BY sort, id').all(c.id);
  res.json({ course: c, lessons });
}));

router.post('/courses', ah((req, res) => {
  const f = courseFields(req.body || {});
  if (f.title.length < 2) return res.status(400).json({ error: 'invalid_title' });
  const info = db
    .prepare('INSERT INTO courses (title,division,tier,description,sort,active) VALUES (@title,@division,@tier,@description,@sort,@active)')
    .run(f);
  auth.audit(req.user.id, 'course_create', '#' + info.lastInsertRowid + ' ' + f.title, req.ip);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

router.patch('/courses/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  if (!db.prepare('SELECT id FROM courses WHERE id=?').get(id)) return res.status(404).json({ error: 'not_found' });
  const f = courseFields(req.body || {});
  if (f.title.length < 2) return res.status(400).json({ error: 'invalid_title' });
  db.prepare('UPDATE courses SET title=@title,division=@division,tier=@tier,description=@description,sort=@sort,active=@active WHERE id=@id')
    .run({ ...f, id });
  auth.audit(req.user.id, 'course_update', '#' + id, req.ip);
  res.json({ ok: true });
}));

router.delete('/courses/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const info = db.prepare('DELETE FROM courses WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  auth.audit(req.user.id, 'course_delete', '#' + id, req.ip);
  res.json({ ok: true });
}));

// ---- Darslar ----
router.post('/lessons', ah((req, res) => {
  const b = req.body || {};
  const courseId = toInt(b.course_id, null);
  if (!courseId || !db.prepare('SELECT id FROM courses WHERE id=?').get(courseId)) {
    return res.status(400).json({ error: 'invalid_course' });
  }
  const title = cleanStr(b.title, 120);
  if (title.length < 2) return res.status(400).json({ error: 'invalid_title' });
  const info = db
    .prepare('INSERT INTO lessons (course_id,title,material,sort,active) VALUES (?,?,?,?,?)')
    .run(courseId, title, cleanStr(b.material, 2000), toInt(b.sort, 0) || 0, b.active === false ? 0 : 1);
  auth.audit(req.user.id, 'lesson_create', 'course#' + courseId, req.ip);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

router.patch('/lessons/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  if (!db.prepare('SELECT id FROM lessons WHERE id=?').get(id)) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const title = cleanStr(b.title, 120);
  if (title.length < 2) return res.status(400).json({ error: 'invalid_title' });
  db.prepare('UPDATE lessons SET title=?,material=?,sort=?,active=? WHERE id=?')
    .run(title, cleanStr(b.material, 2000), toInt(b.sort, 0) || 0, b.active === false ? 0 : 1, id);
  auth.audit(req.user.id, 'lesson_update', '#' + id, req.ip);
  res.json({ ok: true });
}));

router.delete('/lessons/:id', ah((req, res) => {
  const id = toInt(req.params.id);
  const info = db.prepare('DELETE FROM lessons WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  auth.audit(req.user.id, 'lesson_delete', '#' + id, req.ip);
  res.json({ ok: true });
}));

module.exports = router;
