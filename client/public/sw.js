// Service worker for PumpTracker rest-timer push notifications.
// Handles two types of timer alerts:
// 1. Server-sent Web Push (push event) — works even when tab is closed
// 2. Client-side backup (message event) — fallback for when push isn't set up

const NOTIFICATION_TAG = 'pumptracker-rest-timer';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ─── Server-sent Web Push ───────────────────────────────
// This fires even when the tab is closed / phone is locked.
self.addEventListener('push', (event) => {
  let data = { title: 'Rest is up — back to work!', body: 'Time for your next set.' };
  try {
    data = event.data ? event.data.json() : data;
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      tag: NOTIFICATION_TAG,
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: data.vibrate || [400, 200, 400, 200, 400],
      requireInteraction: true,
      silent: false,
      data: { url: data.url || '/workouts' },
    }).then(async () => {
      // Also notify any open tabs so the UI updates
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'rest-finished' });
      }
    })
  );
});

// ─── Client-side backup timer ───────────────────────────
// Only used as a fallback if server push isn't available.
let pendingTimer = null;

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'schedule-rest') {
    if (pendingTimer) clearTimeout(pendingTimer);

    const ms = Math.max(0, Math.round(Number(data.seconds) * 1000));
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      try {
        await self.registration.showNotification('Rest is up — back to work!', {
          tag: NOTIFICATION_TAG,
          body: 'Your rest timer has finished. Time for your next set.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [400, 200, 400, 200, 400],
          requireInteraction: true,
          silent: false,
          data: { url: '/workouts' },
        });
      } catch { /* permission revoked */ }

      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'rest-finished' });
      }
    }, ms);
  }

  if (data.type === 'cancel-rest') {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then(notes => {
      notes.forEach(n => n.close());
    });
  }
});

// ─── Notification click ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});
