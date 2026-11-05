import { useEffect, useState } from 'react';
import { now } from '../lib/clock';

/**
 * Current time, re-rendering every `stepMs`. Ticks are aligned to the step boundary so a 1 s countdown
 * never skips or doubles a second.
 */
export function useNow(stepMs: number): number {
  const [t, setT] = useState(now);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          setT(now());
          schedule();
        },
        stepMs - (now() % stepMs) + 5,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [stepMs]);
  return t;
}
