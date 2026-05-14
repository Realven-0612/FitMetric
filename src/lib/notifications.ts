// src/lib/notifications.ts
// OneSignal Web Push — replaces old web-push/VAPID system

declare const window: Window & { OneSignalDeferred?: any[] };

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

let initialized = false;

/** Load OneSignal SDK script dynamically */
function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('onesignal-sdk')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.id = 'onesignal-sdk';
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Initialize OneSignal (call once on app startup) */
export async function initOneSignal(): Promise<void> {
  if (initialized || !ONESIGNAL_APP_ID) return;
  initialized = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  await loadScript();

  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: '', // optional for Safari
      notifyButton: { enable: false }, // we use our own UI button
      allowLocalhostAsSecureOrigin: true,
    });
  });
}

/** Check if notifications are supported in this browser */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** Ask user permission and subscribe to OneSignal */
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID is not set');
    return false;
  }

  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    return new Promise((resolve) => {
      window.OneSignalDeferred!.push(async (OneSignal: any) => {
        try {
          await OneSignal.Slidedown.promptPush();
          const permission = await OneSignal.Notifications.permission;
          localStorage.setItem('push_enabled', permission ? 'true' : 'false');
          resolve(permission);
        } catch {
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
}

/** Tag the user with their UID so OneSignal can target them */
export async function startReminders(uid: string): Promise<void> {
  if (!ONESIGNAL_APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.login(uid);           // Link OneSignal player to Firebase UID
      await OneSignal.User.addTag('uid', uid);
    } catch (e) {
      console.warn('[OneSignal] Failed to tag user:', e);
    }
  });
}

/** Send a local notification via the browser (no server needed) */
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

export function clearReminders(): void {
  // Unsubscribe via OneSignal dashboard or:
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.User.PushSubscription.optOut();
      localStorage.setItem('push_enabled', 'false');
    } catch { /* ignore */ }
  });
}
