/**
 * Team photos: match the files Google Forms downloaded ("<original name> - <uploader name>.<ext>") to
 * form rows, and turn a source photo into a 4:5 portrait set of WebP copies (480/960/1600 + blur-up).
 * Photo files and their names stay private — only the processed copies and the sizes are written.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import convert from 'heic-convert';
import sharp from 'sharp';
import type { TeamPhoto } from '../../src/lib/team';

export interface SourceFile {
  path: string;
  /** Original file name without the " - uploader" part and the extension (e.g. "IMG-20260821-WA0064"): safe to show. */
  original: string;
  /** The uploader's label (name, department, sometimes a USN): used for matching only, never printed or stored. */
  label: string;
  sha1: string;
}

export function listSourceFiles(dir: string): SourceFile[] {
  return readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp|heic|heif)$/i.test(f))
    .sort()
    .map((f) => {
      const base = f.slice(0, f.length - extname(f).length);
      const at = base.indexOf(' - ');
      const path = join(dir, f);
      return {
        path,
        original: (at === -1 ? base : base.slice(0, at)).trim(),
        label: at === -1 ? base : base.slice(at + 3),
        sha1: createHash('sha1').update(readFileSync(path)).digest('hex'),
      };
    });
}

// ---------- matching ----------

/** Department / batch words that appear in uploader labels ("Name AIML-4", "Name CSE-12", "Name MECH-2025-29"). */
const NOISE = new Set(['cse', 'cs', 'aiml', 'ai', 'csbs', 'ise', 'ece', 'eee', 'ete', 'mech', 'me', 'civil', 'diploma', 'mba', 'mca']);

export function nameTokens(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && !/\d/.test(t) && !NOISE.has(t));
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** How two words relate: the same word (or a one-letter typo in 5+ letters), an initial of the other, or nothing. */
function tokenRelation(a: string, b: string): 'word' | 'initial' | null {
  if (a === b) return a.length > 1 ? 'word' : 'initial';
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) return 'initial';
  return Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= 1 ? 'word' : null;
}

/** Share of x's words found in y, and how many of them were whole words (not just initials). */
function cover(x: string[], y: string[]): { share: number; words: number } {
  let hits = 0;
  let words = 0;
  for (const t of x) {
    const rel = y.map((u) => tokenRelation(t, u));
    if (rel.includes('word')) {
      hits++;
      words++;
    } else if (rel.includes('initial')) hits++;
  }
  return { share: x.length ? hits / x.length : 0, words };
}

/**
 * 1 = every word of the form name appears in the uploader label (or the other way round), with at
 * least one whole word in common — initials alone ("M B" vs "Manjunath Biradar") never make a match.
 */
export function nameScore(formName: string, label: string): number {
  const n = nameTokens(formName);
  const l = nameTokens(label);
  if (!n.length || !l.length) return 0;
  if (n.join('') === l.join('')) return 1;
  const forward = cover(n, l);
  const backward = cover(l, n);
  return Math.max(forward.words ? forward.share : 0, backward.words ? backward.share : 0);
}

export interface PhotoPerson {
  id: string;
  name: string;
  email: string;
}

export type PhotoMatch =
  | { kind: 'assigned'; file: SourceFile }
  | { kind: 'ambiguous'; candidates: SourceFile[] }
  | { kind: 'none' };

export interface PhotoOverride {
  /** Unique substring of the photo's original file name (not of the uploader label). */
  file?: string;
  /** Where the crop should be centred, 0–1 of the photo's width/height. */
  focus?: { x: number; y: number };
  /** Crop tighter than the full 4:5 window (e.g. 1.8 for a small figure in a full-length photo). */
  zoom?: number;
}

/**
 * Decides which file belongs to whom. A match is certain only when the evidence leaves no choice:
 * a file whose uploader label names exactly one person. Several people sharing an e-mail address
 * (someone filled the form for friends) and several photos from one uploader stay "ambiguous" until
 * team-photo-map.json says who is who — a wrong face under a name is worse than an initials frame.
 */
