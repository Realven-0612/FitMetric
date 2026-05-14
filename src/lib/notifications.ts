// src/lib/notifications.ts
// Native Web Push API — no third-party SDK required

/** Check if notifications are supported in this browser */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** Ask user permission for push notifications */
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    localStorage.setItem('push_enabled', granted ? 'true' : 'false');
    return granted;
  } catch {
    return false;
  }
}

/** No-op: kept for API compatibility */
export async function initOneSignal(): Promise<void> {}

/** Send a local notification instantly via the PWA service worker */
export function sendLocalNotification(title: string, body: string): void {
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: '/assets/app_icon.png',
      badge: '/assets/app_icon.png',
      vibrate: [200, 100, 200],
    } as NotificationOptions);
  }).catch(() => {
    // Fallback: direct Notification API
    new Notification(title, { body, icon: '/assets/app_icon.png' });
  });
}

/** Tag user — no-op (was for OneSignal) */
export async function startReminders(uid: string): Promise<void> {
  console.log('[Notifications] Reminders active for user:', uid);
  // Future: schedule local notifications here
}

/** Opt out of notifications */
export function clearReminders(): void {
  localStorage.setItem('push_enabled', 'false');
  console.log('[Notifications] Reminders cleared');
}
