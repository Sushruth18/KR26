import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** True when the user asked the OS to reduce motion. Reactive. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/** Low-end device heuristic from CLAUDE.md §3: ≤4 cores or ≤2 GB. Computed once. */
export const isLowEndDevice: boolean = (() => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency;
  const mem = nav.deviceMemory;
  return (cores !== undefined && cores <= 4) || (mem !== undefined && mem <= 2);
})();

export function useLowEnd(): boolean {
  return isLowEndDevice;
}

/** Marks <html> so plain CSS can degrade (stars, parallax) without JS per component. */
export function applyDeviceFlags() {
  if (isLowEndDevice) document.documentElement.dataset.lowEnd = 'true';
}
