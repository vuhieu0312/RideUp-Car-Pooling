import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { isRealtimeConnected, subscribeEvents } from './realtime';

const FALLBACK_POLL_MS = 30000;
const DEBOUNCE_MS = 300;

/**
 * Gọi onChange() khi server báo có thay đổi thuộc các `types`.
 * Khi mất kết nối realtime thì tự động quay về polling 30 giây (chỉ lúc app đang mở).
 */
export function useRealtimeRefresh(onChange, types) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const typesKey = types.join(',');

  useEffect(() => {
    let timer = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), DEBOUNCE_MS);
    };

    const unsubscribe = subscribeEvents((event) => {
      // Vừa nối lại thì tải bù những gì có thể đã lỡ
      if (event.type === 'CONNECTED' || types.includes(event.type)) fire();
    });

    const poll = setInterval(() => {
      if (!isRealtimeConnected() && AppState.currentState === 'active') cbRef.current();
    }, FALLBACK_POLL_MS);

    return () => {
      unsubscribe();
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, [typesKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
