# FORWARD — Ertangi reja / Ish holati (handoff)

> Bu fayl — ish xotirasi. Ertaga shu yerdan davom etamiz.
> **Sana:** 2026-06-06. **Branch:** `claude/quirky-wright-x5kg7` (push qilingan).

## 1. Holat
**Phase 1 (premium statik sayt) — TUGALLANDI va push qilindi.** 2 ta commit:
- `Build FORWARD platform Phase 1: premium site, heraldic crests, security, PWA`
- `Harden scroll-reveal: graceful degradation + instant above-the-fold reveal`

Tekshiruvdan o'tdi: JS/JSON/SVG ✓, 24/24 manzil HTTP 200 ✓, desktop+mobil+test skrinshotlari ✓.

## 2. Qabul qilingan qarorlar
- Yo'l: **avval premium sayt (Phase 1), keyin admin/backend (Phase 2)**.
- Daraja belgilari: **geometrik heraldik gerblar** (emoji o'rniga) — yaratildi.

## 3. ERTAGA BERILADIGAN SAVOLLAR (qayta so'rash)
1. **Keyingi qadam:** Phase 2 (admin + backend) / Phase 1ni sayqallash / live ko'rib chiqish?
   - *(2026-06-06: foydalanuvchi "ertaga hal qilamiz" dedi.)*
2. **Daraja gerblari ma'qulmi?** Ha qoldiramiz / kichik tuzatish / boshqa uslub?
   - *(2026-06-06: "ertaga ko'rib chiqaman" dedi.)*

## 4. FOYDALANUVCHIDAN KERAK BO'LGAN MA'LUMOTLAR
- [ ] Aloqa (`js/config.js` ga): **telefon**, **Telegram** (kanal/bot), **email**, **manzil**, **Instagram**
- [ ] Haqiqiy **domen** (masalan `forward.uz`?) — SEO, `.well-known/security.txt`, `sitemap.xml`, JSON-LD, `robots.txt` da `forward.uz` o'rniga qo'yiladi
- [ ] **`FORWARD_Full_Roadmap_BlackGold.docx`** — hali yuborilmagan (SWOT ikki marta kelgan). "13 ta texnik kamchilik" ro'yxatini aniqlashtiradi
- [ ] Forma qabuli: Telegram/Formspree manzilini bering YOKI Phase 2 backendni kutamiz

## 5. PHASE 2 REJASI (admin + backend) — boshlashga tayyor
- Texnologiya: yengil **Node.js + SQLite** (oson ishga tushadi) yoki kelishilgan stack
- Funksiyalar: haqiqiy ro'yxat saqlash; o'quvchi/ota-ona/**admin** kabinetlari; daraja testi natijalari bazasi; admin **boshqaruv paneli** (arizalar, o'quvchilar, statistika)
- Xavfsizlik: parol xeshlash (argon2id), sessiya/JWT, RBAC + admin 2FA, server-side validatsiya, CSRF, rate-limit, audit-log, sirlarni env'da saqlash (batafsil: `SECURITY.md`)
- **Boshlashdan oldin so'raladi:** hosting (server ishlata olasizmi: Render/Railway/VPS?), admin loginini kim boshqaradi, qaysi maydonlar adminda ko'rinsin

## 6. Saytni ko'rish / deploy
- GitHub Pages: Settings → Pages → branch `claude/quirky-wright-x5kg7`
- Lokal: `python3 -m http.server 8000` → `localhost:8000`

## 7. Fayllar xaritasi
- `index.html`, `daraja-test.html` — sahifalar
- `css/tokens.css` (dizayn-tizimi), `css/main.css`, `css/test.css`
- `js/config.js` (⚙️ aloqa), `js/security.js`, `js/main.js`, `js/test.js`, `js/sw-register.js`
- `assets/logos/` (nexus/dominion/imperial/forward-mark + preview.html + BRAND.md), `assets/icons/`, `assets/og/`
- Xavfsizlik: `_headers`, `netlify.toml`, `vercel.json`, `.htaccess`, `.well-known/security.txt`, `SECURITY.md`, `docs/SECURITY-CHECKLIST.md`
- PWA/SEO: `manifest.webmanifest`, `service-worker.js`, `offline.html`, `robots.txt`, `sitemap.xml`, `docs/seo-head.html`

## 8. Eslatma
- Ro'yxat formasi hozir **demo rejimda** (ma'lumot brauzerda saqlanadi). Haqiqiy qabul Phase 2 yoki forma-endpoint bilan.
