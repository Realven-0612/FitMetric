// src/lib/notifications.ts
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
    });
  });
}

// --- CÁC LỊCH NHẮC NHỞ ---
let reminderTimers: ReturnType<typeof setInterval>[] = [];
export function startReminders(profile: { waterIntake?: number; targetKcal?: number }) {
  clearReminders(); // Xóa lịch cũ nếu có
  // Nhắc uống nước mỗi 2 tiếng
  const waterTimer = setInterval(() => {
    sendLocalNotification('💧 Nhắc nhở uống nước', 'Bạn đã uống đủ nước chưa? Hãy uống thêm 300ml nhé!');
  }, 2 * 60 * 60 * 1000); // 2 tiếng
  
  // Nhắc tập luyện lúc 7h sáng hôm sau
  const now = new Date();
  const nextWorkout = new Date();
  nextWorkout.setHours(7, 0, 0, 0);
  if (nextWorkout <= now) nextWorkout.setDate(nextWorkout.getDate() + 1);
  const msUntilWorkout = nextWorkout.getTime() - now.getTime();
  
  const workoutTimer = setTimeout(() => {
    sendLocalNotification('🏋️ Giờ tập luyện!', 'Đã đến giờ tập! Hãy bắt đầu ngày mới với buổi tập của bạn.');
    // Sau đó lặp lại mỗi 24h
    const dailyTimer = setInterval(() => {
      sendLocalNotification('🏋️ Giờ tập luyện!', 'Đã đến giờ tập! Hãy bắt đầu ngày mới với buổi tập của bạn.');
    }, 24 * 60 * 60 * 1000);
    reminderTimers.push(dailyTimer);
  }, msUntilWorkout);
  
  reminderTimers.push(waterTimer, workoutTimer as any);
}

export function clearReminders() {
  reminderTimers.forEach(clearInterval);
  reminderTimers = [];
}
