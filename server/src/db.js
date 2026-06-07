'use strict';
/* =====================================================================
   SQLite ulanishi + sxema migratsiyasi (better-sqlite3).
   Bitta fayl-baza: ishga tushirish oson, zaxira nusxa olish oddiy.
   ===================================================================== */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL'); // bir vaqtda o'qish/yozish uchun
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                 -- sha256(token)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_first TEXT NOT NULL,
    student_last  TEXT NOT NULL,
    grade         TEXT DEFAULT '',
    student_phone TEXT DEFAULT '',
    address       TEXT DEFAULT '',
    interests     TEXT DEFAULT '',
    parent_name   TEXT DEFAULT '',
    parent_phone  TEXT DEFAULT '',
    division      TEXT DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'new',
    notes         TEXT DEFAULT '',
    source        TEXT DEFAULT 'web',
    ip            TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_app_status  ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_app_created ON applications(created_at);

  CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT DEFAULT '',
    phone          TEXT DEFAULT '',
    tier           TEXT NOT NULL,
    percent        INTEGER NOT NULL,
    grade_group    TEXT DEFAULT '',
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    ip             TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_res_created ON test_results(created_at);

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    action     TEXT NOT NULL,
    detail     TEXT DEFAULT '',
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ===== Phase 2b: o'quvchilar, to'lovlar, kurslar =====
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    phone         TEXT DEFAULT '',
    grade         TEXT DEFAULT '',
    division      TEXT DEFAULT '',
    tier          TEXT DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active',   -- active|paused|graduated|archived
    parent_name   TEXT DEFAULT '',
    parent_phone  TEXT DEFAULT '',
    address       TEXT DEFAULT '',
    notes         TEXT DEFAULT '',
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
  CREATE INDEX IF NOT EXISTS idx_students_phone  ON students(phone);

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount     REAL NOT NULL DEFAULT 0,
    currency   TEXT NOT NULL DEFAULT 'soʻm',
    plan       TEXT DEFAULT '',            -- nexus|dominion|imperial|custom
    method     TEXT DEFAULT '',            -- Payme|Click|Uzum|Naqd
    period     TEXT DEFAULT '',            -- 'YYYY-MM'
    status     TEXT NOT NULL DEFAULT 'paid', -- paid|pending
    note       TEXT DEFAULT '',
    paid_at    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
  CREATE INDEX IF NOT EXISTS idx_payments_period  ON payments(period);

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    division    TEXT DEFAULT '',
    tier        TEXT DEFAULT '',
    description TEXT DEFAULT '',
    sort        INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    material   TEXT DEFAULT '',            -- matn yoki havola (URL)
    sort       INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
  `);
}
migrate();

module.exports = db;
