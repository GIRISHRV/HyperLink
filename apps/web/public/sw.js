/**
 * Minimal service worker for HyperLink.
 *
 * Immediately installs and activates so the browser has a registered SW
 * (required for PWA manifest / offline-page support).
 * No caching strategies are applied here — add workbox/serwist if needed.
 */

self.addEventListener("install", () => {
  // Skip the waiting phase so the new SW activates immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of all open clients without requiring a page reload.
  event.waitUntil(self.clients.claim());
});

// Passthrough fetch handler — let the browser handle all requests normally.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
