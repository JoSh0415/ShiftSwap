// ShiftSwap Service Worker v3
// Handles push notifications, caching, app badge, and notification clicks

const CACHE_NAME = 'shiftswap-v3';
const OFFLINE_URL = '/';

// Install — cache shell for offline PWA support
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
});

// Activate — clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Push — display notification and set app badge
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ShiftSwap', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'shiftswap-notification',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ShiftSwap', options).then(() => {
      // Set app icon badge — count all visible notifications
      if (self.registration.getNotifications) {
        return self.registration.getNotifications().then((notifications) => {
          if (navigator.setAppBadge) {
            navigator.setAppBadge(notifications.length);
          }
        });
      }
    })
  );
});

// Notification click — focus or open the relevant page and update badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    Promise.all([
      // Update badge count after closing this notification
      self.registration.getNotifications().then((notifications) => {
        if (navigator.setAppBadge) {
          if (notifications.length > 0) {
            navigator.setAppBadge(notifications.length);
          } else {
            navigator.clearAppBadge();
          }
        }
      }),
      // Focus existing tab or open new one
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
    ])
  );
});