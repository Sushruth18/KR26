import { useCallback, useEffect, useState } from 'react';
import { getStatus, type StatusResponse } from '../lib/api';

interface State {
  data: StatusResponse | null;
  loading: boolean;
  /** true when the live endpoint failed and the UI is using events.json + the client clock */
  failed: boolean;
}

export function useEventStatus() {
  const [s, setS] = useState<State>({ data: null, loading: true, failed: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getStatus()
      .then((data) => alive && setS({ data, loading: false, failed: false }))
      .catch(() => alive && setS({ data: null, loading: false, failed: true }));
    return () => {
      alive = false;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  return { ...s, refresh };
}
