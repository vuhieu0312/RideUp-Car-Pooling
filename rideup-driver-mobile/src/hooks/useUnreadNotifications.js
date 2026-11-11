import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUnreadNotificationCount } from '../api/api';
import { useRealtimeRefresh } from '../realtime/useRealtime';

export const NOTIFICATIONS_CHANGED = 'rideup-notifications-changed';

export default function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    getUnreadNotificationCount().then(setCount).catch(() => {});
  }, []);

  useFocusEffect(load);
  useRealtimeRefresh(load, ['NOTIFICATION_CREATED']);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED, load);
    return () => sub.remove();
  }, [load]);

  return count;
}
