// public/sw-notifications.js
// Lắng nghe sự kiện "push" từ server (nếu sau này dùng Web Push)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'FitMetric', {
      body: data.body || '',
      icon: '/assets/app_icon.png',
      badge: '/icon-192x192.svg',
      vibrate: [200, 100, 200],
    })
  );
});
// Khi bấm vào notification → mở app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
