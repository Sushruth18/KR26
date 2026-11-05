/**
 * Browser checks for Home + the intro splash against the dev server.
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:home       (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * Layout: kn/en × 320/360/768/1280 — no horizontal scroll, one h1, footer once, no clipped Kannada,
 * no console errors. Behaviour: splash (once per session, skip, Esc, ≤ 3 s, Home only, inert page),
 * reduced motion, low-end mode, parallax, every countdown phase, deadline banner, SVG budgets,
 * marquee pause + a11y, links.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import events from '../src/data/events.json' with { type: 'json' };

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/home');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

type Lang = 'kn' | 'en';
interface Opts {
  width?: number;
  height?: number;
  reduced?: boolean;
  lowEnd?: boolean;
  /** leave seenIntro unset so the splash plays */
  intro?: boolean;
  wait?: 'networkidle0' | 'domcontentloaded';
}
const results: { name: string; ok: boolean; detail: string }[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function open(browser: Browser, lang: Lang, path: string, errors: string[], o: Opts = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: o.width ?? 360, height: o.height ?? 800, deviceScaleFactor: 1 });
  // A string, not a function: tsx/esbuild would inject a `__name` helper that doesn't exist in the page.
  await page.evaluateOnNewDocument(
    // __name: tsx/esbuild wraps named functions inside page.evaluate callbacks with it.
    `globalThis.__name = (f) => f; localStorage.setItem('kr26.lang', ${JSON.stringify(lang)});` +
      (o.intro ? '' : `sessionStorage.setItem('seenIntro', '1');`) +
      (o.lowEnd
        ? `Object.defineProperty(navigator, 'hardwareConcurrency', { get() { return 2; } });
           Object.defineProperty(navigator, 'deviceMemory', { get() { return 1; } });`
        : ''),
  );
  if (o.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: o.wait ?? 'networkidle0' });
  return page;
}

async function ready(page: Page) {
  await page.waitForSelector('[data-testid=hero-scene]');
  await page.evaluate(() => document.fonts.ready);
}

