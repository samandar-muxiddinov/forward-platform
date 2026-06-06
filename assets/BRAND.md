# FORWARD — Gerb va belgi tizimi (Brand spec)

Premium navy + oltin ("Black & Gold") geraldik identitet. Uchta daraja gerbi bitta
**oilaga** tegishli: bir xil qalqon siluet, bir xil ikki chiziqli geraldik chegara,
bir xil chiziq qalinligi — faqat **ichki emblema va bezak** martabaga qarab ko'tariladi
(Nexus < Dominion < Imperial). Vizual nazorat uchun: [`logos/preview.html`](logos/preview.html).

---

## Fayllar

| Fayl | Maqsad | viewBox |
|------|--------|---------|
| `logos/nexus.svg` | Nexus daraja gerbi | `0 0 128 152` |
| `logos/dominion.svg` | Dominion daraja gerbi | `0 0 128 152` |
| `logos/imperial.svg` | Imperial daraja gerbi | `0 0 128 152` |
| `logos/forward-mark.svg` | Brend belgisi (nav logo, monogram) | `0 0 64 64` |
| `icons/favicon.svg` | Favicon (brauzer tab, PWA asosi) | `0 0 32 32` |
| `logos/preview.html` | Vizual QA sahifasi | — |

---

## Daraja gerblari — ma'no va emblema

**NEXUS — poydevor / bog'lanish / birinchi uchqun.** Eng vazmin gerb.
Qalqon ichida bog'langan tugunlar panjarasi yuqoriga ko'tariladi va kalit-tosh
(keystone) bilan yakunlanadi; tepada bitta kichik yulduz.
Urg'u rangi: **ko'k `#4e9eff`**.

**DOMINION — mahorat / yuksalish / boshqaruv.** O'rta martaba.
Markazda yuqoriga ko'tariluvchi minora-shevron, ikki yondan ko'tariluvchi ustunlar,
qalqon ustida uch uchli toj (coronet), tagida ikki dafna bargi.
Urg'u rangi: **binafsha `#7c5cbf`**.

**IMPERIAL — oliy hokimiyat / cho'qqi.** Eng hashamatli gerb.
To'liq geometrik toj va nur sochuvchi quyosh, qalqonni ikki yondan qurshagan dafna
gulchambari, markazda sakkiz nurli emblema. Mukammal simmetriya.
Urg'u rangi: **oltin `#c9a84c`**.

---

## Ranglar

| Rol | HEX |
|-----|-----|
| Oltin (asosiy chiziq) | `#c9a84c` |
| Oltin nur (highlight) | `#e8c96a` |
| Oltin chuqur (gradient pasti) | `#a8862f` |
| Navy (asosiy fon) | `#0a0f1e` |
| Deep (ko'tarilgan fon) | `#0d1529` |
| Nexus urg'u | `#4e9eff` |
| Dominion urg'u | `#7c5cbf` |
| Imperial urg'u | `#c9a84c` |

Asosiy chiziqlar — oltin gradient. Har bir gerb o'z urg'u rangini juda past
shaffoflikdagi ichki to'ldirish (tint) va markaziy emblema orqali olib yuradi,
shunda u navy fonda yumshoq o'qiladi.

---

## O'lcham (sizing)

- **Saytdagi daraja ikonkasi: 48px** — chiziqlar shu o'lchamda o'qilishi shart.
  Chiziq qalinligi ~2.5–3 (viewBox `0 0 128 152`) shu sabab tanlangan.
- Tavsiya etilgan: **48px / 96px / 200px** (kartalar, sahifa sarlavhalari, hero).
- Minimal: **40px** dan kichik qilmang — nozik bezaklar (dafna, jevohirlar) yo'qoladi.
- O'lcham CSS orqali beriladi (`width`/`height` SVG ichida belgilanmagan).
- Forward-mark: nav uchun **28–40px**; favicon: **16–32px**.

---

## Qoidalar (Do / Don't)

**Do**
- Gerblarni navy yoki qorong'i (deep/surface) fonda ishlating.
- Uchchalasini birga ko'rsatganda bir xil o'lchamda joylashtiring.
- Proporsiyani saqlang (bir xil masshtab, cho'zmasdan).
- Favicon'ni o'z navy plitkasi (tile) bilan ishlating — har qanday tabda o'qiladi.

**Don't**
- ❌ Eski emoji (⚡🔥👑) ga qaytmang — ular almashtirilgan.
- ❌ Gerblarni cho'zmang yoki nomutanosib masshtablamang.
- ❌ Oltin chiziqlarni boshqa rangga bo'yamang yoki soya/blur qo'shmang
  (kichik o'lchamda yo'qoladi).
- ❌ Bir darajaning emblemasini boshqa rang urg'usi bilan aralashtirmang.
- ❌ Yorug' (oq) fonda asosiy holatda ishlatmang — kontrast pasayadi.
- ❌ Gerb ichiga `<text>` yoki tashqi shrift qo'shmang — barchasi geometrik shakl.

---

## Texnik

- Sof vanil SVG, tashqi havolasiz, o'zini o'zi ta'minlaydigan (self-contained).
- Har bir fayl `<title>` va `<desc>` (o'zbekcha) bilan — skrinrider uchun.
- Filtr/blur ishlatilmaydi; faqat `linearGradient`/`radialGradient` past alpha tint uchun.
- `fill`/`stroke` aniq belgilangan; `width`/`height` CSS uchun ochiq qoldirilgan.
