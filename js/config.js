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

  // --- FORMA YUBORISH MANZILI ---
  // Phase 1 (statik) uchun: bu yerga Formspree yoki Telegram-proxy URL'ini
  // qo'ying. Bo'sh bo'lsa, forma xavfsiz "demo" rejimida ishlaydi
  // (ma'lumot brauzerda saqlanadi, hech qayerga yuborilmaydi).
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
