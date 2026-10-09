// Caches the app shell so it opens instantly; never caches API data or previews.
const VERSION = "v20";
const SHELL = ["/", "/app.css", "/app.js", "/manifest.webmanifest", "/icons/icon-192.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/p/")) return;
  // Network first so updates show up right away; cache is the offline fallback.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && SHELL.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/"))),
  );
});

// Phone notifications. Pushes carry no data: ask the server what's new (the login cookie rides along).
self.addEventListener("push", (e) => {
  e.waitUntil(
    fetch("/api/notifications/latest", { credentials: "same-origin", headers: { "x-wb": "1" } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((n) => {
        const d = n || { title: "Website Business", body: "Something new. Tap to see.", url: "/#/notifications", unread: 0 };
        if (self.navigator.setAppBadge && d.unread) self.navigator.setAppBadge(d.unread).catch(() => {});
        return self.registration.showNotification(d.title, { body: d.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "wb-updates", renotify: true, data: { url: d.url } });
      }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/#/notifications", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (new URL(c.url).origin === self.location.origin) return c.navigate(url).then((w) => (w || c).focus());
      return self.clients.openWindow(url);
    }),
  );
});
