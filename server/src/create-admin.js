'use strict';
/* =====================================================================
   Admin yaratish / parolni tiklash.
   Foydalanish:
     node src/create-admin.js [username] [password]
   yoki muhit orqali: ADMIN_USERNAME, ADMIN_PASSWORD
   Parol berilmasa — tasodifiy yaratiladi va bir marta konsolga chiqadi.
   ===================================================================== */
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const config = require('./config');

function createOrUpdateAdmin({ username, password, fullName }) {
  username = String(username || '').toLowerCase().trim();
  if (!username) throw new Error('username required');
  if (!password) throw new Error('password required');
  const hash = auth.hashPassword(password);
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET password_hash=?, role=?, full_name=? WHERE id=?').run(
      hash, 'admin', fullName || '', existing.id
    );
    return { id: existing.id, created: false };
  }
  const info = db
    .prepare('INSERT INTO users (username,password_hash,role,full_name) VALUES (?,?,?,?)')
    .run(username, hash, 'admin', fullName || '');
  return { id: info.lastInsertRowid, created: true };
}

if (require.main === module) {
  const username = process.argv[2] || config.admin.username;
  let password = process.argv[3] || config.admin.password;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }
  const r = createOrUpdateAdmin({ username, password, fullName: 'Administrator' });
  // eslint-disable-next-line no-console
  console.log(`Admin ${r.created ? 'yaratildi' : 'yangilandi'}: ${username}`);
  if (generated) {
    // eslint-disable-next-line no-console
    console.log(`Parol: ${password}   (saqlab qo'ying — qayta ko'rsatilmaydi)`);
  }
  process.exit(0);
}

module.exports = { createOrUpdateAdmin };
