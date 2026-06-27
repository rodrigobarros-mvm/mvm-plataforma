// LS Tractor Gallotti — Service Worker v2
// Suporte a Push Notifications + Cache Offline básico

const CACHE_NAME = "lst-gallotti-v2";
const STATIC_CACHE = [
  "/",
  "/dashboard",
  "/work-mode",
  "/follow-ups",
  "/agenda-consultor",
  "/oportunidades",
  "/logo.png",
  "/favicon.ico",
  "/offline.html",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // API requests: network only
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.destination === "document") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => {
        if (event.request.destination === "document") {
          return caches.match("/offline.html");
        }
        return caches.match(event.request);
      })
  );
});

// Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "Gallotti LS", body: event.data.text() }; }

  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: data.tag || "lst-notification",
    data: { url: data.url || "/dashboard" },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Gallotti Tractor | LS Tractor", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Smart Scheduled Notifications ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_DAILY_REMINDERS") {
    const { role, agendaCount, followupCount, metaPercent } = event.data;
    
    // Morning reminder (8:30)
    const now = new Date();
    const morning = new Date();
    morning.setHours(8, 30, 0, 0);
    if (now < morning) {
      const delay = morning.getTime() - now.getTime();
      setTimeout(() => {
        if (role === "consultor" && agendaCount > 0) {
          self.registration.showNotification("Gallotti LS — Bom dia! 🚜", {
            body: `Você tem ${agendaCount} compromisso${agendaCount > 1 ? "s" : ""} hoje. Abrir agenda.`,
            icon: "/logo.png", badge: "/logo.png",
            data: { url: "/agenda-consultor" },
            tag: "morning-agenda",
          });
        } else if (role === "bdr") {
          self.registration.showNotification("Gallotti LS — Bom dia! 💪", {
            body: `Meta de hoje: ${metaPercent ?? 0}% concluída. Vamos prospectar!`,
            icon: "/logo.png", badge: "/logo.png",
            data: { url: "/work-mode" },
            tag: "morning-bdr",
          });
        }
      }, delay);
    }

    // Evening reminder (17:00)
    const evening = new Date();
    evening.setHours(17, 0, 0, 0);
    if (now < evening) {
      const delay = evening.getTime() - now.getTime();
      setTimeout(() => {
        if (followupCount > 0) {
          self.registration.showNotification("⏰ Follow-ups pendentes!", {
            body: `${followupCount} retorno${followupCount > 1 ? "s" : ""} agendado${followupCount > 1 ? "s" : ""} para hoje. Não esqueça!`,
            icon: "/logo.png", badge: "/logo.png",
            data: { url: "/follow-ups" },
            tag: "evening-followup",
          });
        }
      }, delay);
    }
  }
});
