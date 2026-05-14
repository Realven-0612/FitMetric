// src/lib/notifications.ts
// Native Web Push API with VAPID — no third-party SDK required

const VAPID_PUBLIC_KEY = "BHgYFT3fKh7KNAh4rMVCjULIBEe7l30uSV9ggK4661qmcBMUdmNOkso93NdqTcj6RGgMFrKuV--1ir-_27fx4tg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if notifications are supported in this browser */
export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

/** Ask user permission for push notifications and subscribe to VAPID */
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push service
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Send subscription to server
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
      },
    });

    localStorage.setItem("push_enabled", "true");
    return true;
  } catch (error) {
    console.error("[Notifications] Subscription failed:", error);
    return false;
  }
}

/** No-op: kept for API compatibility */
export async function initOneSignal(): Promise<void> {}

/** Send a local notification instantly via the PWA service worker */
export function sendLocalNotification(title: string, body: string): void {
  if (Notification.permission !== "granted") return;
  navigator.serviceWorker.ready
    .then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/assets/app_icon.png",
        badge: "/assets/app_icon.png",
        vibrate: [200, 100, 200],
      } as NotificationOptions);
    })
    .catch(() => {
      new Notification(title, { body, icon: "/assets/app_icon.png" });
    });
}

/** Reminders logic (for native VAPID, this is handled server-side via Cron) */
export async function startReminders(uid: string): Promise<void> {
  console.log("[Notifications] Server-side Cron reminders enabled for user:", uid);
  // We already subscribed the device in enableNotifications()
}

/** Opt out of notifications */
export async function clearReminders(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    localStorage.setItem("push_enabled", "false");
    console.log("[Notifications] Reminders cleared");
  } catch (error) {
    console.error("[Notifications] Error clearing reminders:", error);
  }
}
