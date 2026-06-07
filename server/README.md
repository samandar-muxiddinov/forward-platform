# FORWARD — Backend & Admin (Phase 2)

Ta'lim platformasi uchun backend API va admin boshqaruv paneli.
Arizalar, test natijalari va sozlamalarni boshqarish; statistika; xavfsiz kirish.

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
- `GET /api/admin/stats` — dashboard statistikasi
- `GET/PATCH/DELETE /api/admin/applications[/:id]` — arizalar
- `GET /api/admin/export/applications.csv` — CSV eksport
- `GET /api/admin/results` — test natijalari
- `GET/PUT /api/admin/settings` — aloqa sozlamalari
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

## Saytni backend'ga ulash (keyingi qadam)
Statik saytdagi forma hozir "demo" rejimda. Ulash uchun `js/config.js` da:
```js
form: { endpoint: "https://<server-domeningiz>/api/applications", method: "POST" }
```
Daraja testi natijasini ham `POST /api/test-results` ga yuborish keyingi bosqichda qo'shiladi.
