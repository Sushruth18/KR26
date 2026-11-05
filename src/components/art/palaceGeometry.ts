/**
 * Geometry for the Mysuru-palace silhouette, built once at module load (pure maths, no DOM).
 *
 * The facade is assembled from simple parts — wings with arcades, towers, onion domes, chhatris —
 * mirrored about the centre. Every outline that carries lights is also sampled into evenly spaced
 * bulb positions. Bulbs are emitted as zero-length round-capped subpaths ("M x yh0"), one <path> per
 * (row × twinkle-set), so ~1000 bulbs cost a handful of DOM nodes.
 */

export const VIEW = { x: 0, y: 80, w: 1600, h: 480 } as const;
const W = 1600;
const G = 556; // ground line
const SPACING = 11;
export const ROWS = 9;
export const SETS = 3;

type P = readonly [number, number];

const mass: string[] = [];
const openings: string[] = [];
const gilded: string[] = [];
const runs: P[][] = [];

const n1 = (v: number) => Math.round(v * 10) / 10;

// ---------- primitives ----------

function rect(x1: number, y1: number, x2: number, y2: number) {
  const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
  mass.push(`M${n1(a)} ${y1}H${n1(b)}V${y2}H${n1(a)}Z`);
}

function cubic(p0: P, c1: P, c2: P, p3: P, steps = 24): P[] {
  const out: P[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** Onion dome on a base line: bulges past its base, then draws in to a point. */
function dome(cx: number, base: number, hw: number, h: number, opts: { gild?: boolean; finial?: number; bulge?: number } = {}) {
  const k = opts.bulge ?? 1.28;
  const l0: P = [cx - hw, base];
  const lc1: P = [cx - hw * k, base - h * 0.42];
  const lc2: P = [cx - hw * 0.32, base - h * 0.6];
  const tip: P = [cx, base - h];
  const rc1: P = [cx + hw * 0.32, base - h * 0.6];
  const rc2: P = [cx + hw * k, base - h * 0.42];
  const r0: P = [cx + hw, base];
  const f = (p: P) => `${n1(p[0])} ${n1(p[1])}`;
  const d = `M${f(l0)}C${f(lc1)} ${f(lc2)} ${f(tip)}C${f(rc1)} ${f(rc2)} ${f(r0)}Z`;
  mass.push(d);
  if (opts.gild) gilded.push(d);
  runs.push([l0, ...cubic(l0, lc1, lc2, tip), ...cubic(tip, rc1, rc2, r0)]);
  if (opts.finial) {
    const top = base - h - opts.finial;
    mass.push(`M${n1(cx - 2.2)} ${n1(base - h + 2)}L${n1(cx)} ${n1(top)}L${n1(cx + 2.2)} ${n1(base - h + 2)}Z`);
    runs.push([tip, [cx, top]]);
  }
}

/** Little roof kiosk: plinth + dome. */
function chhatri(cx: number, base: number, hw: number) {
  rect(cx - hw - 2.5, base - 5, cx + hw + 2.5, base);
  dome(cx, base - 5, hw, hw * 2.4, { finial: 5, bulge: 1.2 });
}

/** Arched opening (filled warm), optionally outlined with bulbs. */
function arch(cx: number, base: number, hw: number, h: number) {
  const spring = base - (h - hw);
  openings.push(`M${n1(cx - hw)} ${base}V${n1(spring)}A${hw} ${hw} 0 0 1 ${n1(cx + hw)} ${n1(spring)}V${base}Z`);
  const pts: P[] = [[cx - hw, base]];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    pts.push([cx + hw * Math.cos(a), spring - hw * Math.sin(a)]);
  }
  pts.push([cx + hw, base]);
  runs.push(pts);
}

/** Horizontal / vertical light runs; ends inset half a bulb so meeting runs don't double up. */
function hRun(x1: number, x2: number, y: number) {
  const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
  runs.push([
    [a + SPACING / 2, y],
    [b - SPACING / 2, y],
  ]);
}
function vRun(x: number, y1: number, y2: number) {
  runs.push([
    [x, y1],
    [x, y2],
  ]);
}

// ---------- the facade ----------

function half(mirrored: boolean) {
  const X = (x: number) => (mirrored ? W - x : x);
  const R = (x1: number, y1: number, x2: number, y2: number) => rect(X(x1), y1, X(x2), y2);

  // End pavilion
  R(130, 440, 160, G);
  R(126, 434, 164, 440);
  dome(X(145), 434, 14, 34, { finial: 12 });
  vRun(X(130), G - 40, 446);
  vRun(X(160), G - 40, 446);
  arch(X(145), G - 4, 8, 40);

  // Outer wing: single-storey arcade
  R(160, 486, 330, G);
  hRun(X(160), X(330), 486);
  for (let cx = 180; cx <= 310; cx += 26) arch(X(cx), G - 4, 9, 44);
  chhatri(X(219), 486, 7);
  chhatri(X(271), 486, 7);

  // Corner tower
  R(330, 380, 380, G);
  R(324, 372, 386, 380);
  dome(X(355), 372, 20, 50, { finial: 14 });
  vRun(X(330), G - 40, 386);
  vRun(X(380), G - 40, 386);
  arch(X(355), 494, 8, 34);
  arch(X(355), 440, 8, 34);

  // Inner wing: two-storey arcade
  R(380, 450, 610, G);
  hRun(X(380), X(610), 450);
  hRun(X(380), X(610), 502);
  for (let cx = 397; cx <= 595; cx += 28.3) {
    arch(X(cx), 496, 9, 34);
    arch(X(cx), G - 4, 10, 42);
  }
  chhatri(X(440), 450, 8);
  chhatri(X(495), 450, 8);
  chhatri(X(550), 450, 8);

  // Flanking tower of the central block
  R(610, 340, 670, G);
  R(604, 332, 676, 340);
  dome(X(640), 332, 24, 58, { finial: 16 });
  vRun(X(610), G - 40, 346);
  vRun(X(670), G - 40, 346);
  arch(X(640), 412, 9, 36);
  arch(X(640), 372, 8, 28);
  arch(X(640), G - 4, 14, 50);

  // Central block (this half)
  R(670, 420, 800, G);
  hRun(X(670), X(740), 420);
  hRun(X(670), X(800), 472);
  for (let k = 0; k < 5; k++) arch(X(800 - 13 - 26 * k), 466, 9, 32);
  arch(X(722), G - 4, 20, 58);

  // Central tower (this half)
  R(740, 300, 800, 420);
  R(730, 292, 800, 300);
  vRun(X(740), 414, 300);
  hRun(X(740), X(800), 360);
  arch(X(770), 412, 9, 40);
  arch(X(771), 352, 8, 32);
  chhatri(X(742), 292, 9);
}

half(false);
half(true);

// Centre line: grand arch, tower windows, drum, gilded main dome, flag
arch(800, G - 4, 32, 76);
arch(800, 412, 10, 44);
arch(800, 352, 9, 34);
rect(756, 268, 844, 292);
hRun(730, 870, 296);
dome(800, 268, 50, 118, { gild: true, finial: 30 });
runs.push(
  // a rib of lights down the gilded dome
  [
    [800, 262],
    [800, 162],
  ],
);
const POLE_TOP = 92;
mass.push(`M799 120H801V${POLE_TOP}H799Z`);

// Karnataka flag pennant on the main dome (accent only)
export const FLAG = {
  yellow: `M801 ${POLE_TOP}L829 ${POLE_TOP + 6}L801 ${POLE_TOP + 6}Z`,
  red: `M801 ${POLE_TOP + 6}L829 ${POLE_TOP + 6}L801 ${POLE_TOP + 12}Z`,
};

// ---------- bulbs ----------

function sample(pts: P[], spacing: number): P[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1]!;
  const n = Math.max(1, Math.round(total / spacing));
  const out: P[] = [];
  let seg = 1;
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * total;
    while (seg < pts.length - 1 && cum[seg]! < d) seg++;
    const a = pts[seg - 1]!;
    const b = pts[seg]!;
    const len = cum[seg]! - cum[seg - 1]! || 1;
    const t = (d - cum[seg - 1]!) / len;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Row by height, bottom (0) to top: the order the lights switch on. */
const ROW_TOPS = [516, 476, 436, 396, 356, 316, 266, 200];
function rowOf(y: number): number {
  const i = ROW_TOPS.findIndex((top) => y >= top);
  return i === -1 ? ROWS - 1 : i;
}

const seen = new Set<string>();
const rows: string[][] = Array.from({ length: SETS }, () => Array.from({ length: ROWS }, () => ''));
let unlit = '';
let count = 0;
for (const run of runs) {
  for (const [x, y] of sample(run, SPACING)) {
    const key = `${Math.round(x / 4)},${Math.round(y / 4)}`; // drop near-duplicates where runs meet
    if (seen.has(key)) continue;
    seen.add(key);
    const dot = `M${Math.round(x)} ${Math.round(y)}h0`;
    const set = Math.abs((Math.round(x) * 73 + Math.round(y) * 151) % SETS);
    rows[set]![rowOf(y)] += dot;
    unlit += dot;
    count++;
  }
}

export const PALACE = {
  mass: mass.join(''),
  openings: openings.join(''),
  gilded: gilded.join(''),
  /** All bulbs, drawn dim before the lights come on. */
  unlit,
  /** rows[set][row] = path data for that twinkle set and lighting row. */
  rows,
  bulbCount: count,
};
