/* =====================================================================
   FORWARD — Site configuration
   ---------------------------------------------------------------------
   Bu yagona joy: aloqa ma'lumotlari, ijtimoiy tarmoqlar, to'lov tizimlari
   va forma manzili shu yerda turadi. Haqiqiy qiymatlarni shu faylga
   kiritsangiz, butun sayt avtomatik yangilanadi.
   (Single place to edit contact info — the whole site reads from here.)
   ===================================================================== */

window.FORWARD_CONFIG = {
  brand: {
    name: "FORWARD",
    legalName: "FORWARD Education Platform",
    tagline: "Bilimning Imperiyasi",
    descr: "Boshlang'ichdan universitetgacha — har bir o'quvchiga darajasiga mos, xalqaro standartlardagi ta'lim.",
    foundedYear: 2026,
    city: "Toshkent",
    country: "O'zbekiston"
  },

  // --- ALOQA (TODO: o'z ma'lumotlaringizni kiriting) ---
  contact: {
    phone:        "+998 00 000 00 00",   // TODO
    phoneHref:    "+998000000000",        // TODO (faqat raqamlar, + bilan)
    email:        "info@forward.uz",      // TODO
    address:      "Toshkent shahar, O'zbekiston", // TODO
    workingHours: "Dush–Shan, 9:00–19:00"
  },

  // --- IJTIMOIY TARMOQLAR (TODO) ---
  social: {
    telegram:        "https://t.me/forward_uz",        // TODO (kanal/bot)
    telegramHandle:  "@forward_uz",                    // TODO
    instagram:       "https://instagram.com/forward.uz", // TODO
    youtube:         "",                                // TODO (ixtiyoriy)
    facebook:        ""                                 // TODO (ixtiyoriy)
  },

  // --- TO'LOV TIZIMLARI (SWOT: Payme, Click, Uzum) ---
  payments: ["Payme", "Click", "Uzum Bank"],

  // --- API (Phase 2 backend) ---
  // base bo'sh = same-origin (sayt va backend bitta domenda, yoki Node server
  // saytni ham ko'rsatadi). Backend boshqa domenda bo'lsa, manzilini yozing,
  // masalan: "https://api.forward.uz" — VA o'sha domenni index.html hamda
  // daraja-test.html dagi CSP (connect-src) va _headers fayliga ham qo'shing.
  api: {
    base: ""
  },

  // --- FORMA YUBORISH MANZILI ---
  // Bo'sh bo'lsa, forma yuqoridagi api.base orqali backend'ga yuboradi
  // (<base>/api/applications). Server o'chiq/ulanmagan bo'lsa, ma'lumot
  // brauzerda zaxiraga olinadi (lead yo'qolmaydi). Tashqi xizmat
  // (masalan Formspree) ishlatsangiz, bu yerga to'liq URL yozing.
  form: {
    endpoint: "",          // masalan: "https://formspree.io/f/xxxx"
    method:   "POST"
  },

  // --- DARAJA TIZIMI (rank thresholds) ---
  tiers: {
    nexus:    { name: "Nexus",    min: 55, max: 70,  color: "#4e9eff" },
    dominion: { name: "Dominion", min: 71, max: 85,  color: "#7c5cbf" },
    imperial: { name: "Imperial", min: 86, max: 100, color: "#c9a84c" }
  },

  // --- NARX REJASI (SWOT freemium) ---
  pricing: {
    currency: "$",
    nexus:    { price: 0,  label: "Bepul" },
    dominion: { price: 4,  label: "$3–5/oy" },
    imperial: { price: 10, label: "$8–12/oy" }
  }
};
