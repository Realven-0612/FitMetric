// public/sw-notifications.js
// Listen for push events from the server
self.addEventListener('push', (event) => {
  let data = { title: 'FitMetric', body: 'New update!' };
  try {
    data = event.data?.json() ?? data;
  } catch (e) {
    data = { title: 'FitMetric', body: event.data?.text() || data.body };
  }

  const options = {
    body: data.body,
    icon: '/assets/app_icon.png',
    badge: '/assets/app_icon.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