async function scenario(name: string, fn: (errors: string[]) => Promise<string>) {
  const errors: string[] = [];
  let ok = true;
  let detail: string;
  try {
    detail = await fn(errors);
  } catch (e) {
    ok = false;
    detail = `FAILED: ${(e as Error).message}`;
  }
  if (errors.length) {
    ok = false;
    detail += `\n      console: ${errors.join(' | ')}`;
  }
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

const at = (iso: string) => `now=${encodeURIComponent(iso)}`;

async function main() {
  await fetch(`${BASE}/`).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

  // ---------- Layout matrix ----------
  for (const lang of ['kn', 'en'] as const) {
    for (const width of [320, 360, 768, 1280]) {
      await scenario(`layout-${lang}-${width}`, async (errors) => {
        const page = await open(browser, lang, '/?now=', errors, { width, height: width < 768 ? 760 : 820 });
        await ready(page);
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await sleep(400);
        const m = await page.evaluate(() => {
          const clipped = [...document.querySelectorAll('h1, h2, h3')]
            .filter((h) => {
              if (h.classList.contains('sr-only') || h.closest('[aria-hidden=true]')) return false;
              for (let el: Element | null = h; el; el = el.parentElement) {
                const cs = getComputedStyle(el);
                if (cs.overflow !== 'visible' && el.scrollHeight > el.clientHeight + 1 && cs.position !== 'fixed') return true;
              }
              return false;
            })
            .map((h) => h.textContent);
          const h1 = document.querySelector('h1')!.getBoundingClientRect();
          const scene = document.querySelector('[data-testid=hero-scene]')!.getBoundingClientRect();
          return {
            hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            footers: document.querySelectorAll('footer').length,
            h1s: document.querySelectorAll('h1').length,
            clipped,
            sceneTop: Math.round(scene.top),
            sceneBottom: Math.round(scene.bottom),
            h1Bottom: Math.round(h1.bottom),
            phase: document.querySelector('[data-testid=countdown]')?.getAttribute('data-phase'),
            floats: document.querySelectorAll('.marquee-list:not([aria-hidden]) a').length,
          };
        });
        await page.addStyleTag({ content: '.cv-auto{content-visibility:visible!important}' }); // full-page capture skips off-screen content-visibility sections
        await page.screenshot({ path: resolve(OUT, `${lang}-${width}.png`), fullPage: true });
        expect(!m.hScroll, 'horizontal scroll');
        expect(m.footers === 1 && m.h1s === 1, `footers ${m.footers}, h1 ${m.h1s}`);
        expect(m.clipped.length === 0, `clipped headings: ${m.clipped.join(', ')}`);
        expect(m.sceneTop > m.h1Bottom, 'scene overlaps the title');
        expect(m.floats === events.length, `preview floats ${m.floats} ≠ ${events.length}`);
        expect(m.phase, 'countdown phase missing');
        // The lit palace + elephant must be in the first screen on phones (90% of visitors).
        if (width <= 360) expect(m.sceneTop < 760 - 150, `scene starts at ${m.sceneTop}px — palace not in the first screen`);
        await page.browserContext().close();
        return `no h-scroll, h1×1, footer×1, no clipping, scene ${m.sceneTop}–${m.sceneBottom}px, ${m.floats} floats, phase ${m.phase}`;
      });
    }
  }

  // ---------- Art budgets ----------
  await scenario('svg-sizes-under-30kb', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { width: 1280 });
    await ready(page);
    const sizes = await page.evaluate(() => {
      const kb = (el: Element | null) => (el ? Math.round((el.outerHTML.length / 1024) * 10) / 10 : -1);
      const palace = [...document.querySelectorAll('.hero-scene .palace svg')].map(kb);
      return {
        palace,
        elephant: kb(document.querySelector('.hero-scene .ambari')),
        crowd: kb(document.querySelector('.scene-crowd svg')),
        torch: kb(document.querySelector('footer .torch')),
        divider: kb(document.querySelector('footer .folk-divider')),
        bulbs: (document.querySelector('.hero-scene .palace')!.innerHTML.match(/h0/g) ?? []).length,
      };
    });
    const all = [...sizes.palace, sizes.elephant, sizes.crowd, sizes.torch, sizes.divider];
    expect(all.every((s) => s > 0 && s < 30), `sizes KB: ${JSON.stringify(sizes)}`);
    await page.browserContext().close();
    return `palace layers ${sizes.palace.join(' / ')} KB (${sizes.bulbs / 3} bulbs ×(unlit+halo+core)), elephant ${sizes.elephant}, crowd ${sizes.crowd}, torch ${sizes.torch}, divider ${sizes.divider} KB`;
  });

  // ---------- Splash ----------
  await scenario('splash-plays-once-and-lifts-within-3s', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { intro: true, wait: 'domcontentloaded' });
    const t0 = Date.now();
    await page.waitForSelector('[data-testid=intro]', { timeout: 3000 });
    const shownAfter = Date.now() - t0;
    const frame1 = await page.evaluate(() => {
      const skip = document.querySelector<HTMLButtonElement>('.intro-skip')!.getBoundingClientRect();
      return { skipVisible: skip.width > 0 && skip.top >= 0 && skip.top < 80, inert: document.getElementById('root')!.hasAttribute('inert') };
    });
    expect(frame1.skipVisible, 'Skip not visible at the top on frame 1');
    expect(frame1.inert, '#root not inert behind the splash');
    // Home renders underneath the splash (LCP is the hero heading).
    await page.waitForSelector('h1#home-title', { timeout: 3000 });
    await page.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 4000 });
    const total = Date.now() - t0;
    expect(total <= 3000 + shownAfter + 300, `splash took ${total} ms`);
    expect(!(await page.evaluate(() => document.getElementById('root')!.hasAttribute('inert'))), 'root still inert');
    const mode = await page.$eval('.hero-scene .palace', (p) => p.getAttribute('data-mode'));
    expect(mode === 'lit', `hero palace after splash is "${mode}", expected lit`);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(300);
    expect(!(await page.$('[data-testid=intro]')), 'splash replayed in the same session');
    await page.browserContext().close();
    return `shown ${shownAfter} ms after DOM ready, gone after ${total} ms, Skip visible frame 1, page inert meanwhile, hero palace lit, no replay on reload`;
  });

  await scenario('splash-skip-button-and-esc', async (errors) => {
    const page = await open(browser, 'en', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await page.waitForSelector('.intro-skip');
    await sleep(200);
    const t = Date.now();
    await page.click('.intro-skip');
    await page.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    const skipMs = Date.now() - t;
    const p2 = await open(browser, 'en', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await p2.waitForSelector('[data-testid=intro]');
    await sleep(200);
    await p2.keyboard.press('Escape');
    await p2.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    await page.browserContext().close();
    await p2.browserContext().close();
    return `Skip closes in ${skipMs} ms; Esc closes too`;
  });

  await scenario('splash-only-when-landing-on-home', async (errors) => {
    const page = await open(browser, 'kn', '/competitions', errors, { intro: true });
    await sleep(300);
    expect(!(await page.$('[data-testid=intro]')), 'splash shown on a deep link');
    await page.click('a[href="/"]');
    await page.waitForSelector('[data-testid=hero-scene]');
    await sleep(300);
    expect(!(await page.$('[data-testid=intro]')), 'splash shown after navigating to Home');
    await page.browserContext().close();
    return 'deep link /competitions: no splash, then Home: no splash';
  });

  // ---------- Mobile menu (code-split; must still open on the first tap) ----------
  await scenario('mobile-menu-lazy-chunk', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { width: 360 });
    await ready(page);
    await page.click('button[aria-controls=mobile-menu]');
    await page.waitForSelector('#mobile-menu', { visible: true, timeout: 5000 });
    await sleep(700);
    const links = await page.$$eval('#mobile-menu nav a', (as) => as.map((a) => getComputedStyle(a.parentElement!).opacity));
    expect(links.length === 6 && links.every((o) => Number(o) > 0.98), `menu links ${links}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#mobile-menu', { hidden: true, timeout: 3000 });
    await page.click('button[aria-controls=mobile-menu]');
    await page.waitForSelector('#mobile-menu', { visible: true, timeout: 3000 });
    await page.click('#mobile-menu button[aria-label]');
    await page.waitForSelector('#mobile-menu', { hidden: true, timeout: 3000 });
    await page.browserContext().close();
    return 'opens on first tap (lazy chunk), 6 links staggered in, Esc and close button work, reopens';
  });

  // ---------- Reduced motion ----------
  await scenario('reduced-motion', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { intro: true, reduced: true, width: 1280 });
    await ready(page);
    const m = await page.evaluate(() => {
      const palace = document.querySelector('.hero-scene .palace')!;
      return {
        intro: !!document.querySelector('[data-testid=intro]'),
        mode: palace.getAttribute('data-mode'),
        twinkle: palace.getAttribute('data-twinkle'),
        lightsAnim: getComputedStyle(palace.querySelector('.palace-lights')!).animationName,
        walking: document.querySelector('.hero-scene .ambari')!.classList.contains('is-walking'),
        crossing: document.querySelector('.scene-elephant')!.getAttribute('data-crossing'),
        marquee: !!document.querySelector('.marquee-track'),
        staticRow: !!document.querySelector('.marquee-static'),
        pause: !!document.querySelector('[aria-pressed]'),
        sceneTransform: getComputedStyle(document.querySelector('.scene-palace')!).transform,
      };
    });
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await sleep(200);
    const after = await page.$eval('.scene-palace', (e) => getComputedStyle(e).transform);
    expect(!m.intro, 'splash shown under reduced motion');
    expect(m.mode === 'lit' && m.twinkle === 'false' && m.lightsAnim === 'none', `palace ${m.mode}/${m.twinkle}/${m.lightsAnim}`);
    expect(!m.walking && m.crossing === 'false', 'elephant still walking');
    expect(!m.marquee && m.staticRow && !m.pause, 'marquee still animating');
    expect(after === m.sceneTransform, 'parallax moved under reduced motion');
    await page.screenshot({ path: resolve(OUT, 'reduced-1280.png') });
    await page.browserContext().close();
    return 'no splash, palace lit + steady, elephant standing, static swipeable floats, no parallax';
  });

  // ---------- Low-end device ----------
  await scenario('low-end-device', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { lowEnd: true, width: 360 });
    await ready(page);
    const before = await page.evaluate(() => ({
      flag: document.documentElement.dataset.lowEnd,
      stars: document.querySelectorAll('.star').length,
      twinkle: document.querySelector('.hero-scene .palace')!.getAttribute('data-twinkle'),
      t: getComputedStyle(document.querySelector('.scene-palace')!).transform,
    }));
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await sleep(250);
    const after = await page.$eval('.scene-palace', (e) => getComputedStyle(e).transform);
    expect(before.flag === 'true', 'data-low-end not set');
    expect(before.stars <= 14, `${before.stars} stars`);
    expect(before.twinkle === 'false', 'twinkle on');
    expect(after === before.t, 'parallax active on low-end');
    await page.browserContext().close();
    return `html[data-low-end], ${before.stars} stars, no twinkle, no parallax`;
  });

  await scenario('parallax-on-capable-devices', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { width: 1280 });
    await ready(page);
    const t0 = await page.$eval('.scene-palace', (e) => getComputedStyle(e).transform);
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await sleep(300);
    const t1 = await page.$eval('.scene-palace', (e) => getComputedStyle(e).transform);
    expect(t0 !== t1, 'palace layer did not move on scroll');
    await page.browserContext().close();
    return `palace layer ${t0} → ${t1}`;
  });

  // ---------- Countdown phases (dev clock override) ----------
  const phases: [string, string, string, string][] = [
    ['2026-11-06T12:00:00+05:30', 'competitions', 'ಸ್ಪರ್ಧೆಗಳಿಗೆ', 'Competitions begin in'],
    ['2026-11-20T11:00:00+05:30', 'competitionsOn', 'ಸ್ಪರ್ಧೆಗಳು ನಡೆಯುತ್ತಿವೆ!', 'Competitions are on!'],
    ['2026-11-20T19:00:00+05:30', 'procession', 'ಮೆರವಣಿಗೆಗೆ', 'The procession begins in'],
    ['2026-11-21T12:00:00+05:30', 'live', 'ಉತ್ಸವ ಆರಂಭವಾಗಿದೆ!', 'The festival has begun!'],
    ['2026-11-22T09:00:00+05:30', 'over', 'ಧನ್ಯವಾದಗಳು', 'Thank you'],
  ];
  for (const [iso, kind, kn, en] of phases) {
    await scenario(`countdown-${kind}`, async (errors) => {
      const out: string[] = [];
      for (const lang of ['kn', 'en'] as const) {
        const page = await open(browser, lang, `/?${at(iso)}`, errors);
        await ready(page);
        const m = await page.$eval('[data-testid=countdown]', (s) => ({
          phase: s.getAttribute('data-phase'),
          text: s.textContent ?? '',
          days: s.querySelector('[data-testid=cd-days]')?.textContent ?? null,
          gallery: !!s.querySelector('a[href="/gallery"]'),
        }));
        expect(m.phase === kind, `phase ${m.phase}`);
        expect(m.text.includes(lang === 'kn' ? kn : en), `missing "${lang === 'kn' ? kn : en}"`);
        if (kind === 'over') expect(m.gallery, 'no gallery link');
        if (m.days) expect(lang === 'kn' ? /^[೦-೯]{2,}$/.test(m.days) : /^\d{2,}$/.test(m.days), `days "${m.days}" wrong numerals for ${lang}`);
        out.push(`${lang}: days=${m.days ?? '—'}`);
        await page.browserContext().close();
      }
      return out.join(', ');
    });
  }

  await scenario('countdown-ticks', async (errors) => {
    const page = await open(browser, 'en', `/?${at('2026-11-06T12:00:00+05:30')}`, errors);
    await ready(page);
    const a = await page.$eval('[data-testid=cd-seconds]', (e) => e.textContent);
    await sleep(2100);
    const b = await page.$eval('[data-testid=cd-seconds]', (e) => e.textContent);
    expect(a !== b, 'seconds did not change');
    await page.browserContext().close();
    return `seconds ${a} → ${b}`;
  });

  // ---------- Deadline banner ----------
  const banner: [string, boolean, string][] = [
    ['2026-11-06T12:00:00+05:30', false, 'registration not open yet'],
    ['2026-11-14T12:00:00+05:30', false, '4 days left'],
    ['2026-11-16T12:00:00+05:30', true, '2 days left'],
    ['2026-11-18T22:00:00+05:30', true, 'Last day'],
    ['2026-11-19T08:00:00+05:30', false, 'closed'],
  ];
  await scenario('deadline-banner', async (errors) => {
    const out: string[] = [];
    for (const [iso, shown, label] of banner) {
      const page = await open(browser, 'en', `/?${at(iso)}`, errors);
      await ready(page);
      const text = await page.$eval('[data-testid=deadline-banner]', (e) => e.textContent).catch(() => null);
      expect(!!text === shown, `${label}: banner ${text ? 'shown' : 'hidden'}`);
      if (shown) expect(text!.includes(label), `${label}: text "${text}"`);
      out.push(`${iso.slice(5, 10)} ${shown ? 'shown' : 'hidden'}`);
      await page.browserContext().close();
    }
    const kn = await open(browser, 'kn', `/?${at('2026-11-16T12:00:00+05:30')}`, errors);
    await ready(kn);
    const knText = await kn.$eval('[data-testid=deadline-banner]', (e) => e.textContent ?? '');
    expect(knText.includes('೨ ದಿನ') && !/\d/.test(knText), `kn banner "${knText}"`);
    await kn.browserContext().close();
    return `${out.join(', ')}; kn uses Kannada numerals`;
  });

  // ---------- Preview strip + links ----------
  await scenario('preview-strip-and-links', async (errors) => {
    const page = await open(browser, 'kn', '/?now=', errors, { width: 1280 });
    await ready(page);
    const m = await page.evaluate(() => ({
      hrefs: [...document.querySelectorAll('.marquee-list:not([aria-hidden]) a')].map((a) => a.getAttribute('href')),
      copyHidden: document.querySelector('.marquee-list[aria-hidden=true]') !== null,
      copyTab: [...document.querySelectorAll('.marquee-list[aria-hidden=true] a')].every((a) => a.getAttribute('tabindex') === '-1'),
      days: [...document.querySelectorAll('.daystrip a')].map((a) => a.getAttribute('href')),
      cta: [...document.querySelectorAll('section[aria-labelledby=home-title] a.btn')].map((a) => a.getAttribute('href')),
    }));
    expect(m.hrefs.every((h, i) => h === `/competitions?for=${events[i]!.category}#${events[i]!.id}`), `float hrefs ${m.hrefs.join(' ')}`);
    expect(m.copyHidden && m.copyTab, 'duplicate floats reachable by AT/keyboard');
    expect(m.days.join() === '/event?day=1,/event?day=2', `day links ${m.days}`);
    expect(m.cta.join() === '/competitions,/team', `CTAs ${m.cta}`);
    // Pause button
    await page.click('[aria-pressed]');
    const paused = await page.$eval('.marquee', (e) => [e.getAttribute('data-paused'), getComputedStyle(e.querySelector('.marquee-track')!).animationPlayState]);
    expect(paused[0] === 'true' && paused[1] === 'paused', `pause → ${paused}`);
    // A float deep-links to its card on /competitions
    const target = events.find((e) => e.category === 'faculty')!;
    await page.$eval(`.marquee-list:not([aria-hidden]) a[href*="#${target.id}"]`, (a) => (a as HTMLAnchorElement).click());
    await page.waitForSelector(`#${target.id}`);
    await sleep(1200);
    const card = await page.evaluate((id) => {
      const r = document.getElementById(id)!.getBoundingClientRect();
      return { top: Math.round(r.top), q: location.search };
    }, target.id);
    expect(card.q === '?for=faculty', `landed on ${card.q}`);
    expect(card.top >= 0 && card.top < 300, `card top at ${card.top}px — not scrolled into view`);
    await page.browserContext().close();
    return `${m.hrefs.length} floats deep-link correctly, copy hidden from AT/tab order, pause works, ${target.id} card at ${card.top}px`;
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots in ${OUT}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
