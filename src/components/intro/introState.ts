/**
 * Whether the intro splash (CLAUDE.md §5.0) plays: once per session, only when the visit starts on
 * Home (deep links to /register etc. go straight to their page), never under reduced motion.
 * Decided once at startup; the hero reads `introShowing()` to render its palace already lit.
 *
 * Dev only (stripped from production builds): `?intro=1` on any page shows it again even if this
 * session has seen it; `?intro=hold` also shows it and keeps it up (no auto-close) for screenshots.
 * Reduced motion still wins over both.
 */
import { useSyncExternalStore } from 'react';
import { getItem, setItem } from '../../lib/storage';

export const SEEN_KEY = 'seenIntro';

const devForce =
  import.meta.env.DEV && typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('intro') ?? '') : '';

/** Dev `?intro=hold`: the splash does not lift away by itself (Skip / Esc still close it). */
export const introHold = devForce === 'hold';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let showing =
  typeof window !== 'undefined' &&
  !reducedMotion &&
  (devForce === '1' || introHold || (window.location.pathname === '/' && getItem('session', SEEN_KEY) !== '1'));

// Any first page view counts as "seen" — a reload mid-splash, or landing elsewhere first, never replays it.
setItem('session', SEEN_KEY, '1');

const listeners = new Set<() => void>();

export function introShowing(): boolean {
  return showing;
}

export function endIntro() {
  if (!showing) return;
  showing = false;
  listeners.forEach((l) => l());
}

export function useIntroShowing(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => showing,
    () => false,
  );
}
