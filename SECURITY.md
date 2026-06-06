# Xavfsizlik siyosati — FORWARD Platform

FORWARD foydalanuvchilari (asosan maktab o'quvchilari va ularning ota-onalari)
ning ma'lumotlari va ishonchini himoya qilishni jiddiy qabul qiladi. Ushbu
hujjat platformaning xavfsizlik holatini, tahdid modelini va kelajakdagi
(2-bosqich, backend) rejasini bayon qiladi.

> **Holat:** 1-bosqich — statik sayt (server tomoni yo'q). Quyidagi choralar
> aynan shu bosqichga tegishli. Backend qo'shilganda (2-bosqich) yangi qatlamlar
> qo'shiladi (pastga qarang).

## Mas'uliyatli oshkor qilish (Responsible Disclosure)

Zaiflik topsangiz, iltimos **oshkora e'lon qilmasdan** quyidagi manzilga yozing:

- **Email:** `security@forward.uz` *(TODO: haqiqiy manzilni kiriting)*
- Mashina-o'qiydigan kontakt: [`/.well-known/security.txt`](/.well-known/security.txt)

Iltimos, muammoni qanday qayta hosil qilishni tushuntiring. Biz 72 soat ichida
javob berishga harakat qilamiz va tuzatilgach sizni xabardor qilamiz.

## 1-bosqich choralari (joriy etilgan)

| Soha | Chora |
|------|-------|
| Transport | HTTPS majburiy (HSTS, `upgrade-insecure-requests`, Apache'da HTTP→HTTPS redirect) |
| XSS | Qattiq **Content-Security-Policy** (`script-src 'self'`, inline-skript yo'q); barcha DOM yozuvi `textContent`/`createElement` orqali; `escapeHTML`/`sanitizeText` yordamchilari |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| MIME-sniffing | `X-Content-Type-Options: nosniff` |
| Referrer oqishi | `Referrer-Policy: strict-origin-when-cross-origin` |
| Brauzer ruxsatlari | `Permissions-Policy` — kamera/mikrofon/geolokatsiya/FLoC/payment o'chirilgan |
| Cross-origin izolyatsiya | `Cross-Origin-Opener-Policy` + `Cross-Origin-Resource-Policy: same-origin` |
| Forma suiiste'moli | Honeypot maydon + vaqt-tuzog'i (juda tez yuborishni rad etish) + `localStorage` asosidagi rate-limit |
| Kirish validatsiyasi | Ism/telefon/email uchun mijoz tomoni validatorlari + uzunlik cheklovi + boshqaruv belgilarini tozalash |
| PII minimallashtirish | Faqat zarur maydonlar so'raladi; statik bosqichda ma'lumot serverga jo'natilmaydi (demo rejimda lokal saqlanadi) |
| Uchinchi tomon JS | **Yo'q** — tashqi skript kutubxonalari ishlatilmaydi (faqat Google Fonts). Kelajakda CDN ishlatilsa SRI majburiy |
| Katalog ko'rinishi | `Options -Indexes`; dotfayllar bloklangan (`.well-known`dan tashqari) |

### CSP haqida eslatma
`style-src` ichidagi `'unsafe-inline'` — build-qadamsiz komponent uslublarini
qo'llab-quvvatlash uchun amaliy murosa. U **`script-src`ni zaiflashtirmaydi**.
Kelajakdagi qotirish: inline uslublarni tashqi CSS klasslariga ko'chirib,
`'unsafe-inline'`ni olib tashlash.

## Tahdid modeli (biznes-rejaga bog'liq)

Biznes-rejada aniqlangan asosiy xavflar va javoblarimiz:

- **Kontent o'g'irligi (T4):** statik kontent — tovar; haqiqiy qiymat
  interaktiv/shaxsiy funksiyalarda (AI-repetitor, moslashuvchan testlar,
  progress). 2-bosqichda premium materiallar uchun sessiyaga bog'langan
  yetkazib berish va vodiy belgilari (watermark) qo'shiladi.
- **Bolalar ma'lumotlari:** o'quvchi + ota-ona telefoni yig'iladi —
  ma'lumotni minimallashtirish, rozilik matni va 2-bosqichda shifrlangan
  saqlash + kirish nazorati majburiy.
- **Texnik kamchiliklar (W2 — "13 ta gap"):** [`docs/SECURITY-CHECKLIST.md`](docs/SECURITY-CHECKLIST.md) da kuzatiladi.

## 2-bosqich rejasi (backend + admin panel)

Backend qo'shilganda quyidagilar joriy etiladi:

1. **Autentifikatsiya:** parollar `argon2id` (yoki `bcrypt`) bilan xeshlanadi;
   sessiya — `HttpOnly`, `Secure`, `SameSite=Strict` cookie yoki qisqa umrli
   JWT + aylanuvchi refresh token.
2. **Avtorizatsiya:** rol asosidagi kirish nazorati (RBAC) — o'quvchi /
   ota-ona / o'qituvchi / admin. Admin panel alohida himoyalanadi + 2FA.
3. **Server tomoni validatsiyasi:** mijoz validatsiyasiga ishonilmaydi;
   barcha kirish qayta tekshiriladi.
4. **Injection himoyasi:** parametrlangan so'rovlar / ORM; hech qachon
   string-konkatenatsiya bilan SQL.
5. **CSRF:** holatni o'zgartiruvchi so'rovlar uchun CSRF token / `SameSite`.
6. **Rate limiting & WAF:** login va API uchun server tomoni cheklov;
   bot/DDoS himoyasi (masalan, Cloudflare).
7. **Maxfiy ma'lumotlar:** kalit/sirlar muhit o'zgaruvchilarida yoki maxfiy
   menejerda; repozitoriyada hech qachon saqlanmaydi.
8. **Audit & monitoring:** kirish/admin amallari jurnali, anomaliyalarni
   kuzatish, zaxira nusxalari (backup) va tiklash rejasi.
9. **Ma'lumot himoyasi:** PII shifrlash (at rest), TLS (in transit),
   saqlash muddati siyosati.

## OWASP Top 10 (2021) moslashuvi

To'liq jadval: [`docs/SECURITY-CHECKLIST.md`](docs/SECURITY-CHECKLIST.md).
