// src/lib/notifications.ts
// OneSignal Web Push — script is loaded in index.html

declare const window: Window & { OneSignalDeferred?: any[] };

/** Check if notifications are supported in this browser */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** No-op: OneSignal is initialized via index.html script tag */
export async function initOneSignal(): Promise<void> {
  // Initialization is handled by the OneSignal script in index.html
}

/** Ask user permission and subscribe to OneSignal */
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.Slidedown.promptPush();
        const granted = await OneSignal.Notifications.permission;
        localStorage.setItem('push_enabled', granted ? 'true' : 'false');
        resolve(granted);
      } catch {
        resolve(false);
      }
    });
  });
}

/** Tag the user with their Firebase UID for targeted notifications */
export async function startReminders(uid: string): Promise<void> {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.login(uid);
      await OneSignal.User.addTag('uid', uid);
      console.log('[OneSignal] User tagged:', uid);
    } catch (e) {
      console.warn('[OneSignal] Failed to tag user:', e);
    }
  });
}

/** Send a local notification (instant, no server needed) */
export function sendLocalNotification(title: string, body: string): void {
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: '/assets/app_icon.png',
      badge: '/icon-192x192.svg',
      vibrate: [200, 100, 200],
    } as any);
  });
}

/** Opt user out of push notifications */
export function clearReminders(): void {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.User.PushSubscription.optOut();
      localStorage.setItem('push_enabled', 'false');
    } catch { /* ignore */ }
  });
}
