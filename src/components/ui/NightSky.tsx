import { useMemo } from 'react';
import { isLowEndDevice } from '../../hooks/useMotionPrefs';

const FULL = 36; // CLAUDE.md: ≤ 40 stars
const LOW_END = 14;

/** Deterministic pseudo-random so SSR/refresh never reshuffles the sky. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function NightSky() {
  const stars = useMemo(
    () =>
      Array.from({ length: isLowEndDevice ? LOW_END : FULL }, (_, i) => ({
        left: rand(i + 1) * 100,
        top: rand(i + 101) * 70,
        size: 1 + Math.round(rand(i + 201) * 1.5),
        dur: 3 + rand(i + 301) * 4,
        delay: rand(i + 401) * 4,
      })),
    [],
  );

  return (
    <div className="night-sky" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            ['--dur' as string]: `${s.dur}s`,
            ['--delay' as string]: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
