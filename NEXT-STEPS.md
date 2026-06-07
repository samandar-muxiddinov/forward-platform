# FORWARD — Ish holati / Ertangi reja (handoff)

> Bu fayl — ish xotirasi. Yangi sessiyada shu yerdan davom etamiz.
> **Branch:** `claude/quirky-wright-x5kg7` (push qilinadi).

## 1. Holat
**Phase 1 (premium statik sayt) — TUGALLANGAN.**
**Phase 2 (admin + backend) — POYDEVOR TAYYOR ✅** (`server/` papkasi).

Phase 2 da bajarilgani:
- Node.js + Express + SQLite backend
- Admin panel (qora/oltin SPA): **bosh panel** (statistika, 14-kunlik grafik, taqsimotlar),
  **arizalar** (qidiruv/filtr/CSV/tafsilot/holat/izoh/o'chirish), **test natijalari**,
  **sozlamalar** (aloqa + parol), **audit jurnali**
- Ochiq API: `POST /api/applications`, `POST /api/test-results`
- Xavfsizlik: scrypt parol, sessiya (httpOnly cookie), CSRF, RBAC, rate-limit,
  akkaunt qulflash, audit log, helmet CSP
- **Sayt ↔ backend ULANDI ✅**: ro'yxat formasi → `/api/applications`,
  daraja testi → `/api/test-results` (telefon orqali arizaga bog'lanadi).
  Server o'chiq bo'lsa — brauzerga zaxira. HTTPS orqali e2e sinovdan o'tdi.
- Hammasi lokal sinovdan o'tdi (14/14 API + e2e, skrinshotlar: desktop+mobil)

## 2. Qabul qilingan qarorlar
- Yo'l: avval admin+backend (to'liq nazorat), keyin sayt dizayni/animatsiya/mobil.
- Daraja belgilari: **geometrik gerblar** yaratilgan, LEKIN ⤵ soddalashtirish kerak.

## 3. ⭐ KEYINGI ISHLAR (navbat bilan)
1. ✅ ~~Saytni backend'ga ulash~~ — BAJARILDI (forma + test → API, telefon bog'lash).
2. **Gerb/logoni soddalashtirish** (foydalanuvchi ko'rsatmasi 2026-06-07):
   "belgilar juda murakkab... darajalar unvon kabi ko'rinsin, ammo soddaroq;
   logo sodda, professional, ortiqcha bezaksiz." → `assets/logos/*.svg` ni qayta ishlash.
3. **Sayt dizayni:** animatsiya, matnlar, mobil ko'rinish sayqali.
4. (Ixtiyoriy) O'quvchi/ota-ona kabinetlari (hozir faqat admin bor).
5. **Deploy:** hosting tanlash (Render/Railway/VPS) + domen + SESSION_SECRET.
   ⚠️ Jonli saytda backend HTTPS bo'lishi shart (CSP upgrade-insecure-requests).

## 4. FOYDALANUVCHIDAN KERAK (so'ralganda)
- [ ] Aloqa: telefon, Telegram, email, manzil, Instagram (admin → Sozlamalar yoki `js/config.js`)
- [ ] Haqiqiy **domen** (SEO/sitemap/security.txt da `forward.uz` o'rniga)
- [ ] **`FORWARD_Full_Roadmap_BlackGold.docx`** — hali yuborilmagan (SWOT 2 marta kelgan)
- [ ] Hosting qarori (Phase 2 ni jonli ishga tushirish uchun)

## 5. Admin panelni ishga tushirish (lokal)
```bash
cd server && npm install && npm run seed && npm start
# Admin: http://localhost:4000/admin/   (parol seed paytida konsolda chiqadi)
```
To'liq qo'llanma: `server/README.md`.

## 6. Fayllar xaritasi
- **Sayt (Phase 1):** `index.html`, `daraja-test.html`, `css/`, `js/`, `assets/`
- **Backend (Phase 2):** `server/server.js`, `server/src/` (config, db, auth, util, routes/),
  `server/admin/` (SPA: index.html, assets/admin.css, assets/app.js)
- **Hujjatlar:** `server/README.md`, `SECURITY.md`, `docs/`
- Baza fayli (`server/data/*.db`) va `node_modules` — git'ga TUSHMAYDI.

## 7. Eslatma
- Sayt formasi va daraja testi endi **backend'ga ulangan** (same-origin standart).
- Admin parolini birinchi kirishdan keyin Sozlamalardan o'zgartirish tavsiya etiladi.
