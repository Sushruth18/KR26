import { useMemo } from 'react';
import { events } from '../lib/data';
import { resolveEventState, type ResolvedEvent } from '../lib/eventState';
import { useEventStatus } from './useEventStatus';

/**
 * Live status (Sheet) merged with events.json for every competition — the one source for
 * "can I register?" on the Competitions page and the Register form. Falls back to the data
 * files + client clock when the status endpoint fails (`failed`).
 */
export function useResolvedEvents() {
  const status = useEventStatus();
  const resolved = useMemo(() => {
    const out: Record<string, ResolvedEvent> = {};
    for (const e of events) out[e.id] = resolveEventState(e, status.data?.events[e.id]);
    return out;
  }, [status.data]);
  return { resolved, loading: status.loading, failed: status.failed, refresh: status.refresh };
}
