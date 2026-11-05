/**
 * Whether the intro splash (CLAUDE.md §5.0) plays: once per session, only when the visit starts on
 * Home (deep links to /register etc. go straight to their page), never under reduced motion.
 * Decided once at startup; the hero reads `introShowing()` to render its palace already lit.
 */
import { useSyncExternalStore } from 'react';
import { getItem, setItem } from '../../lib/storage';

export const SEEN_KEY = 'seenIntro';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let showing = typeof window !== 'undefined' && window.location.pathname === '/' && !reducedMotion && getItem('session', SEEN_KEY) !== '1';

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
