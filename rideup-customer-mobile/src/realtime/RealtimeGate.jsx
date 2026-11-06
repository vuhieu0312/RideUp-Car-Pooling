import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { startRealtime, stopRealtime } from './realtime';

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
