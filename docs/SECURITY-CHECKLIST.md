# FORWARD — Xavfsizlik & Texnik nazorat ro'yxati

Biznes-rejada keltirilgan **"13 ta texnik kamchilik"** shu yerda nazorat
qilinadi, hamda OWASP Top 10 (2021) bo'yicha moslashuv jadvali berilgan.

Belgilar: ✅ bajarildi (1-bosqich) · 🟡 qisman · 🔜 2-bosqich rejasida

## "13 ta texnik kamchilik" holati

| # | Kamchilik | Holat | Izoh |
|---|-----------|-------|------|
| 1 | Xavfsizlik sarlavhalari (CSP, HSTS…) | ✅ | `_headers`, `netlify.toml`, `vercel.json`, `.htaccess` |
| 2 | XSS himoyasi | ✅ | CSP `script-src 'self'`, inline yo'q, xavfsiz DOM yozuvi |
| 3 | HTTPS majburiyligi | ✅ | HSTS + `upgrade-insecure-requests` + redirect |
| 4 | SEO (meta, OG, sitemap, robots) | ✅ | `docs/seo-head.html`, `sitemap.xml`, `robots.txt`, JSON-LD |
| 5 | PWA / o'rnatiluvchanlik | ✅ | `manifest.webmanifest` + ikonalar |
| 6 | Offline rejim / kesh | ✅ | `service-worker.js` (app-shell + stale-while-revalidate) |
| 7 | Ishlash (performance) | 🟡 | Yengil statik, lazy `loading`, kam so'rov; rasm/CDN optimizatsiya — davom etadi |
| 8 | Foydalanish qulayligi (a11y) | ✅ | Semantik HTML, ARIA, skip-link, fokus, `prefers-reduced-motion` |
| 9 | Forma suiiste'moliga qarshi | ✅ | Honeypot + time-trap + rate-limit + validatsiya |
| 10 | Kirish validatsiyasi/tozalash | ✅ | `validators` + `sanitizeText` (uzunlik + control-char) |
| 11 | Analitika / o'lchov | 🔜 | Maxfiylikni hurmat qiluvchi analitika 2-bosqichda |
| 12 | JS arxitekturasi/modulligi | 🟡 | Toza vanilla modullar (config/security/main/test); build pipeline — 2-bosqich |
| 13 | Maxfiylik / PII boshqaruvi | 🟡 | Minimallashtirish + rozilik bor; shifrlash+kirish nazorati — 2-bosqich (backend) |

## OWASP Top 10 (2021)

| Kod | Nomi | 1-bosqich | 2-bosqich (backend) |
|-----|------|-----------|---------------------|
| A01 | Broken Access Control | N/A (statik) | 🔜 RBAC, admin izolyatsiya, server-side tekshiruv |
| A02 | Cryptographic Failures | ✅ HTTPS/HSTS | 🔜 PII shifrlash at-rest, parol xeshlash |
| A03 | Injection | ✅ XSS uchun CSP/escaping | 🔜 parametrlangan so'rovlar (SQLi) |
| A04 | Insecure Design | ✅ tahdid modeli, minimal hujum yuzasi | 🔜 xavfsiz-dizayn sharhi |
| A05 | Security Misconfiguration | ✅ qattiq sarlavhalar, indexing o'chirilgan | 🔜 server qotirish, default'larni o'chirish |
| A06 | Vulnerable Components | ✅ 0 ta tashqi JS-kutubxona | 🔜 dependency audit, SRI, yangilanish siyosati |
| A07 | Identification/Auth Failures | N/A | 🔜 kuchli auth, 2FA, sessiya boshqaruvi |
| A08 | Software & Data Integrity | ✅ tashqi skript yo'q | 🔜 CI integrity, SRI, imzolangan artefaktlar |
| A09 | Logging & Monitoring | 🟡 mijoz konsoli | 🔜 audit log, alerting |
| A10 | SSRF | N/A (statik) | 🔜 server so'rovlarini cheklash |

## Joylashtirishdan oldin (pre-launch) tekshiruv

- [ ] `js/config.js` dagi haqiqiy aloqa/telegram/email kiritildi
- [ ] `security.txt`, `robots.txt`, `sitemap.xml`, JSON-LD dagi `forward.uz` haqiqiy domenga almashtirildi
- [ ] Tanlangan host (Netlify/Vercel/Apache) sarlavhalarni qaytarayotgani `securityheaders.com` orqali tekshirildi
- [ ] Agar tashqi forma endpoint qo'shilsa — uning domeni CSP `connect-src`/`form-action`ga qo'shildi
- [ ] Lighthouse: Performance / SEO / A11y / Best-Practices ko'rsatkichlari ko'rib chiqildi
