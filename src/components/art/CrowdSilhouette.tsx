import { useId } from 'react';

/**
 * Spectators lining the procession route: two rows of heads and shoulders, a few raised Karnataka
 * flags and torches. Generated once (deterministic). Kept compact: shoulders are one path per row in
 * short relative integer commands; heads are round-capped dots ("M x yh0") grouped by radius.
 */
const W = 3200;
const H = 96;
const R = Math.round;

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Row {
  shoulders: string;
  /** head radius → dots */
  heads: Map<number, string>;
}

/** Rounded shoulders from the ground up to the shoulder line `s`, half-width `sw`. */
function shoulders(x: number, s: number, sw: number): string {
  const rise = H - s - 8;
  return `M${x - sw} ${H}v-${rise}q0-8 8-8h${2 * sw - 16}q8 0 8 8v${rise}z`;
}

function addPerson(row: Row, x: number, headY: number, r: number, sw: number) {
  row.shoulders += shoulders(R(x), R(headY + r + 3), R(sw));
  row.heads.set(r, (row.heads.get(r) ?? '') + `M${R(x)} ${R(headY)}h0`);
}

interface Prop {
  x: number;
  top: number;
  hand: number;
}

function build() {
  const back: Row = { shoulders: '', heads: new Map() };
  const front: Row = { shoulders: '', heads: new Map() };
  const flags: Prop[] = [];
  const torches: Prop[] = [];
  let i = 0;
  for (let x = 6; x < W; x += 19 + rand(i) * 9, i++) {
    const r = [6.5, 7.5, 8.5][Math.floor(rand(i + 500) * 3)]!;
    const headY = 44 + rand(i + 900) * 9;
    addPerson(back, x, headY, r, 11 + rand(i + 1300) * 3);
    if (i % 23 === 7) torches.push({ x: R(x + 9), top: R(headY - 34), hand: R(headY + r + 6) });
  }
  let j = 0;
  for (let x = 14; x < W; x += 26 + rand(j + 2000) * 10, j++) {
    const r = [8, 9, 10][Math.floor(rand(j + 2500) * 3)]!;
    const headY = 60 + rand(j + 2900) * 7;
    addPerson(front, x, headY, r, 14 + rand(j + 3300) * 4);
    if (j % 11 === 4) flags.push({ x: R(x + 12), top: R(headY - 32), hand: R(headY + r + 6) });
  }
  return { back, front, flags, torches };
}

const CROWD = build();

function RowPaths({ row, paint }: { row: Row; paint: string }) {
  return (
    <>
      <path d={row.shoulders} fill={paint} />
      {[...row.heads].map(([r, d]) => (
        <path key={r} d={d} stroke={paint} strokeWidth={r * 2} strokeLinecap="round" />
      ))}
    </>
  );
}

export function CrowdSilhouette({ className = '' }: { className?: string }) {
  const glow = `crowd-glow-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#FFD27A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
        {/* Heads catch a little palace light (lighter at the top), so the crowd reads as people, not a band. */}
        <linearGradient id={`${glow}-b`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="#2A2350" />
          <stop offset="0.75" stopColor="#0D0B24" />
        </linearGradient>
        <linearGradient id={`${glow}-f`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0.45" stopColor="#1B1638" />
          <stop offset="0.85" stopColor="#06051A" />
        </linearGradient>
      </defs>
      {CROWD.torches.map((p) => (
        <g key={`t${p.x}`}>
          <circle cx={p.x + 3} cy={p.top} r="22" fill={`url(#${glow})`} />
          <path d={`M${p.x} ${p.hand}L${p.x + 3} ${p.top + 6}`} stroke="#0D0B24" strokeWidth="3" strokeLinecap="round" />
          <path d={`M${p.x + 3} ${p.top - 9}c3 4 5 6 4 9a4 4 0 0 1-8 0c-1-3 1-5 4-9Z`} fill="#F5B841" />
        </g>
      ))}
      <RowPaths row={CROWD.back} paint={`url(#${glow}-b)`} />
      {CROWD.flags.map((p) => (
        <g key={`f${p.x}`}>
          <path d={`M${p.x} ${p.hand}L${p.x + 4} ${p.top}`} stroke="#06051A" strokeWidth="3.2" strokeLinecap="round" />
          <path d={`M${p.x + 4} ${p.top}h17v6h-17Z`} fill="#FFD500" fillOpacity="0.9" />
          <path d={`M${p.x + 4} ${p.top + 6}h17v6h-17Z`} fill="#E31B23" fillOpacity="0.9" />
        </g>
      ))}
      <RowPaths row={CROWD.front} paint={`url(#${glow}-f)`} />
    </svg>
  );
}
