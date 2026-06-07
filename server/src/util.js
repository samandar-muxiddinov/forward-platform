'use strict';
/* =====================================================================
   Yordamchi funksiyalar: validatsiya, tozalash, CSV, async wrapper.
   Server tomonida HAR DOIM ma'lumot tozalanadi va tekshiriladi.
   ===================================================================== */

// Boshqaruv belgilarini (ASCII 0-31 va 127) bo'sh joyga almashtiradi,
// bo'shliqlarni siqadi, uzunlikni cheklaydi. Hech qachon null qaytarmaydi.
function cleanStr(v, max = 200) {
  if (v == null) return '';
  const s = String(v);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out += code < 32 || code === 127 ? ' ' : s[i];
  }
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > max) out = out.slice(0, max);
  return out;
}

function isName(v) {
  const s = cleanStr(v, 80);
  return s.length >= 2 && s.length <= 80;
}

// O'zbek telefon raqamini +998XXXXXXXXX ko'rinishiga keltiradi; xato bo'lsa ''.
function normPhone(v) {
  let d = String(v == null ? '' : v).replace(/[^\d]/g, '');
  if (d.length === 9) d = '998' + d; // 90XXXXXXX -> 99890XXXXXXX
  if (d.startsWith('998') && d.length === 12) return '+' + d;
  return '';
}
function isPhone(v) {
  return normPhone(v) !== '';
}

function toInt(v, def = null) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function clampInt(v, lo, hi, def) {
  const n = toInt(v, def);
  if (n == null) return def;
  return Math.max(lo, Math.min(hi, n));
}
function oneOf(v, arr, def = null) {
  return arr.includes(v) ? v : def;
}

// Express uchun async xatolarni ushlaydigan o'ramcha.
function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Massivni CSV'ga aylantiradi (Excel uchun UTF-8 BOM bilan).
function toCsv(rows, columns) {
  const BOM = String.fromCharCode(0xfeff);
  const esc = (val) => {
    let s = val == null ? '' : String(val);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key])).join(','))
    .join('\r\n');
  return BOM + header + '\r\n' + body + (body ? '\r\n' : '');
}

module.exports = {
  cleanStr,
  isName,
  normPhone,
  isPhone,
  toInt,
  clampInt,
  oneOf,
  ah,
  toCsv,
};
