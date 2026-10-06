import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';

import { tokenStore, WS_URL } from '@/shared/api';

/**
 * WebSocket temps réel (commentaires, notifications) authentifié par ?token=<jwt>.
 * Reconnexion avec attente croissante (1 s → 30 s), suspendue hors ligne pour ne gaspiller
 * ni batterie ni forfait.
 */
export function useLiveSocket<T>(path: string | null, onMessage: (message: T) => void) {
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    if (!path) return;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      const token = tokenStore.get();
      if (closed || !token) return;
      socket = new WebSocket(`${WS_URL}${path}?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          handler.current(JSON.parse(String(event.data)) as T);
        } catch {
          // message illisible : ignoré
        }
      };
      socket.onclose = () => {
        if (closed) return;
        attempt += 1;
        timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt));
      };
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && (!socket || socket.readyState === WebSocket.CLOSED)) {
        clearTimeout(timer);
        attempt = 0;
        connect();
      }
    });
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      unsubscribe();
      socket?.close();
    };
  }, [path]);
}
