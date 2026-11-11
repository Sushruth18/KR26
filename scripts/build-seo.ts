/**
 * Writes public/robots.txt and public/sitemap.xml from site.json → siteUrl (runs in `prebuild`).
 * The sitemap lists the six public routes; /register/success is a personal pass page and is excluded
 * (and disallowed in robots.txt). Output is committed, like apps-script/Config.gs.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { siteSchema } from '../src/lib/schemas';
import { NAV_ITEMS } from '../src/components/layout/navItems';

const root = process.cwd();
const site = siteSchema.parse(JSON.parse(readFileSync(resolve(root, 'src/data/site.json'), 'utf8')));

const urls = NAV_ITEMS.map((i) => (i.to === '/' ? `${site.siteUrl}/` : `${site.siteUrl}${i.to}`));
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>\n`).join('') +
  `</urlset>\n`;
const robots = `User-agent: *\nAllow: /\nDisallow: /register/success\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`;

for (const [file, body] of [
  ['public/sitemap.xml', sitemap],
  ['public/robots.txt', robots],
] as const) {
  const out = resolve(root, file);
  if (existsSync(out) && readFileSync(out, 'utf8') === body) continue;
  writeFileSync(out, body, 'utf8');
  console.log(`${file} written (${urls.length} routes).`);
}
console.log('SEO files are up to date.');
