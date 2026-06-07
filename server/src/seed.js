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

/* ---- Phase 2b namuna ma'lumotlari ---- */
const DEMO_STUDENTS = [
  { full_name: 'Jasur Toshmatov', phone: '+998901234569', grade: '10-sinf', division: '3', tier: 'imperial', status: 'active', parent_name: 'Olim Toshmatov', parent_phone: '+998901112235', address: 'Samarqand' },
  { full_name: 'Nilufar Saidova', phone: '+998901234572', grade: '11-sinf', division: '3', tier: 'imperial', status: 'active', parent_name: 'Gulnora Saidova', parent_phone: '+998901112238', address: 'Toshkent' },
  { full_name: 'Madina Yusupova', phone: '+998901234568', grade: '6-sinf', division: '2', tier: 'dominion', status: 'active', parent_name: 'Dilnoza Yusupova', parent_phone: '+998901112234', address: 'Toshkent' },
  { full_name: 'Bekzod Aliyev', phone: '+998901234571', grade: '8-sinf', division: '2', tier: 'dominion', status: 'paused', parent_name: 'Shavkat Aliyev', parent_phone: '+998901112237', address: 'Buxoro' },
  { full_name: 'Ali Karimov', phone: '+998901234567', grade: '3-sinf', division: '1', tier: 'nexus', status: 'active', parent_name: 'Karim Karimov', parent_phone: '+998901112233', address: 'Toshkent' },
];

const DEMO_COURSES = [
  { title: 'Boshlangʻich matematika', division: '1', tier: '', description: '1-4 sinf uchun asosiy matematika.', sort: 1, lessons: ['Sonlar va sanoq', 'Qoʻshish va ayirish', 'Koʻpaytirish jadvali', 'Geometriya asoslari'] },
  { title: 'Ingliz tili — Foundation', division: '1', tier: '', description: 'Boshlangʻich ingliz tili.', sort: 2, lessons: ['Alifbo va tovushlar', 'Kundalik soʻzlar', 'Oddiy gaplar'] },
  { title: 'IELTS tayyorgarlik', division: '3', tier: 'imperial', description: '9-11 sinf, xalqaro imtihon.', sort: 3, lessons: ['Listening strategiyalari', 'Reading texnikalari', 'Writing Task 1 & 2', 'Speaking amaliyoti'] },
  { title: 'SAT Math', division: '3', tier: 'imperial', description: 'Universitetga kirish uchun.', sort: 4, lessons: ['Algebra', 'Geometriya', 'Maʼlumotlar tahlili'] },
];

function seedStudents() {
  if (db.prepare('SELECT COUNT(*) c FROM students').get().c > 0) {
    console.log("O'quvchilar mavjud — o'tkazib yuborildi.");
    return;
  }
  const ins = db.prepare(
    `INSERT INTO students (full_name,phone,grade,division,tier,status,parent_name,parent_phone,address)
     VALUES (@full_name,@phone,@grade,@division,@tier,@status,@parent_name,@parent_phone,@address)`
  );
  db.transaction(() => DEMO_STUDENTS.forEach((s) => ins.run(s)))();
  console.log(`Namuna: ${DEMO_STUDENTS.length} ta o'quvchi qo'shildi.`);
}

function seedPayments() {
  if (db.prepare('SELECT COUNT(*) c FROM payments').get().c > 0) {
    console.log("To'lovlar mavjud — o'tkazib yuborildi.");
    return;
  }
  const students = db.prepare("SELECT id, tier FROM students WHERE status='active'").all();
  if (!students.length) return;
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const planAmount = { nexus: 0, dominion: 300000, imperial: 600000 };
  const methods = ['Payme', 'Click', 'Uzum', 'Naqd'];
  const ins = db.prepare(
    `INSERT INTO payments (student_id,amount,currency,plan,method,period,status,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  let n = 0;
  db.transaction(() => {
    students.forEach((s, i) => {
      const amt = planAmount[s.tier] != null ? planAmount[s.tier] : 400000;
      if (amt <= 0) return; // nexus bepul
      ins.run(s.id, amt, "so'm", s.tier || 'custom', methods[i % methods.length], prev, 'paid', prev + '-05 10:00:00', prev + '-05 10:00:00'); n++;
      if (i % 3 !== 0) { ins.run(s.id, amt, "so'm", s.tier || 'custom', methods[(i + 1) % methods.length], cur, 'paid', cur + '-03 12:00:00', cur + '-03 12:00:00'); n++; }
    });
  })();
  console.log(`Namuna: ${n} ta to'lov qo'shildi.`);
}

function seedCourses() {
  if (db.prepare('SELECT COUNT(*) c FROM courses').get().c > 0) {
    console.log("Kurslar mavjud — o'tkazib yuborildi.");
    return;
  }
  const insC = db.prepare('INSERT INTO courses (title,division,tier,description,sort,active) VALUES (?,?,?,?,?,1)');
  const insL = db.prepare('INSERT INTO lessons (course_id,title,sort,active) VALUES (?,?,?,1)');
  let nc = 0, nl = 0;
  db.transaction(() => {
    DEMO_COURSES.forEach((c) => {
      const info = insC.run(c.title, c.division, c.tier, c.description, c.sort); nc++;
      c.lessons.forEach((t, i) => { insL.run(info.lastInsertRowid, t, i + 1); nl++; });
    });
  })();
  console.log(`Namuna: ${nc} ta kurs, ${nl} ta dars qo'shildi.`);
}

seedAdmin();
seedDemo();
seedStudents();
seedPayments();
seedCourses();
process.exit(0);
