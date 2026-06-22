import { WS_URL, BASE_URL } from './api';
import axios from 'axios';

// Manages three WebSocket connections with JWT auth and auto-reconnect.
//   sensor  → ws/sensor-events/
//   worker  → ws/worker-statuses/
//   zone    → ws/zone-updates/   ← live geofence boundary from GPS task
//
// The backend consumer reads ?token=<access_token> from the query string
// and validates it with simplejwt before accepting the connection.

class WsService {
  constructor() {
    this._sockets   = {};   // key → WebSocket instance
    this._callbacks = {};   // key → onMessage handler
    this._timers    = {};   // key → reconnect timeout id
  }

  // Always read from localStorage so a refreshed token is picked up on reconnect
  _token() {
    return localStorage.getItem('access_token') || '';
  }

  // Silently refresh the access token using the stored refresh token.
  // Returns true on success, false when the session is truly dead.
  async _refreshToken() {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) return false;
      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
      localStorage.setItem('access_token', data.access);
      return true;
    } catch {
      return false;
    }
  }

  _open(key, path, onMsg) {
    clearTimeout(this._timers[key]);

    // Close any stale socket cleanly
    const stale = this._sockets[key];
    if (stale && stale.readyState < WebSocket.CLOSING) {
      stale.close(1000);
    }

    this._callbacks[key] = onMsg;

    try {
      const token = this._token();
      const url   = `${WS_URL}${path}?token=${encodeURIComponent(token)}`;
      const ws    = new WebSocket(url);
      this._sockets[key] = ws;

      ws.onmessage = (e) => {
        try { onMsg(JSON.parse(e.data)); } catch { /* malformed frame: ignore */ }
      };

      ws.onerror = () => {
        // onerror always fires before onclose; let onclose handle retry
      };

      ws.onclose = (ev) => {
        if (ev.code === 1000) return; // intentional clean disconnect do not retry

        if (ev.code === 4001) {
          // JWT was rejected by the consumer.
          // Attempt a silent token refresh then reconnect; if the refresh fails
          // the session is dead and we fire auth:logout so App logs the user out.
          this._refreshToken().then((ok) => {
            if (!ok) {
              window.dispatchEvent(new Event('auth:logout'));
              return;
            }
            // Token refreshed: reconnect after a short pause
            this._timers[key] = setTimeout(
              () => this._open(key, path, this._callbacks[key]),
              1000,
            );
          });
          return;
        }

        // Any other unexpected close (network hiccup, server restart, …) → retry
        this._timers[key] = setTimeout(
          () => this._open(key, path, this._callbacks[key]),
          4000,
        );
      };
    } catch (err) {
      console.warn(`WS [${key}] connect error:`, err.message);
      this._timers[key] = setTimeout(
        () => this._open(key, path, this._callbacks[key]),
        4000,
      );
    }
  }

  connect(onSensor, onWorker, onZone) {
    this._open('sensor', '/ws/sensor-events/',   onSensor);
    this._open('worker', '/ws/worker-statuses/', onWorker);
    if (onZone) this._open('zone', '/ws/zone-updates/', onZone);
  }

  disconnect() {
    Object.values(this._timers).forEach(clearTimeout);
    this._timers = {};

    Object.values(this._sockets).forEach((ws) => {
      if (ws?.readyState < WebSocket.CLOSING) ws.close(1000);
    });

    this._sockets   = {};
    this._callbacks = {};
  }
}

export const wsService = new WsService();