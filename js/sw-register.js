/**
 * FORWARD Platform — Service Worker Registration
 * Registers the SW only on secure origins (HTTPS or localhost).
 * Fails silently — never breaks the app if registration is unsupported or fails.
 */

(function registerServiceWorker() {
  'use strict';

  // Guard 1: browser must support Service Workers.
  if (!('serviceWorker' in navigator)) return;

  // Guard 2: only register on secure origins to avoid mixed-content issues.
  const isSecure =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if (!isSecure) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.info('[SW] Registered. Scope:', registration.scope);

        // Listen for an update waiting to activate.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new version is cached and waiting — inform without forcing reload.
              console.info(
                '[SW] Yangi versiya tayyor. Yangilash uchun sahifani qayta yuklang.'
              );
              // Dispatch a custom event so the UI can optionally show a toast/banner.
              window.dispatchEvent(new CustomEvent('swUpdateReady'));
            }
          });
        });
      })
      .catch((err) => {
        // Non-fatal — log only in dev/debug environments.
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[SW] Registration failed:', err);
        }
      });
  });
})();
