// src/lib/notifications.ts
// Native Web Push API with VAPID

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/** Check if push notifications are supported in this browser */
export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

/** Fetch VAPID public key from server */
async function getVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/notifications/vapid-public-key");
  if (!res.ok) throw new Error("Could not fetch VAPID public key");
  const { publicKey } = await res.json();
  return publicKey;
}

/**
 * Request permission + register VAPID push subscription.
 * Sends the subscription to the server so the Cron job can reach this device.
 */
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const publicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to browser push service
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // Register with our server
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Server rejected subscription");

    localStorage.setItem("push_enabled", "true");
    console.log("[Notifications] Push subscription registered successfully.");
    return true;
  } catch (error) {
    console.error("[Notifications] enableNotifications failed:", error);
    return false;
  }
}

/** Send a local notification immediately via the service worker */
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
    .catch(() => new Notification(title, { body, icon: "/assets/app_icon.png" }));
}

/** Tag user as active — server-side cron handles timed reminders */
export async function startReminders(uid: string): Promise<void> {
  console.log("[Notifications] VAPID reminders active for uid:", uid);
}

/** Unsubscribe from push and notify server */
export async function clearReminders(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Notify server first
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: { "Content-Type": "application/json" },
      });
      await subscription.unsubscribe();
    }
    localStorage.setItem("push_enabled", "false");
    console.log("[Notifications] Unsubscribed from push notifications.");
  } catch (error) {
    console.error("[Notifications] clearReminders error:", error);
  }
}

/** No-op: kept for import compatibility */
export async function initOneSignal(): Promise<void> {}
