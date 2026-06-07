'use strict';
/* =====================================================================
   Ochiq (public) API — saytdan keladigan arizalar va test natijalari.
   Autentifikatsiya talab qilinmaydi, lekin: rate-limit + qat'iy
   validatsiya + honeypot.
   ===================================================================== */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { ah, cleanStr, isName, normPhone, oneOf, clampInt } = require('../util');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// POST /api/applications — ro'yxatdan o'tish formasi
router.post('/applications', submitLimiter, ah((req, res) => {
  const b = req.body || {};
  const student = b.student || {};
  const parent = b.parent || {};

  // Honeypot: bot to'ldiradigan yashirin maydon -> jimgina qabul qilamiz, saqlamaymiz
  if (cleanStr(b.company) || cleanStr(student.company)) {
    return res.json({ ok: true });
  }

  const first = cleanStr(student.firstName, 50);
  const last = cleanStr(student.lastName, 50);
  if (!isName(first) || !isName(last)) {
    return res.status(400).json({ error: 'invalid_name' });
  }

  const rec = {
    student_first: first,
    student_last: last,
    grade: cleanStr(student.grade, 20),
    student_phone: normPhone(student.phone),
    address: cleanStr(student.address, 120),
    interests: cleanStr(student.interests, 300),
    parent_name: cleanStr(parent.name, 80),
    parent_phone: normPhone(parent.phone),
    division: oneOf(String(b.division || ''), ['1', '2', '3'], ''),
    ip: req.ip || '',
  };

  const info = db
    .prepare(
      `INSERT INTO applications
        (student_first,student_last,grade,student_phone,address,interests,parent_name,parent_phone,division,ip)
       VALUES
        (@student_first,@student_last,@grade,@student_phone,@address,@interests,@parent_name,@parent_phone,@division,@ip)`
    )
    .run(rec);

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

// POST /api/test-results — daraja testi natijasi
router.post('/test-results', submitLimiter, ah((req, res) => {
  const b = req.body || {};
  const tier = oneOf(String(b.tier || ''), ['nexus', 'dominion', 'imperial'], '');
  if (!tier) return res.status(400).json({ error: 'invalid_tier' });

  const rec = {
    name: cleanStr(b.name, 80),
    phone: normPhone(b.phone),
    tier,
    percent: clampInt(b.percent, 0, 100, 0),
    grade_group: oneOf(String(b.group || ''), ['1-4', '5-8', '9-11'], ''),
    ip: req.ip || '',
  };

  const info = db
    .prepare(
      `INSERT INTO test_results (name,phone,tier,percent,grade_group,ip)
       VALUES (@name,@phone,@tier,@percent,@grade_group,@ip)`
    )
    .run(rec);

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

// GET /api/settings — sayt o'qishi uchun public-xavfsiz sozlamalar
router.get('/settings', ah((req, res) => {
  const rows = db.prepare("SELECT key,value FROM settings WHERE key LIKE 'public.%'").all();
  const out = {};
  rows.forEach((r) => {
    out[r.key.replace(/^public\./, '')] = r.value;
  });
  res.json(out);
}));

module.exports = router;
