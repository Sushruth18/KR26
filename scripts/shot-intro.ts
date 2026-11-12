/**
 * Frames of the intro splash at exact moments, for visual review (dev server must be running).
 *   npm run shot:intro                        → e2e-output/intro/intro-{kn,en}-{360,1280}-{500,1500,3000,4500}.png
 *   npm run shot:intro -- --widths=320,740 --height=360 --langs=en --times=2000 --lowend
 * Opens /?intro=hold (dev only: the splash stays up), pauses every animation and seeks it to the
 * requested time, so frames are exact and repeatable. From 4400 ms the lift-away is applied too.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/intro');
mkdirSync(OUT, { recursive: true });

/** Keep in sync with INTRO_LIFT_AT_MS / INTRO_LIFT_MS in src/components/intro/IntroSplash.tsx. */
const LIFT_AT = 4400;
const LIFT_MS = 600;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const widths = opt('widths', '360,1280').split(',').map(Number);
const langs = opt('langs', 'kn,en').split(',');
const times = opt('times', '500,1500,3000,4500').split(',').map(Number);
const height = Number(opt('height', '0'));
const dpr = Number(opt('dpr', '1'));

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
        (flag('lowend')
          ? `Object.defineProperty(navigator, 'hardwareConcurrency', { get() { return 2; } });
             Object.defineProperty(navigator, 'deviceMemory', { get() { return 1; } });`
          : ''),
    );
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`[${lang}-${width}] ${m.type()}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`[${lang}-${width}] ${String(e)}`));
    await page.goto(`${BASE}/?intro=hold`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid=intro-stage]');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll<HTMLImageElement>('.intro img')].map((i) => i.decode().catch(() => undefined)));
    });
    for (const t of times) {
      await page.evaluate(
        (t, liftAt, liftMs) => {
          const intro = document.querySelector<HTMLElement>('[data-testid=intro]')!;
          if (t >= liftAt) {
            intro.dataset.leaving = 'true';
            intro.style.animationDuration = `${liftMs}ms`;
          }
          for (const a of document.getAnimations()) {
            a.pause();
            const name = (a as CSSAnimation).animationName;
            a.currentTime = name === 'intro-lift' ? t - liftAt : t;
          }
          return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        },
        t,
        LIFT_AT,
        LIFT_MS,
      );
      const file = resolve(OUT, `intro-${lang}-${width}${height ? `x${height}` : ''}${flag('lowend') ? '-lowend' : ''}-${t}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await ctx.close();
  }
}
await browser.close();
if (errors.length) {
  console.log(`\nConsole errors/warnings:\n${errors.join('\n')}`);
  process.exitCode = 1;
}
