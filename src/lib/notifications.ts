// src/lib/notifications.ts
import { API_BASE } from "./api";

// Kiểm tra trình duyệt có hỗ trợ không
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Hỏi quyền + đăng ký Service Worker
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  // Đăng ký Service Worker tùy chỉnh của mình
  await navigator.serviceWorker.register('/sw-notifications.js');
  localStorage.setItem('push_enabled', 'true');
  return true;
}

// Gửi notification từ phía client (không cần server)
export function sendLocalNotification(title: string, body: string) {
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

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- SERVER WEB PUSH SUBSCRIPTION ---
export async function startReminders(profile: { waterIntake?: number; targetKcal?: number }) {
  if (!isNotificationSupported()) return;
  
  try {
    const reg = await navigator.serviceWorker.ready;
    const PUBLIC_VAPID_KEY = 'BABShjlcawk_xuXWZYcD9wqmt5_errjXlWQkLegoEqG-RVTASpC1UXwVxKWIHSaT2Z3peNtlL3tuvYhTpeUdYpg';
    
    // Subscribe device to push server
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // Send subscription to our backend
    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    console.log('Successfully subscribed to Server Web Push!');
  } catch (error) {
    console.error('Failed to subscribe to Web Push:', error);
  }
}

export function clearReminders() {
  // Not needed for server push, could implement unsub
}
