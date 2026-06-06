# FORWARD — Ta'lim Platformasi

O'zbek tilidagi K–11 ta'lim platformasi. Navy + oltin ("Black & Gold") premium identitet,
uch bo'lim (1–4, 5–8, 9–11 sinf) va uch darajali tizim (**Nexus → Dominion → Imperial**).

> **Holat:** 1-bosqich — premium statik sayt (frontend, PWA, xavfsizlik, SEO).
> 2-bosqich (rejada): backend + admin boshqaruv paneli + login.

## Tuzilma

```
index.html              Asosiy sahifa
daraja-test.html        Daraja aniqlash testi (Nexus/Dominion/Imperial)
css/   tokens.css        Dizayn-tizimi (rang, shrift, masofa)
       main.css          Asosiy sahifa uslublari
       test.css          Test sahifasi uslublari
js/    config.js         ⚙️ Aloqa ma'lumotlari shu yerda (tahrirlang)
       main.js           Interaktivlik
       security.js       Forma himoyasi / tozalash
       test.js           Test mantiqi
       sw-register.js    Service worker ro'yxati (offline)
assets/logos/           Heraldik daraja gerblari (SVG)
assets/icons/           Favicon + PWA ikonalari
manifest.webmanifest    PWA manifesti
service-worker.js       Offline kesh
```

## Ishga tushirish (lokal)

```bash
# Oddiy statik server (build kerak emas):
python3 -m http.server 8000
# Brauzerda: http://localhost:8000
```

## Joylashtirish (bepul)

- **GitHub Pages:** Settings → Pages → branch tanlang. Tayyor.
- **Netlify / Vercel:** repozitoriyani ulang — `_headers` / `netlify.toml` / `vercel.json`
  orqali xavfsizlik sarlavhalari avtomatik qo'llanadi.

## Sozlash

Aloqa raqami, Telegram, email va to'lov tizimlarini **`js/config.js`** faylidan o'zgartiring —
butun sayt avtomatik yangilanadi.
