import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { startRealtime, stopRealtime } from './realtime';

/** Bật kết nối realtime khi đã đăng nhập, tắt khi đăng xuất. Không render gì. */
export default function RealtimeGate() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    startRealtime();
    return () => stopRealtime();
  }, [userId]);

  return null;
}
