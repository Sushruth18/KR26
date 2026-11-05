/**
 * LCP / CLS / frame-rate check for Home on the PRODUCTION build, with Lighthouse-like mobile throttling
 * (Slow 4G: 150 ms RTT, ~1.6 Mbps down; 4× CPU slowdown; 412×823 @ 1.75x).
 *   1. npm run build && npm run preview     (serves dist on :4173)
 *   2. npm run perf:home                    (PERF_BASE, CHROME_PATH optional)
 * Budgets (CLAUDE.md §9): LCP ≤ 2.5 s, CLS ≤ 0.05. Also reports the LCP element, so a regression where
 * the splash text (instead of the hero heading) becomes LCP is visible, and rAF frame rates.
 */
import puppeteer, { type Browser } from 'puppeteer-core';

const BASE = process.env.PERF_BASE ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const RUNS = Number(process.env.PERF_RUNS ?? 3);
/** Another route for comparison, e.g. PERF_PATH=competitions (no leading slash: Git Bash rewrites it). */
const PATH = `/${process.env.PERF_PATH ?? ''}`;

interface Vitals {
  fcp: number;
  lcp: number;
  lcpEl: string;
  cls: number;
}

const OBSERVE = `
  globalThis.__name = (f) => f;
  window.__vitals = { lcp: 0, lcpEl: '', cls: 0, fcp: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__vitals.lcp = e.startTime; const el = e.element; window.__vitals.lcpEl = el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.textContent || '').trim().slice(0, 30) + '"' : '?'; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__vitals.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
`;

async function measure(browser: Browser, opts: { intro: boolean; lang: 'kn' | 'en' }): Promise<Vitals> {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(
    OBSERVE + `localStorage.setItem('kr26.lang', '${opts.lang}');` + (opts.intro ? '' : `sessionStorage.setItem('seenIntro', '1');`),
  );
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000)); // splash (3 s) + settle
  const v = (await page.evaluate('window.__vitals')) as Vitals;
  await ctx.close();
  return v;
}

async function fps(browser: Browser, lowEnd: boolean): Promise<number> {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(
    `sessionStorage.setItem('seenIntro', '1');` +
      (lowEnd ? `Object.defineProperty(navigator, 'hardwareConcurrency', { get() { return 2; } });` : `Object.defineProperty(navigator, 'hardwareConcurrency', { get() { return 8; } });`),
  );
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await new Promise((r) => setTimeout(r, 2500)); // past the light-up
  const frames = (await page.evaluate(
    `new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(tick); })`,
  )) as number;
  await ctx.close();
  return Math.round(frames);
}

async function main() {
  await fetch(BASE).catch(() => {
    throw new Error(`Preview server not reachable at ${BASE} — run "npm run build && npm run preview" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  let failed = false;
  for (const intro of PATH === '/' ? [true, false] : [false]) {
    for (const lang of ['kn', 'en'] as const) {
      const runs: Vitals[] = [];
      for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, { intro, lang }));
      const med = (k: 'fcp' | 'lcp' | 'cls') => [...runs].sort((a, b) => a[k] - b[k])[Math.floor(runs.length / 2)]![k];
      const lcp = med('lcp');
      const cls = Math.max(...runs.map((r) => r.cls));
      const ok = lcp <= 2500 && cls <= 0.05;
      if (!ok) failed = true;
      console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${intro ? 'with splash   ' : 'splash seen   '} ${lang}  FCP ${Math.round(med('fcp'))} ms · LCP ${Math.round(lcp)} ms (${runs[0]!.lcpEl}) · CLS ${cls.toFixed(4)} (worst of ${RUNS})`,
      );
    }
  }
  if (PATH !== '/') return void (await browser.close(), failed && (process.exitCode = 1));
  console.log(`INFO  rAF during hero animation at 6× CPU: capable ${await fps(browser, false)} fps · low-end mode ${await fps(browser, true)} fps`);
  await browser.close();
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
