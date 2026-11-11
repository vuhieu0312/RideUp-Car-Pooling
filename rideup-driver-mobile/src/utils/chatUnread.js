import { DeviceEventEmitter } from 'react-native';
import { listNotifications, markNotificationRead } from '../api/api';
import { NOTIFICATIONS_CHANGED } from '../hooks/useUnreadNotifications';

// tin nhắn chưa đọc của một booking = thông báo CHAT_MESSAGE chưa đọc gắn với booking đó
async function unreadChatNotifications() {
  const items = await listNotifications(0, 50);
  return (items || []).filter((n) => n.type === 'CHAT_MESSAGE' && !n.read);
}

export async function loadUnreadChatBookingIds() {
  try {
    return new Set((await unreadChatNotifications()).map((n) => n.bookingId));
  } catch {
    return new Set();
  }
}

export async function markChatRead(bookingId) {
  try {
    const mine = (await unreadChatNotifications()).filter((n) => n.bookingId === bookingId);
    if (!mine.length) return;
    await Promise.all(mine.map((n) => markNotificationRead(n.id)));
    DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);
  } catch { /* lần tải sau sẽ đồng bộ lại */ }
}
