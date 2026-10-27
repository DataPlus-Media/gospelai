export type AuthStartupState = 'connecting' | 'ready' | 'failed' | 'timedOut';

// Ready always wins: a delayed SDK can recover without restarting the app.
export function authStartupState(
  ready: boolean,
  status: string,
  timedOut: boolean
): AuthStartupState {
  if (ready) return 'ready';
  if (status === 'error') return 'failed';
  return timedOut ? 'timedOut' : 'connecting';
}

export function watchAuthStartup({
  ready, status, subscribe, onChange, schedule = setTimeout, cancel = clearTimeout,
}: {
  ready: boolean;
  status: string;
  subscribe: (listener: (status: string) => void) => () => void;
  onChange: (state: AuthStartupState) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  let currentStatus = status;
  let timedOut = false;
  const update = () => onChange(authStartupState(ready, currentStatus, timedOut));
  update();
  if (ready) return () => {};
  const unsubscribe = subscribe((next) => { currentStatus = next; update(); });
  const timer = schedule(() => { timedOut = true; update(); }, 12000);
  return () => { cancel(timer); unsubscribe(); };
}

// Only return a validated public hostname and environment label, never the key.
export function publicAuthConfiguration(key?: string) {
  const match = key?.match(/^pk_(test|live)_([A-Za-z0-9+/_=-]+)$/);
  if (!match) return { environment: 'invalid', hostname: 'unavailable' };
  try {
    const decoded = atob(match[2].replace(/-/g, '+').replace(/_/g, '/'));
    const hostname = decoded.endsWith('$') ? decoded.slice(0, -1) : '';
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) {
      throw new Error('Invalid hostname');
    }
    return { environment: match[1], hostname };
  } catch {
    return { environment: 'invalid', hostname: 'unavailable' };
  }
}

// A full JS reload is supported in Expo release builds. Remounting ClerkProvider
// alone reuses Expo Clerk's failed native singleton and does not restart it.
// Never clear SecureStore, and never persist form contents for this operation.
export async function retryAuthStartup(reload: () => Promise<void>) {
  await reload();
}
