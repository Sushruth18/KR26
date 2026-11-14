/**
 * One place that decides whether an event can be registered for. Registration is open from the start:
 * an event is open unless a coordinator closed it (is_open FALSE in the Sheet) or its deadline has passed.
 * The Sheet (live status) wins over events.json; if the status endpoint failed we fall back to the data
 * file + client clock. Capped events (Treasure Hunt, Events → max_teams) are "full" when the server reports
 * seatsLeft 0, and "few seats left" at FEW_SEATS or fewer; without live data the cap is unknown, so they stay open.
 */
import type { CompetitionEvent } from './schemas';
import type { LiveEventStatus } from './api';

export type EventState = 'open' | 'full' | 'closed' | 'deadline' | 'completed';

/** "Few seats left" is shown at this many places or fewer. */
export const FEW_SEATS = 4;

export interface ResolvedEvent {
  state: EventState;
  deadline: string;
  canRegister: boolean;
  /** Places left on a capped event (live status only); null = no cap or unknown. */
  seatsLeft: number | null;
  /** Open, capped and FEW_SEATS or fewer places left. */
  few: boolean;
}

export function resolveEventState(
  event: CompetitionEvent,
  live: LiveEventStatus | undefined,
  now: number = Date.now(),
): ResolvedEvent {
  const deadline = live?.deadline ?? event.deadline;
  const seatsLeft = typeof live?.seatsLeft === 'number' ? Math.max(0, live.seatsLeft) : null;
  const result = (state: EventState): ResolvedEvent => ({
    state,
    deadline,
    canRegister: state === 'open',
    seatsLeft,
    few: state === 'open' && seatsLeft !== null && seatsLeft <= FEW_SEATS,
  });

  if (event.completed) return result('completed');
  const pastDeadline = now >= Date.parse(deadline);

  if (live) {
    if (live.isOpen) return result(seatsLeft === 0 ? 'full' : 'open'); // the server already applied the deadline
    return result(pastDeadline ? 'deadline' : 'closed');
  }
  return result(pastDeadline ? 'deadline' : 'open'); // no live data: events.json + the clock
}
