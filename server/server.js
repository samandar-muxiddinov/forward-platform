'use strict';
/* =====================================================================
   Kirish nuqtasi — HTTP serverni ishga tushiradi.
   ===================================================================== */
const app = require('./src/app');
const config = require('./src/config');
require('./src/db'); // migratsiyalar shu yerda bajariladi

const server = app.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`FORWARD server → http://${config.host}:${config.port}  (env=${config.env})`);
  // eslint-disable-next-line no-console
  console.log(`Admin panel    → http://localhost:${config.port}/admin/`);
});

function shutdown(sig) {
  // eslint-disable-next-line no-console
  console.log(`\n${sig} qabul qilindi, server yopilmoqda...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
