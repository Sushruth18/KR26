import { useEffect, useRef } from 'react';

/**
 * Scroll parallax without an animation library on the critical path: one passive scroll listener,
 * rAF-throttled, writing `transform` only (CLAUDE.md §3). Each layer sinks by `rate` px per px scrolled,
 * clamped to the first `range` px of the page (the hero sits at the top). Returns refs for the layers.
 */
export function useParallax<T extends HTMLElement>(rates: readonly number[], enabled: boolean, range = 1000) {
  const refs = useRef<(T | null)[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const els = refs.current;
    let raf = 0;
    let last = -1;
    const apply = () => {
      raf = 0;
      const y = Math.min(Math.max(window.scrollY, 0), range);
      if (y === last) return;
      last = y;
      els.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(0, ${(y * (rates[i] ?? 0)).toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      els.forEach((el) => el && (el.style.transform = ''));
    };
  }, [enabled, range, rates]);
  return (i: number) => (el: T | null) => {
    refs.current[i] = el;
  };
}
