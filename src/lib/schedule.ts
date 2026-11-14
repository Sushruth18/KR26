/**
 * Event Details timeline logic, pure functions of (data, now). Day 2 comes from schedule.json, Day 1 from
 * events.json. Day 2 stops carry a start time only: a stop is "current" from its start until the next stop starts,
 * and the last stop runs until site.json → eventEnd. Day 1 competitions run in parallel (see day1States).
 */
import { events, schedule, site } from './data';
import { istParts } from './format';
import type { CompetitionEvent, ScheduleItem } from './schemas';
import { isTodo } from './format';

export type Day = 1 | 2;

export const day2Stops: ScheduleItem[] = schedule.filter((s) => s.day === 2).sort((a, b) => a.start.localeCompare(b.start));

/** Instant of a wall-clock "HH:MM" (IST) on a "YYYY-MM-DD" date. */
export function istInstant(date: string, hhmm: string): number {
  return Date.parse(`${date}T${hhmm}:00+05:30`);
}

export interface Position {
  /** Index of the stop happening now, or -1. */
  current: number;
  /** Index of the stop that starts next, or -1 (during the last stop, or when the day is over). */
  next: number;
}

/** Where `t` sits among stops with ascending start instants; the last stop runs until `endMs`. */
export function positionIn(startsMs: number[], endMs: number, t: number): Position {
  if (!startsMs.length || t >= endMs) return { current: -1, next: -1 };
  let current = -1;
  for (let i = 0; i < startsMs.length; i++) if (startsMs[i]! <= t) current = i;
  const next = current + 1 < startsMs.length ? current + 1 : -1;
  return { current, next };
}

export function day2Position(t: number): Position {
  return positionIn(
    day2Stops.map((s) => istInstant(site.day2Date, s.start)),
    Date.parse(site.eventEnd),
    t,
  );
}

/** Day 1: competitions with a confirmed time, ascending; the rest ("time to be announced") keep their data order. */
export function day1Groups(): { timed: CompetitionEvent[]; tba: CompetitionEvent[] } {
  const timed = events.filter((e) => !isTodo(e.time)).sort((a, b) => a.time.localeCompare(b.time));
  const tba = events.filter((e) => isTodo(e.time));
  return { timed, tba };
}

/**
 * Day 1 competitions run side by side (all 12:30–16:30), so several can be "current" at once. Each one is current
 * from its start until its endTime (without one: until the next later start, or competitionsEnd). Every competition
 * with the earliest start still ahead is "next"; once it has ended it is "past".
 */
export function day1States(timed: CompetitionEvent[], t: number): StopState[] {
  const dayEnd = Date.parse(site.competitionsEnd);
  const starts = timed.map((e) => istInstant(e.date, e.time));
  const ends = timed.map((e, i) => {
    if (e.endTime) return istInstant(e.date, e.endTime);
    const later = starts.filter((s) => s > starts[i]!);
    return later.length ? Math.min(...later) : dayEnd;
  });
  const ahead = starts.filter((s) => s > t);
  const nextStart = ahead.length ? Math.min(...ahead) : NaN;
  return timed.map((_, i) => {
    if (t >= ends[i]!) return 'past';
    if (starts[i]! <= t) return 'current';
    return starts[i] === nextStart ? 'next' : 'upcoming';
  });
}

/** Day 2 is the default tab, except on Day 1 itself (IST). */
export function defaultDay(t: number): Day {
  const p = istParts(t);
  const today = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return today === site.day1Date ? 1 : 2;
}

export function parseDay(value: string | null): Day | null {
  return value === '1' ? 1 : value === '2' ? 2 : null;
}

/** The headline-act stop (artist.json is shown on it). */
export const headlineStop = day2Stops.find((s) => s.headline);

export type StopState = 'past' | 'current' | 'next' | 'upcoming';

/** Timeline state of stop `i` given the Now / Next positions. */
export function stopState(i: number, current: number, next: number): StopState {
  if (i === current) return 'current';
  if (i === next) return 'next';
  return current >= 0 && i < current ? 'past' : 'upcoming';
}
