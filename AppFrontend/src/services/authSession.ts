export interface SessionExpiredPayload {
  message: string;
  endpoint?: string;
}

type Listener = (payload: SessionExpiredPayload) => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySessionExpired(payload: SessionExpiredPayload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn('Session-expired listener failed:', error);
    }
  });
}