import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { isRealtimeConnected, rtLog, subscribeEvents } from './realtime';

const FALLBACK_POLL_MS = 30000;
const DEBOUNCE_MS = 300;

// mất realtime thì polling 30s (chỉ khi app đang mở)
export function useRealtimeRefresh(onChange, types) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const typesKey = types.join(',');

  useEffect(() => {
    let timer = null;
    const fire = (reason) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        rtLog(`reload [${typesKey}] do REALTIME:`, reason);
        cbRef.current();
      }, DEBOUNCE_MS);
    };

    const unsubscribe = subscribeEvents((event) => {
      // vừa nối lại thì tải bù
      if (event.type === 'CONNECTED' || types.includes(event.type)) fire(event.type);
    });

    const poll = setInterval(() => {
      if (!isRealtimeConnected() && AppState.currentState === 'active') {
        rtLog(`reload [${typesKey}] do POLLING (realtime đang mất kết nối)`);
        cbRef.current();
      }
    }, FALLBACK_POLL_MS);

    return () => {
      unsubscribe();
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, [typesKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
