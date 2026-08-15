// StayAhead's service worker - deliberately minimal.
//
// This app shows real dollar amounts and due dates, so this worker NEVER
// caches page HTML or API/Supabase responses - only Next.js's own build
// assets (under /_next/static/, which are content-hashed - the filename
// itself changes whenever the content does, so caching them can never
// serve something stale) and the app's own icons.
//
// Net effect: the app installs like an app and its static code loads
// fast/works on a flaky connection, but it can never show you a cached
// balance or due date from an hour ago - every page view and every API
// call still goes to the network. If the network genuinely isn't there,
// you get a plain "you're offline" page instead of a browser error, not a
// stale copy of your funds.

const STATIC_CACHE = "stayahead-static-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Next.js build output - content-hashed filenames, so cache-first here
  // is always safe (a changed file gets a new URL, never overwrites the
  // cached entry for the old one).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Page navigations (someone opening/reloading the app): always go to the
  // network first, since these render real account data. Only fall back to
  // the offline page if the network request itself fails - never fall back
  // to a cached copy of the page, which could show old numbers.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Everything else - API routes, Supabase calls, etc. - network only. No
  // caching, no offline fallback. A failed request should fail visibly
  // (the app's own error handling takes over) rather than silently
  // returning old data.
});
