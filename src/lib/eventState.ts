/**
 * One place that decides whether an event can be registered for. Registration is open from the start:
 * an event is open unless a coordinator closed it (is_open FALSE in the Sheet) or its deadline has passed.
 * The Sheet (live status) wins over events.json; if the status endpoint failed we fall back to the data
 * file + client clock. There are no seat limits.
 */
import type { CompetitionEvent } from './schemas';
import type { LiveEventStatus } from './api';

export type EventState = 'open' | 'closed' | 'deadline' | 'completed';

export interface ResolvedEvent {
  state: EventState;
  deadline: string;
  canRegister: boolean;
}

export function resolveEventState(
  event: CompetitionEvent,
  live: LiveEventStatus | undefined,
  now: number = Date.now(),
): ResolvedEvent {
  const deadline = live?.deadline ?? event.deadline;
  const result = (state: EventState): ResolvedEvent => ({ state, deadline, canRegister: state === 'open' });

  if (event.completed) return result('completed');
  const pastDeadline = now >= Date.parse(deadline);

  if (live) {
    if (live.isOpen) return result('open'); // the server already applied the deadline
    return result(pastDeadline ? 'deadline' : 'closed');
  }
  return result(pastDeadline ? 'deadline' : 'open'); // no live data: events.json + the clock
}
