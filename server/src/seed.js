'use strict';
/* =====================================================================
   Boshlang'ich ma'lumotlar:
   - admin akkaunti (agar yo'q bo'lsa)
   - namuna arizalar va test natijalari (faqat baza bo'sh bo'lsa)
   Ishga tushirish: npm run seed
   ===================================================================== */
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');
const { createOrUpdateAdmin } = require('./create-admin');

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function seedAdmin() {
  const username = config.admin.username;
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Admin '${username}' allaqachon mavjud — o'tkazib yuborildi.`);
    return;
  }
  let password = config.admin.password;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }
  createOrUpdateAdmin({ username, password, fullName: 'Administrator' });
  // eslint-disable-next-line no-console
  console.log(`Admin yaratildi: ${username}`);
  // eslint-disable-next-line no-console
  console.log(`Parol: ${password}${generated ? "   (tasodifiy — saqlang!)" : ''}`);
}

const DEMO_APPS = [
  { f: 'Ali', l: 'Karimov', g: '3-sinf', sp: '+998901234567', a: 'Toshkent, Chilonzor', i: 'Matematika, robototexnika', pn: 'Karim Karimov', pp: '+998901112233', d: '1', s: 'new', n: '', day: 0 },
  { f: 'Madina', l: 'Yusupova', g: '6-sinf', sp: '+998901234568', a: 'Toshkent, Yunusobod', i: 'Ingliz tili, IELTS', pn: 'Dilnoza Yusupova', pp: '+998901112234', d: '2', s: 'contacted', n: 'Telegram orqali bog\'lanildi', day: 0 },
  { f: 'Jasur', l: 'Toshmatov', g: '10-sinf', sp: '+998901234569', a: 'Samarqand', i: 'SAT, fizika', pn: 'Olim Toshmatov', pp: '+998901112235', d: '3', s: 'enrolled', n: 'Imperial dasturiga qabul qilindi', day: 1 },
  { f: 'Sevara', l: 'Rahimova', g: '4-sinf', sp: '+998901234570', a: 'Toshkent, Sergeli', i: 'Matematika', pn: 'Nodira Rahimova', pp: '+998901112236', d: '1', s: 'new', n: '', day: 2 },
  { f: 'Bekzod', l: 'Aliyev', g: '8-sinf', sp: '+998901234571', a: 'Buxoro', i: 'Ingliz tili, esse', pn: 'Shavkat Aliyev', pp: '+998901112237', d: '2', s: 'contacted', n: '', day: 3 },
  { f: 'Nilufar', l: 'Saidova', g: '11-sinf', sp: '+998901234572', a: 'Toshkent, Mirzo Ulug\'bek', i: 'Universitet arizasi, IELTS', pn: 'Gulnora Saidova', pp: '+998901112238', d: '3', s: 'enrolled', n: '', day: 5 },
  { f: 'Sardor', l: 'Umarov', g: '5-sinf', sp: '+998901234573', a: 'Andijon', i: 'Matematika, ingliz tili', pn: 'Bahodir Umarov', pp: '+998901112239', d: '2', s: 'new', n: '', day: 6 },
  { f: 'Zarina', l: 'Qodirova', g: '2-sinf', sp: '+998901234574', a: 'Toshkent, Yakkasaroy', i: 'O\'qish, matematika', pn: 'Feruza Qodirova', pp: '+998901112240', d: '1', s: 'rejected', n: 'Boshqa shaharga ko\'chib ketdi', day: 9 },
];

const DEMO_RESULTS = [
  { name: 'Jasur Toshmatov', phone: '+998901234569', tier: 'imperial', percent: 92, g: '9-11', day: 1 },
  { name: 'Nilufar Saidova', phone: '+998901234572', tier: 'imperial', percent: 88, g: '9-11', day: 5 },
  { name: 'Madina Yusupova', phone: '+998901234568', tier: 'dominion', percent: 78, g: '5-8', day: 0 },
  { name: 'Bekzod Aliyev', phone: '+998901234571', tier: 'dominion', percent: 74, g: '5-8', day: 3 },
  { name: 'Ali Karimov', phone: '+998901234567', tier: 'nexus', percent: 60, g: '1-4', day: 0 },
  { name: 'Sardor Umarov', phone: '+998901234573', tier: 'nexus', percent: 52, g: '5-8', day: 6 },
  { name: 'Sevara Rahimova', phone: '+998901234570', tier: 'nexus', percent: 64, g: '1-4', day: 2 },
  { name: '', phone: '', tier: 'dominion', percent: 81, g: '9-11', day: 4 },
];

function seedDemo() {
  const count = db.prepare('SELECT COUNT(*) c FROM applications').get().c;
  if (count > 0) {
    // eslint-disable-next-line no-console
    console.log("Arizalar allaqachon mavjud — namuna ma'lumotlar o'tkazib yuborildi.");
    return;
  }
  const insApp = db.prepare(
    `INSERT INTO applications
      (student_first,student_last,grade,student_phone,address,interests,parent_name,parent_phone,division,status,notes,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  db.transaction(() => {
    DEMO_APPS.forEach((r) => {
      const ts = daysAgo(r.day);
      insApp.run(r.f, r.l, r.g, r.sp, r.a, r.i, r.pn, r.pp, r.d, r.s, r.n, ts, ts);
    });
  })();

  const insRes = db.prepare(
    `INSERT INTO test_results (name,phone,tier,percent,grade_group,created_at) VALUES (?,?,?,?,?,?)`
  );
  db.transaction(() => {
    DEMO_RESULTS.forEach((r) => insRes.run(r.name, r.phone, r.tier, r.percent, r.g, daysAgo(r.day)));
  })();

  // eslint-disable-next-line no-console
  console.log(`Namuna: ${DEMO_APPS.length} ta ariza, ${DEMO_RESULTS.length} ta test natijasi qo'shildi.`);
}

seedAdmin();
seedDemo();
process.exit(0);
