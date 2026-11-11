/**
 * Fails if a term the college dropped from the programme appears anywhere on the site.
 *   npm run build && npm run check:banned
 * Scans every text file in dist/ (HTML, JS, CSS, JSON, SVG, manifest, sitemap …; \uXXXX escapes in JS are
 * decoded first, so a Kannada string cannot hide behind them), plus the sources that feed the site:
 * src/data, src/i18n, public/ (text files only) and index.html. The terms live in scripts/banned-terms.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { BANNED } from './banned-terms';

const root = process.cwd();
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest', '.ics', '.map']);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (TEXT.has(extname(p).toLowerCase())) yield p;
  }
}

const decode = (s: string) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

const dist = resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('dist/ not found — run "npm run build" first.');
  process.exit(1);
}

const targets = [dist, resolve(root, 'src/data'), resolve(root, 'src/i18n'), resolve(root, 'public')].filter(existsSync);
const files = [...targets.flatMap((t) => [...walk(t)]), resolve(root, 'index.html')];
const hits: string[] = [];
for (const f of files) {
  const text = decode(readFileSync(f, 'utf8'));
  for (const re of BANNED) {
    const m = re.exec(text);
    if (m) hits.push(`${relative(root, f)}: "${m[0]}" …${text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ')}…`);
  }
}

if (hits.length) {
  console.error(`Banned terms found:\n  - ${hits.join('\n  - ')}`);
  process.exit(1);
}
console.log(`No banned terms in ${files.length} files (dist/, src/data, src/i18n, public/, index.html).`);
