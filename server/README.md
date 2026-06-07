# FORWARD — Backend & Admin (Phase 2)

Ta'lim platformasi uchun backend API va admin boshqaruv paneli.
Modullar: **arizalar**, **o'quvchilar**, **to'lovlar (qarzdorlar bilan)**,
**kurslar/darslar**, **test natijalari**, **Telegram bildirishnoma**, statistika,
sozlamalar va audit — barchasi xavfsiz kirish ostida.

## Texnologiya
- **Node.js + Express** — API server
- **SQLite** (`better-sqlite3`) — bitta fayl-baza (`data/forward.db`)
- **Built-in crypto (scrypt)** — parol xeshlash (qo'shimcha paketsiz)
- **Helmet + express-rate-limit** — xavfsizlik sarlavhalari va so'rov cheklash
- Admin panel — freymvorksiz vanilla JS SPA (qora/oltin brend)

## Tez boshlash
```bash
cd server
npm install                 # paketlarni o'rnatish
cp .env.example .env        # sozlamalar (SESSION_SECRET ni to'ldiring)
npm run seed                # admin + namuna ma'lumotlar
npm start                   # http://localhost:4000
```
Admin panel: **http://localhost:4000/admin/**

`npm run seed` admin parolini konsolga chiqaradi (yoki `.env` dagi `ADMIN_PASSWORD`).
Parolni keyin admin panelidagi **Sozlamalar → Parolni o'zgartirish** orqali yangilang.

### Foydali buyruqlar
```bash
npm run dev            # avto-qayta yuklash bilan (node --watch)
npm run create-admin   # admin yaratish/parol tiklash: node src/create-admin.js [user] [parol]
```

## API qisqacha
**Ochiq (saytdan):**
- `POST /api/applications` — ro'yxatdan o'tish arizasi
- `POST /api/test-results` — daraja testi natijasi
- `GET  /api/settings` — saytda ko'rinadigan aloqa ma'lumotlari

**Auth:** `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`

**Admin (kirish + admin rol talab qilinadi):**
- `GET /api/admin/stats` — dashboard statistikasi (arizalar, o'quvchilar, tushum)
- `GET/PATCH/DELETE /api/admin/applications[/:id]` — arizalar
- `POST /api/admin/applications/:id/enroll` — arizadan o'quvchi yaratish
- `GET /api/admin/export/applications.csv` — CSV eksport
- `GET/POST/PATCH/DELETE /api/admin/students[/:id]` — o'quvchilar
- `GET/POST/DELETE /api/admin/payments` · `GET /api/admin/payments/summary` — to'lovlar
- `GET/POST/PATCH/DELETE /api/admin/courses[/:id]` · `.../lessons` — kurslar va darslar
- `GET /api/admin/results` — test natijalari
- `GET/PUT /api/admin/settings` · `POST /api/admin/telegram/test` — sozlamalar
- `GET /api/admin/audit` — audit jurnali
- `POST /api/admin/account/password` — parolni o'zgartirish

## Xavfsizlik
- Parollar **scrypt** bilan xeshlanadi (tasodifiy tuz, `timingSafeEqual`)
- Sessiya tokeni bazada **sha256** ko'rinishida saqlanadi; cookie `httpOnly`, `SameSite=Strict`, prod'da `Secure`
- **CSRF**: double-submit cookie + `X-CSRF-Token` header (barcha mutatsiyalarda)
- **RBAC**: admin yo'nalishlari `requireAuth + requireRole('admin')`
- Login: **rate-limit** + 5 xato urinishdan keyin **akkaunt qulflanishi** (15 daq.)
- Barcha kirish ma'lumotlari server tomonida **tozalanadi va tekshiriladi**
- **Helmet** CSP: `script-src 'self'` (inline JS yo'q), `object-src 'none'`, `frame-ancestors 'none'`
- **Audit log** — kim, qachon, nima qilgani yoziladi
- Sirlar `.env` da (git'ga tushmaydi); baza fayli `.gitignore` da

## Joylashtirish (deploy)
1. `NODE_ENV=production` va kuchli `SESSION_SECRET` o'rnating
2. HTTPS ortida ishlating (reverse proxy bo'lsa `TRUST_PROXY=true`)
3. Sayt boshqa domenda bo'lsa — `ALLOWED_ORIGINS` ga uni qo'shing
4. `data/` papkasini doimiy diskka joylang va muntazam **zaxira** oling
5. Render / Railway / VPS — barchasida ishlaydi (faqat Node + doimiy disk kerak)

## Sayt ↔ backend ulanishi
Sayt allaqachon backend'ga ulangan (`js/config.js` → `api.base`):
- `api.base: ""` (standart) = **same-origin** — sayt va backend bitta domenda,
  yoki `SERVE_SITE=true` bilan shu server saytni ham ko'rsatadi.
- Backend **boshqa domenda** bo'lsa: `api.base` ga uni yozing (masalan
  `https://api.forward.uz`) VA o'sha domenni `index.html` / `daraja-test.html`
  dagi CSP `connect-src` ga hamda `_headers` ga qo'shing; server tomonida
  `ALLOWED_ORIGINS` ga sayt domenini qo'shing (CORS).

Forma → `POST /api/applications`, daraja testi → `POST /api/test-results`
(telefon orqali arizaga avtomatik bog'lanadi). Server o'chiq/oflayn bo'lsa,
ariza brauzer xotirasiga zaxiralanadi — lead yo'qolmaydi.

> ⚠️ Sayt CSP'sida `upgrade-insecure-requests` bor: jonli saytda backend ham
> **HTTPS** bo'lishi shart (aks holda aralash-kontent (mixed content) bloklanadi).
