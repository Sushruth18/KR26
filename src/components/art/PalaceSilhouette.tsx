import { useId } from 'react';
import { FLAG, PALACE, VIEW } from './palaceGeometry';

export type PalaceMode = 'animate' | 'lit';

interface Props {
  /** animate = bulbs switch on row by row (bottom → top, ~1.6 s); lit = final state immediately. */
  mode: PalaceMode;
  /** Gentle shimmer once lit (off for reduced motion / low-end devices). */
  twinkle: boolean;
  /** How many of the 3 twinkle sets of bulbs to light (fewer = fewer bulbs, for low-end devices). Default all. */
  lightSets?: number;
  className?: string;
}

const viewBox = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

/**
 * Mysuru-palace facade outlined in bulbs. The base drawing is one SVG; the lights are three stacked SVGs
 * (one per twinkle set) so the shimmer animates whole-layer opacity on the compositor — no repaints.
 * Decorative: the page heading carries the meaning.
 */
export function PalaceSilhouette({ mode, twinkle, lightSets = PALACE.rows.length, className = '' }: Props) {
  const gid = `gild-${useId().replace(/:/g, '')}`;
  return (
    <div className={`palace ${className}`} data-mode={mode} data-twinkle={twinkle} aria-hidden="true">
      <svg viewBox={viewBox} className="palace-layer" focusable="false">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD27A" stopOpacity="0.5" />
            <stop offset="1" stopColor="#C98A1B" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <path d={PALACE.mass} className="palace-mass" />
        <path d={PALACE.gilded} fill={`url(#${gid})`} />
        <path d={PALACE.openings} className="palace-openings" />
        <path d={PALACE.unlit} className="palace-unlit" />
        <path d={FLAG.yellow} fill="#FFD500" />
        <path d={FLAG.red} fill="#E31B23" />
      </svg>
      {PALACE.rows.slice(0, lightSets).map((rows, set) => (
        <svg key={set} viewBox={viewBox} className={`palace-layer palace-lights palace-set-${set}`} focusable="false">
          {rows.map((d, row) =>
            d ? (
              <g key={row} className="palace-row" style={{ ['--row' as string]: row }}>
                <path d={d} className="bulb-halo" />
                <path d={d} className="bulb-core" />
              </g>
            ) : null,
          )}
        </svg>
      ))}
    </div>
  );
}
