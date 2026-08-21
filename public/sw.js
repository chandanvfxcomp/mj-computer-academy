// Minimal service worker — sirf PWA "installable" banane ke liye
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", () => {
  // Pass-through — koi offline caching nahi, bas normal network requests
});