export function matchPhotos(
  people: PhotoPerson[],
  files: SourceFile[],
  overrides: Record<string, PhotoOverride>,
): Map<string, PhotoMatch> {
  const result = new Map<string, PhotoMatch>();
  const uniq = (list: SourceFile[]) => [...new Map(list.map((f) => [f.sha1, f])).values()];

  const cand = new Map<string, SourceFile[]>();
  for (const p of people) cand.set(p.id, uniq(files.filter((f) => nameScore(p.name, f.label) >= 1)));

  // A file several different people could be (two "Tejas" …) is nobody's until confirmed.
  const claims = new Map<string, Set<string>>();
  for (const p of people) for (const f of cand.get(p.id)!) (claims.get(f.sha1) ?? claims.set(f.sha1, new Set()).get(f.sha1)!).add(p.id);

  const byEmail = new Map<string, PhotoPerson[]>();
  for (const p of people) (byEmail.get(p.email || p.id) ?? byEmail.set(p.email || p.id, []).get(p.email || p.id)!).push(p);

  const assigned = new Set<string>(); // file sha1s
  for (const group of byEmail.values()) {
    const pool = uniq(group.flatMap((p) => cand.get(p.id)!));
    const open = new Set(group.map((p) => p.id));
    let progress = true;
    while (progress) {
      progress = false;
      const unmatched = [...open].filter((id) => cand.get(id)!.length === 0);
      for (const id of [...open]) {
        const own = cand.get(id)!.filter((f) => !assigned.has(f.sha1));
        // The only person of the group without a name match gets whatever the others left over.
        const options = cand.get(id)!.length ? own : unmatched.length === 1 ? pool.filter((f) => !assigned.has(f.sha1)) : [];
        const file = options.length === 1 ? options[0]! : null;
        if (!file) continue;
        const claimants = claims.get(file.sha1);
        if (claimants && [...claimants].some((c) => c !== id && !group.some((g) => g.id === c))) continue; // wanted by someone outside the group
        if (cand.get(id)!.length && claimants && claimants.size > 1) continue; // another named person could be this photo
        result.set(id, { kind: 'assigned', file });
        assigned.add(file.sha1);
        open.delete(id);
        progress = true;
      }
    }
    for (const id of open) {
      const left = pool.filter((f) => !assigned.has(f.sha1));
      const own = cand.get(id)!.filter((f) => !assigned.has(f.sha1));
      const candidates = own.length ? own : left;
      result.set(id, candidates.length ? { kind: 'ambiguous', candidates } : { kind: 'none' });
    }
  }

  for (const p of people) {
    const want = overrides[p.id]?.file;
    if (!want) continue;
    const hits = uniq(files.filter((f) => f.original.includes(want)));
    if (hits.length !== 1) throw new Error(`team-photo-map.json: "${want}" (for ${p.id}) matches ${hits.length} photos — it must match exactly one`);
    result.set(p.id, { kind: 'assigned', file: hits[0]! });
  }
  return result;
}

// ---------- processing ----------

const WIDTHS = [480, 960, 1600] as const;
const ASPECT = 0.8; // 4:5 portrait

export interface ProcessedPhoto {
  photo: TeamPhoto;
  /** Notes for the report (never a name or a path). */
  flags: string[];
  /** Focus used, as fractions of the photo. */
  focus: { x: number; y: number };
}

