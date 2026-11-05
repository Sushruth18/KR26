/**
 * Ad-hoc screenshots for visual review (dev server must be running).
 *   npm run shot -- /                          → e2e-output/shots/home-{kn,en}-{360,1280}.png
 *   npm run shot -- /competitions --widths=320,768 --langs=en --full
 * Flags: --widths=360,1280  --langs=kn,en  --full (full page)  --reduced (prefers-reduced-motion)
 *        --lowend (2 cores / 1 GB)  --intro (do not pre-mark the splash as seen)
 *        --wait=ms (after load, default 2500)  --now=ISO (dev clock override)  --scroll=px  --height=px
 *        --name=prefix  --dpr=2  --clip=x,y,w,h (viewport px)  --el=css-selector (capture one element)
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/shots');
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const path = args.find((a) => !a.startsWith('--')) ?? '/';
const widths = opt('widths', '360,1280').split(',').map(Number);
const langs = opt('langs', 'kn,en').split(',');
const wait = Number(opt('wait', '2500'));
const now = opt('now', '');
const scroll = Number(opt('scroll', '0'));
const height = Number(opt('height', '0'));
const dpr = Number(opt('dpr', '1'));
const clip = opt('clip', '');
const el = opt('el', '');
const name = opt('name', path === '/' ? 'home' : path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const errors: string[] = [];
for (const lang of langs) {
  for (const width of widths) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width, height: height || (width < 768 ? 760 : 820), deviceScaleFactor: dpr });
    // A string, not a function: tsx/esbuild would inject a `__name` helper that doesn't exist in the page.
    await page.evaluateOnNewDocument(
      `localStorage.setItem('kr26.lang', ${JSON.stringify(lang)});` +
        (flag('intro') ? '' : `sessionStorage.setItem('seenIntro', '1');`) +
        (flag('lowend')
          ? `Object.defineProperty(navigator, 'hardwareConcurrency', { get() { return 2; } });
             Object.defineProperty(navigator, 'deviceMemory', { get() { return 1; } });`
          : ''),
    );
    if (flag('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`[${lang}-${width}] ${m.type()}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`[${lang}-${width}] ${String(e)}`));
    const sep = path.includes('?') ? '&' : '?';
    await page.goto(`${BASE}${path}${now ? `${sep}now=${encodeURIComponent(now)}` : ''}`, { waitUntil: flag('intro') ? 'domcontentloaded' : 'networkidle0' });
    if (!flag('intro')) await page.evaluate(() => document.fonts.ready);
    if (flag('full')) {
      // Trigger every scroll-reveal before a full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      // Full-page capture paints beyond the viewport without scrolling there, so content-visibility:auto
      // sections (below-the-fold, footer) would come out blank. Screenshot-only override.
      await page.addStyleTag({ content: '.cv-auto{content-visibility:visible!important}' });
    }
    if (scroll) await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scroll);
    await new Promise((r) => setTimeout(r, wait));
    const file = resolve(OUT, `${name}-${lang}-${width}${flag('reduced') ? '-reduced' : ''}${flag('lowend') ? '-lowend' : ''}.png`);
    const [cx = 0, cy = 0, cw = width, ch = 100] = clip.split(',').map(Number);
    const handle = el ? await page.$(el) : null;
    if (el && !handle) throw new Error(`No element matches ${el}`);
    if (handle) await handle.screenshot({ path: file });
    else await page.screenshot({ path: file, fullPage: flag('full'), ...(clip ? { clip: { x: cx, y: cy, width: cw, height: ch } } : {}) });
    console.log(file);
    await ctx.close();
  }
}
await browser.close();
if (errors.length) {
  console.log(`\nConsole errors/warnings:\n${errors.join('\n')}`);
  process.exitCode = 1;
}
