import { useClerk } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { authStartupState, watchAuthStartup } from '@/utils/authStartup';

export function useAuthStartup(ready: boolean) {
  const clerk = useClerk();
  const [state, setState] = useState(() => authStartupState(ready, clerk.status, false));
  useEffect(() => watchAuthStartup({
    ready,
    status: clerk.status,
    subscribe: (listener) => {
      clerk.on('status', listener);
      return () => clerk.off('status', listener);
    },
    onChange: setState,
  }), [clerk, ready]);
  return ready ? 'ready' : state;
}