async function loadRotated(path: string): Promise<{ buf: Buffer; trimmed: boolean }> {
  let buf: Buffer = readFileSync(path);
  if (/\.hei[cf]$/i.test(path)) buf = Buffer.from(await convert({ buffer: buf, format: 'JPEG', quality: 0.95 }));
  // Bake the EXIF rotation into the pixels (sharp drops EXIF — and with it any GPS tag — on output).
  const rotated = await sharp(buf).rotate().toBuffer();
  // Screenshots often come with black letterbox bars (sometimes with a status-bar icon in them): cut
  // away outer rows/columns that are almost entirely dark, when that is a real share of the picture.
  const grey = await sharp(rotated).resize({ width: 240, height: 240, fit: 'inside' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = grey.info;
  // A bar is (near) pure black — median under 8 — with at most a small icon in it. Dark photos have texture, so they fail this.
  const dark = (get: (i: number) => number, n: number) => {
    const values = Array.from({ length: n }, (_, i) => get(i)).sort((x, y) => x - y);
    return values[Math.floor(n / 2)]! < 8 && values.filter((v) => v > 60).length / n < 0.15;
  };
  const rowDark = (y: number) => dark((x) => grey.data[y * w + x]!, w);
  // The picture is the longest run of rows (then columns) that are not dark; a status-bar icon inside a bar is a short run.
  const longestRun = (n: number, isDark: (i: number) => boolean): [number, number] => {
    let best: [number, number] = [0, n];
    let bestLen = -1;
    for (let i = 0; i < n; ) {
      if (isDark(i)) {
        i++;
        continue;
      }
      let j = i;
      while (j < n && !isDark(j)) j++;
      if (j - i > bestLen) {
        bestLen = j - i;
        best = [i, j];
      }
      i = j;
    }
    return bestLen < 0 ? [0, n] : best;
  };
  const [top, bottom] = longestRun(h, rowDark);
  // Columns are judged on the picture rows only (the bars above and below would make every column look dark).
  const colDark = (x: number) => dark((y) => grey.data[(top + y) * w + x]!, bottom - top);
  const [left, right] = longestRun(w, colDark);
  if ((top + (h - bottom)) / h >= 0.08 || (left + (w - right)) / w >= 0.08) {
    const before = await sharp(rotated).metadata();
    const sx = before.width! / w;
    const sy = before.height! / h;
    const box = { left: Math.round(left * sx), top: Math.round(top * sy), width: Math.round((right - left) * sx), height: Math.round((bottom - top) * sy) };
    return { buf: await sharp(rotated).extract(box).toBuffer(), trimmed: true };
  }
  return { buf: rotated, trimmed: false };
}

/** 4:5 crop box in source pixels. `focus` (0–1) places the centre; without it the attention strategy picks it. */
async function cropBox(
  src: Buffer,
  W: number,
  H: number,
  focus: { x: number; y: number } | undefined,
  zoom: number,
): Promise<{ left: number; top: number; width: number; height: number; focus: { x: number; y: number } }> {
  const width = Math.round((W / H >= ASPECT ? H * ASPECT : W) / zoom);
  const height = Math.round((W / H >= ASPECT ? H : W / ASPECT) / zoom);
  let fx = focus?.x;
  let fy = focus?.y;
  if (fx === undefined || fy === undefined) {
    // Sharp's "attention" crop (skin tones, saturation, detail) on a small copy finds the subject —
    // in portraits, the face. It is heuristic, so a per-person `focus` in team-photo-map.json overrides it.
    const small = await sharp(src).resize({ width: 900, height: 900, fit: 'inside' }).toBuffer();
    const sm = await sharp(small).metadata();
    const cw = sm.width! / sm.height! >= ASPECT ? Math.round(sm.height! * ASPECT) : sm.width!;
    const ch = sm.width! / sm.height! >= ASPECT ? sm.height! : Math.round(sm.width! / ASPECT);
    const { info } = await sharp(small)
      .resize(cw, ch, { fit: 'cover', position: sharp.strategy.attention })
      .toBuffer({ resolveWithObject: true });
    const offX = Math.abs(info.cropOffsetLeft ?? 0);
    const offY = Math.abs(info.cropOffsetTop ?? 0);
    fx = (offX + cw / 2) / sm.width!;
    fy = (offY + ch / 2) / sm.height!;
  }
  const left = Math.max(0, Math.min(W - width, Math.round(fx * W - width / 2)));
  const top = Math.max(0, Math.min(H - height, Math.round(fy * H - height / 2)));
  return { left, top, width, height, focus: { x: fx, y: fy } };
}

export async function processPhoto(
  file: SourceFile,
  id: string,
  outDir: string,
  publicBase: string,
  override: PhotoOverride = {},
): Promise<ProcessedPhoto> {
  const { buf: src, trimmed } = await loadRotated(file.path);
  const meta = await sharp(src).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const box = await cropBox(src, W, H, override.focus, Math.max(1, override.zoom ?? 1));
  const cropped = await sharp(src).extract(box).toBuffer();

  const flags: string[] = [];
  if (trimmed) flags.push('black borders were cut off the screenshot — check the framing');
  if (Math.min(W, H) < 600) flags.push(`low resolution (${W}×${H}px) — please ask for a larger photo`);
  const aspect = W / H;
  if (aspect < 0.6 || aspect > 1.25) flags.push(`${W}×${H}px is far from a 4:5 portrait, so a lot is cropped away — check the framing`);

  const widths: number[] = WIDTHS.filter((w) => w <= box.width);
  if (!widths.length) widths.push(box.width); // never upscale
  mkdirSync(outDir, { recursive: true });
  const variants: TeamPhoto['variants'] = [];
  for (const w of widths) {
    const h = Math.round(w / ASPECT);
    const buf = await sharp(cropped)
      .resize(w, h, { fit: 'cover', kernel: 'lanczos3' })
      .webp({ quality: w >= 1600 ? 72 : 78, effort: 5, smartSubsample: true })
      .toBuffer();
    const name = `${id}-${w}w.${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.webp`;
    writeFileSync(join(outDir, name), buf);
    variants.push({ w, src: `${publicBase}/${name}` });
  }
  const blur = await sharp(cropped).resize(16, 20, { fit: 'cover' }).webp({ quality: 45 }).toBuffer();
  const top = variants[variants.length - 1]!;
  return {
    photo: { width: top.w, height: Math.round(top.w / ASPECT), blur: `data:image/webp;base64,${blur.toString('base64')}`, variants },
    flags,
    focus: box.focus,
  };
}
