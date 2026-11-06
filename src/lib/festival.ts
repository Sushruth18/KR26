/**
 * Time-dependent festival state for the Home page: the four countdown phases (CLAUDE.md §5.1),
 * the registration window, and the ≤ 3-days deadline banner. Pure functions of (site, now).
 */
import type { SiteConfig } from './schemas';
import { istParts } from './format';

export type CountdownPhase =
  /** Before Day 1 starts → count down to competitionsStart. */
  | { kind: 'competitions'; target: string }
  /** During Day 1 competitions → "Competitions are on!" + count down to eventStart. */
  | { kind: 'competitionsOn'; target: string }
  /** After competitions, before Day 2 → count down to eventStart. */
  | { kind: 'procession'; target: string }
  /** During Day 2. */
  | { kind: 'live' }
  /** After eventEnd. */
  | { kind: 'over' };

export function countdownPhase(site: SiteConfig, t: number): CountdownPhase {
  if (t < Date.parse(site.competitionsStart)) return { kind: 'competitions', target: site.competitionsStart };
  if (t < Date.parse(site.competitionsEnd)) return { kind: 'competitionsOn', target: site.eventStart };
  if (t < Date.parse(site.eventStart)) return { kind: 'procession', target: site.eventStart };
  if (t < Date.parse(site.eventEnd)) return { kind: 'live' };
  return { kind: 'over' };
}

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function remaining(targetIso: string, t: number): Remaining {
  const s = Math.max(0, Math.floor((Date.parse(targetIso) - t) / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
}

/** Registration is open from the start (no opening date) until `registrationClose`. */
export type RegistrationWindow = 'open' | 'closed';

export function registrationWindow(site: SiteConfig, t: number): RegistrationWindow {
  if (t < Date.parse(site.registrationClose)) return 'open';
  return 'closed';
}

/** IST calendar day number (days since epoch), so "days left" counts dates, not 24 h blocks. */
function istDay(t: number): number {
  const p = istParts(t);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86400000);
}

/**
 * Calendar days until registration closes (0 = closes today), or null when the banner should not show:
 * already closed, or more than 3 days away.
 */
export function deadlineDaysLeft(site: SiteConfig, t: number): number | null {
  if (registrationWindow(site, t) !== 'open') return null;
  const days = istDay(Date.parse(site.registrationClose)) - istDay(t);
  return days <= 3 ? days : null;
}
