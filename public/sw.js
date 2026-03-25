/* global self, caches, fetch */
/**
 * Service worker minimal — precache shell + fallback offline la start_url.
 * Înregistrat doar din client în producție (vezi components/pwa-client.tsx).
 */
const CACHE_NAME = "wordwave-pwa-v1"
const PRECACHE_URLS = ["/"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          try {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          } catch {
            /* ignore cache put errors */
          }
          return response
        })
        .catch(() => caches.match("/").then((r) => r || fetch(request))),
    )
  }
})
