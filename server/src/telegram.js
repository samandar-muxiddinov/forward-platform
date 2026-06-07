'use strict';
/* =====================================================================
   Telegram bildirishnoma — Bot API orqali xabar yuborish.
   Sozlamalar (bot_token, chat_id, enabled) `settings` jadvalidan o'qiladi
   (admin paneldan kiritiladi). Tashqi paketsiz — Node built-in https.
   ===================================================================== */
const https = require('https');
const db = require('./db');

function getCfg() {
  const rows = db.prepare("SELECT key,value FROM settings WHERE key LIKE 'telegram.%'").all();
  const o = {};
  rows.forEach((r) => { o[r.key.replace('telegram.', '')] = r.value; });
  return o;
}

// Telegram HTML parse_mode uchun foydalanuvchi matnini qochirish.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sendMessage(text) {
  return new Promise((resolve) => {
    const cfg = getCfg();
    if (cfg.enabled !== '1' || !cfg.bot_token || !cfg.chat_id) {
      return resolve({ ok: false, skipped: true });
    }
    const payload = JSON.stringify({
      chat_id: cfg.chat_id,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: '/bot' + cfg.bot_token + '/sendMessage',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode }));
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

function sendTest() {
  return sendMessage('✅ <b>FORWARD</b>: Telegram bildirishnoma muvaffaqiyatli sozlandi.');
}

module.exports = { sendMessage, sendTest, getCfg, esc };
