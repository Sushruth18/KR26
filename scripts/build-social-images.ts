/**
 * Dev-only generator (not part of the build; the PNGs are committed): the social card and the icon set.
 *   npm run social:images
 *   → public/og.png (1200×630), favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png (maskable)
 * The card is drawn in Chrome (puppeteer-core) so Kannada conjuncts are shaped properly, with the same
 * palace geometry and the self-hosted Baloo Tamma 2 / Cinzel / Poppins faces the site uses.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { FLAG, PALACE, VIEW } from '../src/components/art/palaceGeometry';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pub = (f: string) => resolve(process.cwd(), 'public', f);
const font = (pkg: string, file: string) =>
  `data:font/woff2;base64,${readFileSync(resolve(process.cwd(), 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')}`;

// ---------- social card ----------
const PALACE_H = 360;
const PALACE_TOP = 266;
const stars = Array.from({ length: 34 }, (_, i) => {
  // deterministic scatter in the sky band above/around the palace
  const x = (i * 197 + 61) % 1200;
  const y = (i * 83 + 23) % 250;
  const r = i % 5 === 0 ? 2 : 1.2;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF4DC" opacity="${0.25 + (i % 4) * 0.12}"/>`;
}).join('');
const lights = PALACE.rows
  .flat()
  .filter(Boolean)
  .map((d) => `<path d="${d}" class="halo"/><path d="${d}" class="core"/>`)
  .join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Baloo;font-weight:700;src:url(${font('baloo-tamma-2', 'baloo-tamma-2-kannada-700-normal.woff2')})}
@font-face{font-family:Cinzel;font-weight:700;src:url(${font('cinzel', 'cinzel-latin-700-normal.woff2')})}
@font-face{font-family:Poppins;font-weight:500;src:url(${font('poppins', 'poppins-latin-500-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;background:
  radial-gradient(ellipse 70% 60% at 50% 62%,rgba(90,70,170,.38),transparent 70%),#07061A;color:#FFF4DC}
.frame{position:absolute;inset:14px;border:2px solid rgba(201,138,27,.55);border-radius:6px}
.frame::after{content:"";position:absolute;inset:6px;border:1px solid rgba(245,184,65,.22);border-radius:3px}
svg.sky{position:absolute;inset:0}
svg.palace{position:absolute;left:0;top:${PALACE_TOP}px;width:1200px;height:${PALACE_H}px}
.mass{fill:#110f2b;stroke:rgba(201,138,27,.5);stroke-width:1.1;stroke-linejoin:round}
.openings{fill:#24142c;stroke:rgba(245,184,65,.28);stroke-width:.9}
.halo{fill:none;stroke:#F5B841;stroke-opacity:.3;stroke-width:12;stroke-linecap:round}
.core{fill:none;stroke:#ffe8ad;stroke-width:4.4;stroke-linecap:round}
.text{position:absolute;left:0;right:0;top:34px;text-align:center}
.eyebrow{font:700 22px Cinzel;letter-spacing:.32em;color:#D9C9A8;text-transform:uppercase}
h1{font:700 92px/1.35 Baloo;color:#FFD27A;margin-top:4px;
  text-shadow:0 0 18px rgba(245,184,65,.55),0 0 46px rgba(245,184,65,.3),0 2px 0 #8a5a0e}
.club{font:500 30px Poppins;margin-top:2px;letter-spacing:.02em}
.date{font:700 26px Cinzel;color:#F5B841;margin-top:12px;letter-spacing:.14em}
</style></head><body>
<svg class="sky" viewBox="0 0 1200 630" aria-hidden="true">${stars}</svg>
<svg class="palace" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" aria-hidden="true">
  <path class="mass" d="${PALACE.mass}"/><path d="${PALACE.gilded}" fill="#C98A1B" fill-opacity=".16"/>
  <path class="openings" d="${PALACE.openings}"/><path d="${FLAG.yellow}" fill="#FFD500"/><path d="${FLAG.red}" fill="#E31B23"/>${lights}
</svg>
<div class="frame"></div>
<div class="text">
  <h1>ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ೨೦೨೬</h1>
  <div class="club">Honnudi Kannada Sangha · BMSIT&amp;M</div>
  <div class="date">20–21 NOVEMBER 2026</div>
</div>
</body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate('document.fonts.ready');
await page.screenshot({ path: pub('og.png'), type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('public/og.png (1200×630)');

// ---------- icons (same glyph as favicon.svg) ----------
const glyph = `<path d="M12 50V34h6v-6c0-4 3-7 7-7h14c4 0 7 3 7 7v6h6v16z" fill="none" stroke="#F5B841" stroke-width="3" stroke-linejoin="round"/><path d="M32 21c-5-3-5-9 0-12 5 3 5 9 0 12z" fill="#FFD27A"/><circle cx="24" cy="42" r="2.5" fill="#FFD27A"/><circle cx="32" cy="42" r="2.5" fill="#FFD27A"/><circle cx="40" cy="42" r="2.5" fill="#FFD27A"/>`;
const svg = (viewBox: string, bg: string) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${bg}${glyph}</svg>`);
const rounded = `<rect width="64" height="64" rx="14" fill="#0B0A1F"/>`;
const bleed = (vb: string) => {
  const [x, y, w, h] = vb.split(' ').map(Number);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0B0A1F"/>`;
};
const icons: [string, Buffer, number][] = [
  ['favicon-32.png', svg('0 0 64 64', rounded), 32],
  // iOS rounds the corners itself, so the touch icon is full-bleed.
  ['apple-touch-icon.png', svg('-2 -2 68 68', bleed('-2 -2 68 68')), 180],
  // Maskable: full-bleed, glyph inside the central 80 % circle safe zone.
  ['icon-192.png', svg('-6 -8.5 76 76', bleed('-6 -8.5 76 76')), 192],
  ['icon-512.png', svg('-6 -8.5 76 76', bleed('-6 -8.5 76 76')), 512],
];
for (const [file, input, size] of icons) {
  writeFileSync(pub(file), await sharp(input, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer());
  console.log(`public/${file} (${size}×${size})`);
}
