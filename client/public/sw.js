// Service worker for Nexero rest-timer background notifications.
// The page posts { type: 'schedule-rest', seconds, id } when a timer starts;
// we set a setTimeout inside the SW that fires a notification + vibration
// pattern when the rest period ends. Cancel with { type: 'cancel-rest' }.

const NOTIFICATION_TAG = 'nexero-rest-timer';
let pendingTimer = null;
let pendingId = null;

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old versions to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open clients so this SW controls pages that were already loaded
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'schedule-rest') {
    // Clear any existing scheduled timer
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }

    const ms = Math.max(0, Math.round(Number(data.seconds) * 1000));
    pendingId = data.id || Date.now();
    const scheduledId = pendingId;

    pendingTimer = setTimeout(async () => {
      // If the user has open tabs, let them know so the page can also react.
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      const anyVisible = clients.some(c => c.visibilityState === 'visible' && c.focused);

      // Show a persistent notification — this also fires vibration on mobile.
      try {
        await self.registration.showNotification('Rest is up — back to work', {
          tag: NOTIFICATION_TAG,
          body: 'Your rest timer has finished. Time for your next set.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [400, 200, 400, 200, 400, 200, 400, 200, 400],
          requireInteraction: !anyVisible, // stay until tapped if app is in background
          silent: false,
          data: { url: '/workouts', timerId: scheduledId },
        });
      } catch (err) {
        // Notification permission may have been revoked; still notify clients
      }

      // Notify any open tabs so they can play their own sound / update UI
      for (const client of clients) {
        client.postMessage({ type: 'rest-finished', id: scheduledId });
      }

      pendingTimer = null;
      pendingId = null;
    }, ms);
  }

  if (data.type === 'cancel-rest') {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
      pendingId = null;
    }
    // Also close any already-shown notification from a prior timer
    self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then(notes => {
      notes.forEach(n => n.close());
    });
  }
});

// Tapping the notification focuses (or opens) the app at /workouts
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
      // Focus an existing tab if one is open
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate && client.navigate(urlToOpen).catch(() => {});
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
