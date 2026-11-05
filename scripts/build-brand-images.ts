/**
 * Brand logos → web-ready WebP copies.
 *   npm run brand:images
 * Reads the master files named in site.json → logos (paths under public/, e.g. /brand/college-logo.png),
 * writes resized WebP copies to public/brand/web/ with content-hashed names (cached for a year, see
 * netlify.toml) and records their sizes in src/data/logos.generated.json, which the components read.
 * The masters are never modified. Run this again whenever a master changes — validate-data (prebuild)
 * fails the build if a master no longer matches the generated copies. Not part of the build itself,
 * so the deploy never depends on sharp.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import sharp from 'sharp';
import site from '../src/data/site.json' with { type: 'json' };
import type { LogoAsset, LogoKey } from '../src/lib/logos';

/**
 * Output widths in px. They cover every displayed size at 1×–3× screens: college ≤ 64 CSS px wide
 * (Home, footer, pass), club ≤ 120 CSS px wide. The pass picks one fixed file (html-to-image ignores srcset).
 */
const WIDTHS: Record<LogoKey, number[]> = { college: [64, 128, 192], club: [120, 240, 360] };

const root = process.cwd();
const outDir = resolve(root, 'public/brand/web');
const manifestPath = resolve(root, 'src/data/logos.generated.json');
const sha1 = (buf: Buffer) => createHash('sha1').update(buf).digest('hex');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const manifest: Record<LogoKey, LogoAsset | null> = { college: null, club: null };
for (const key of Object.keys(WIDTHS) as LogoKey[]) {
  const source = site.logos[key];
  if (!source) continue;
  const abs = resolve(root, 'public', source.replace(/^\//, ''));
  if (!existsSync(abs)) throw new Error(`site.json → logos.${key}: ${source} not found in public/`);
  const master = readFileSync(abs);
  const meta = await sharp(master).metadata();
  if (!meta.width || !meta.height) throw new Error(`${source}: cannot read image size`);
  const stem = basename(source, extname(source));

  const variants: LogoAsset['variants'] = [];
  for (const w of WIDTHS[key].filter((w) => w <= meta.width!)) {
    const buf = await sharp(master)
      .resize({ width: w, kernel: 'lanczos3' })
      .webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true }) // q75–q90 look identical at 2× zoom
      .toBuffer();
    const file = `${stem}-${w}w.${sha1(buf).slice(0, 8)}.webp`;
    writeFileSync(resolve(outDir, file), buf);
    variants.push({ w, src: `/brand/web/${file}` });
    console.log(`  ${file}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
  if (!variants.length) throw new Error(`${source}: master is narrower than ${WIDTHS[key][0]}px`);
  manifest[key] = { source, sha1: sha1(master), width: meta.width, height: meta.height, variants };
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Wrote public/brand/web/ and src/data/logos.generated.json');
