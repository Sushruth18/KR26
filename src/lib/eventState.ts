/**
 * One place that decides whether an event can be registered for. The Sheet (live status) wins over
 * events.json/site.json; if the status endpoint failed we fall back to the data files + client clock.
 */
import type { CompetitionEvent, SiteConfig } from './schemas';
import type { LiveEventStatus } from './api';

export type EventState = 'open' | 'few' | 'full' | 'closed' | 'deadline' | 'opensSoon' | 'completed';

export interface ResolvedEvent {
  state: EventState;
  /** null = unknown (live status unavailable) */
  seatsLeft: number | null;
  seats: number;
  deadline: string;
  canRegister: boolean;
}

const FEW_SEATS_RATIO = 0.15;

export function resolveEventState(
  event: CompetitionEvent,
  live: LiveEventStatus | undefined,
  site: SiteConfig,
  now: number = Date.now(),
): ResolvedEvent {
  const deadline = live?.deadline ?? event.deadline;
  const seats = live?.seats ?? event.seats;
  const result = (state: EventState, seatsLeft: number | null): ResolvedEvent => ({
    state,
    seatsLeft,
    seats,
    deadline,
    canRegister: state === 'open' || state === 'few',
  });

  if (event.completed) return result('completed', live?.seatsLeft ?? null);
  const pastDeadline = now >= Date.parse(deadline);

  if (live) {
    if (!live.isOpen) {
      if (pastDeadline) return result('deadline', live.seatsLeft);
      if (now < Date.parse(site.registrationOpen)) return result('opensSoon', live.seatsLeft);
      return result('closed', live.seatsLeft);
    }
    if (live.seatsLeft <= 0) return result('full', 0);
    if (live.seatsLeft <= Math.ceil(seats * FEW_SEATS_RATIO)) return result('few', live.seatsLeft);
    return result('open', live.seatsLeft);
  }

  // Fallback: no live data.
  if (pastDeadline) return result('deadline', null);
  if (now < Date.parse(site.registrationOpen)) return result('opensSoon', null);
  return result('open', null);
}
