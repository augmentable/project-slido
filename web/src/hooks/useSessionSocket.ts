import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, SessionState, ServerMessage } from '@/lib/ws-protocol';

interface UseSessionSocketOptions {
  code: string;
  /** Fall back to Apollo polling if WS fails after this many retries */
  maxRetries?: number;
}

interface UseSessionSocketResult {
  session: SessionState | null;
  connected: boolean;
  /** True if WS gave up and caller should enable Apollo polling */
  fallbackToPolling: boolean;
  error: string | null;
  send: (msg: ClientMessage) => void;
}

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const DEFAULT_MAX_RETRIES = 5;

export function useSessionSocket({ code, maxRetries = DEFAULT_MAX_RETRIES }: UseSessionSocketOptions): UseSessionSocketResult {
  const [session, setSession] = useState<SessionState | null>(null);
  const [connected, setConnected] = useState(false);
  const [fallbackToPolling, setFallbackToPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current || !code) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/?code=${encodeURIComponent(code.toUpperCase())}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setConnected(true);
        setError(null);
        retriesRef.current = 0;
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          if (msg.type === 'state') {
            setSession(msg.data);
            setError(null);
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        if (unmountedRef.current) return;
        setConnected(false);
        wsRef.current = null;

        if (event.code === 1000) return; // Clean close, don't reconnect

        retriesRef.current++;
        if (retriesRef.current > maxRetries) {
          setFallbackToPolling(true);
          return;
        }

        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
        backoffRef.current = delay * 2;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this — reconnection logic lives there
      };
    } catch {
      setFallbackToPolling(true);
    }
  }, [code, maxRetries]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { session, connected, fallbackToPolling, error, send };
}
