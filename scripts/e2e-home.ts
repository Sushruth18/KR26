/**
 * Browser checks for Home + the intro splash against the dev server.
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:home       (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * Layout: kn/en × 320/360/768/1280 — no horizontal scroll, one h1, footer once, no clipped Kannada,
 * no console errors. Behaviour: splash (once per session, ≈ 5 s, timeline, Skip at frame 1 / Tab+Enter / Esc,
 * Home only, ?intro=1, inert + unscrollable page, small + landscape screens, low-end),
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
      INTRO_WATCH +
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

/** Records when the splash enters / leaves the DOM (performance.now()), for timing checks. */
const INTRO_WATCH = `window.__intro = {}; new MutationObserver(() => {
  const up = !!document.querySelector('[data-testid=intro]'); const t = performance.now();
  if (up && window.__intro.shown == null) window.__intro.shown = t;
  if (!up && window.__intro.shown != null && window.__intro.gone == null) window.__intro.gone = t;
}).observe(document, { childList: true, subtree: true });`;

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
            elephantBottom: Math.round(document.querySelector('.hero-scene .ambari')!.getBoundingClientRect().bottom),
            viewH: window.innerHeight,
            // The college logo sits on its ivory plate wherever it appears on the night background.
            plates: ['[data-testid=college-row]', 'footer'].map((s) => {
              const img = document.querySelector(`${s} img[src*="college-logo"]`);
              const plate = img?.parentElement;
              return !!plate?.classList.contains('logo-plate') && getComputedStyle(plate).backgroundColor === 'rgb(255, 244, 220)';
            }),
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
        if (width <= 360) {
          expect(m.sceneTop < 760 - 150, `scene starts at ${m.sceneTop}px — palace not in the first screen`);
          expect(m.elephantBottom <= m.viewH, `elephant ends at ${m.elephantBottom}px — below the ${m.viewH}px first screen`);
        }
        expect(m.plates.every(Boolean), `college logo plate (home row, footer): ${m.plates.join(', ')}`);
        await page.browserContext().close();
        return `no h-scroll, h1×1, footer×1, no clipping, scene ${m.sceneTop}–${m.sceneBottom}px, elephant ↓${m.elephantBottom}/${m.viewH}, logo plates ✓, ${m.floats} floats, phase ${m.phase}`;
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

  // ---------- Splash (§5.0: 5 s, once per session, Home only) ----------
  // window.__intro.shown / .gone = performance.now() when the splash entered / left the DOM (see INTRO_WATCH).
  const introTimes = (page: Page) => page.evaluate(() => (window as unknown as { __intro: { shown?: number; gone?: number } }).__intro);
  const opacityOf = (page: Page, sel: string) => page.$eval(sel, (e) => Number(getComputedStyle(e).opacity));

  await scenario('splash-plays-once-and-lifts-at-5s', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=intro]', { timeout: 5000 });
    const frame1 = await page.evaluate(() => {
      const skip = document.querySelector<HTMLButtonElement>('.intro-skip')!;
      const r = skip.getBoundingClientRect();
      let opacity = 1;
      for (let el: Element | null = skip; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity);
      return {
        skip: { w: r.width, h: r.height, top: r.top, right: innerWidth - r.right, opacity, disabled: skip.disabled, tab: skip.tabIndex },
        inert: document.getElementById('root')!.hasAttribute('inert'),
        role: document.querySelector('[data-testid=intro]')!.getAttribute('role'),
        label: document.querySelector('[data-testid=intro]')!.getAttribute('aria-label'),
      };
    });
    const s = frame1.skip;
    expect(s.w >= 44 && s.h >= 44, `Skip is ${s.w}×${s.h}, needs ≥ 44×44`);
    expect(s.top >= 0 && s.top < 80 && s.right >= 0 && s.opacity === 1, `Skip not visible on frame 1: ${JSON.stringify(s)}`);
    expect(!s.disabled && s.tab >= 0, 'Skip not focusable on frame 1');
    expect(frame1.inert, '#root not inert behind the splash');
    expect(frame1.role === 'dialog' && !!frame1.label, `splash a11y: role ${frame1.role}, label ${frame1.label}`);
    // Only the Skip button is exposed to assistive tech.
    const exposed = await page.$$eval('[data-testid=intro] > *:not([aria-hidden=true])', (els) => els.map((e) => e.tagName));
    expect(exposed.length === 1 && exposed[0] === 'BUTTON', `exposed splash children: ${exposed}`);
    // Home renders underneath the splash (LCP is the hero heading).
    await page.waitForSelector('h1#home-title', { timeout: 5000 });
    await page.waitForSelector('[data-testid=intro-stage]', { timeout: 3000 });
    // No scrolling while it is up.
    await page.mouse.move(180, 400);
    await page.mouse.wheel({ deltaY: 800 });
    await page.keyboard.press('PageDown');
    await sleep(250);
    const midScroll = await page.evaluate(() => window.scrollY);
    expect(midScroll === 0, `page scrolled to ${midScroll} behind the splash`);
    const early = await opacityOf(page, '.intro-presents');
    await page.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 8000 });
    const tm = await introTimes(page);
    const dur = Math.round(tm.gone! - tm.shown!);
    expect(dur >= 4800 && dur <= 5150, `splash was up ${dur} ms, expected ≈ 5000 (≤ 5150)`);
    expect(early < 0.5, `"presents" already at opacity ${early} early on`);
    expect(!(await page.evaluate(() => document.getElementById('root')!.hasAttribute('inert'))), 'root still inert');
    const mode = await page.$eval('.hero-scene .palace', (p) => p.getAttribute('data-mode'));
    expect(mode === 'lit', `hero palace after splash is "${mode}", expected lit`);
    const after = await page.evaluate(async () => {
      window.scrollTo({ top: 300, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 100));
      return window.scrollY;
    });
    expect(after === 300, `cannot scroll after the splash (scrollY ${after})`);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(300);
    expect(!(await page.$('[data-testid=intro]')), 'splash replayed in the same session');
    await page.browserContext().close();
    return `up ${dur} ms; Skip ${s.w}×${s.h} visible + focusable on frame 1; dialog "${frame1.label}" exposes only Skip; page inert + unscrollable meanwhile, scrolls after; hero palace lit; no replay on reload`;
  });

  await scenario('splash-timeline', async (errors) => {
    const page = await open(browser, 'en', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=intro-stage]', { timeout: 5000 });
    const shown = (await introTimes(page)).shown!;
    const sampleAt = async (ms: number) => {
      const wait = shown + ms - (await page.evaluate(() => performance.now()));
      if (wait > 0) await sleep(wait);
      return page.evaluate(() => {
        const op = (sel: string) => Number(getComputedStyle(document.querySelector(sel)!).opacity);
        return { flag: op('.intro-flag'), logos: op('.intro-logos'), presents: op('.intro-presents') };
      });
    };
    const a = await sampleAt(900);
    const b = await sampleAt(2400);
    const c = await sampleAt(4100);
    expect(a.flag > 0.95 && a.logos < 0.2 && a.presents === 0, `0.9 s: ${JSON.stringify(a)}`);
    expect(b.logos > 0.95 && b.presents < 0.2, `2.4 s: ${JSON.stringify(b)}`);
    expect(c.presents > 0.95 && c.flag > 0.95, `4.1 s: ${JSON.stringify(c)}`);
    const imgs = await page.$$eval('[data-testid=intro-logos] img', (is) => is.map((i) => `${i.getAttribute('width')}×${i.getAttribute('height')}`));
    expect(imgs.length === 2 && imgs.every((s) => /^\d+×\d+$/.test(s)), `logo sizes ${imgs}`);
    await page.browserContext().close();
    return `0.9 s flag ${a.flag.toFixed(2)} / logos ${a.logos.toFixed(2)}; 2.4 s logos ${b.logos.toFixed(2)} / presents ${b.presents.toFixed(2)}; 4.1 s presents ${c.presents.toFixed(2)}; logos ${imgs.join(', ')}`;
  });

  await scenario('splash-skip-at-frame-1-keyboard-and-esc', async (errors) => {
    // Click Skip the moment the splash exists (before its stage has even mounted).
    const page = await open(browser, 'en', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await page.waitForSelector('.intro-skip');
    const t = Date.now();
    await page.click('.intro-skip');
    await page.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    const skipMs = Date.now() - t;
    // Keyboard: Tab lands on Skip (the page behind is inert), Enter closes.
    const p2 = await open(browser, 'kn', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await p2.waitForSelector('.intro-skip');
    await p2.keyboard.press('Tab');
    const focused = await p2.evaluate(() => document.activeElement?.classList.contains('intro-skip'));
    expect(focused, 'Tab did not land on Skip');
    await p2.keyboard.press('Enter');
    await p2.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    const p3 = await open(browser, 'en', '/', errors, { intro: true, wait: 'domcontentloaded' });
    await p3.waitForSelector('[data-testid=intro]');
    await p3.keyboard.press('Escape');
    await p3.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    for (const p of [page, p2, p3]) await p.browserContext().close();
    return `Skip at frame 1 closes in ${skipMs} ms; Tab → Skip, Enter closes; Esc closes`;
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

  await scenario('splash-dev-force-intro-1', async (errors) => {
    // seenIntro is already set (no `intro` option): ?intro=1 shows it again, on any page.
    const page = await open(browser, 'en', '/competitions?intro=1', errors, { wait: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=intro]', { timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid=intro]', { hidden: true, timeout: 1500 });
    const reduced = await open(browser, 'en', '/?intro=1', errors, { reduced: true });
    await sleep(300);
    expect(!(await reduced.$('[data-testid=intro]')), '?intro=1 overrode reduced motion');
    await page.browserContext().close();
    await reduced.browserContext().close();
    return '?intro=1 replays it after seenIntro (dev), still never under reduced motion';
  });

  await scenario('splash-small-and-landscape-screens', async (errors) => {
    const out: string[] = [];
    for (const [w, h, lang] of [[320, 568, 'kn'], [320, 568, 'en'], [740, 360, 'kn'], [640, 360, 'en'], [1280, 820, 'kn']] as const) {
      const page = await open(browser, lang, '/?intro=hold', errors, { width: w, height: h });
      await page.waitForSelector('[data-testid=intro-stage]');
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        // Seek every animation to the 4 s "hold" frame (finish() would throw on the infinite twinkle).
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = 4000;
        }
        const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        const logos = box('[data-testid=intro-logos]');
        const presents = box('.intro-presents');
        const skip = box('.intro-skip');
        return {
          hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          logos: [logos.left, logos.top, logos.right, logos.bottom].map(Math.round),
          presents: [presents.left, presents.top, presents.right, presents.bottom].map(Math.round),
          overlap: !(skip.bottom <= logos.top || skip.left >= logos.right || skip.right <= logos.left),
          clipped: presents.height < 10,
          vw: innerWidth,
          vh: innerHeight,
        };
      });
      const inside = (r: number[]) => r[0]! >= 0 && r[1]! >= 0 && r[2]! <= m.vw && r[3]! <= m.vh;
      expect(!m.hScroll, `${w}×${h}: horizontal scroll`);
      expect(inside(m.logos) && inside(m.presents) && !m.clipped, `${w}×${h} ${lang}: off screen ${JSON.stringify(m)}`);
      expect(!m.overlap, `${w}×${h}: Skip overlaps the logos`);
      out.push(`${w}×${h} ${lang} ok`);
      await page.browserContext().close();
    }
    return out.join(', ') + ' (logos + "presents" on screen, no h-scroll, Skip clear of the logos)';
  });

  await scenario('splash-low-end', async (errors) => {
    const page = await open(browser, 'kn', '/', errors, { intro: true, lowEnd: true, wait: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=intro-stage]', { timeout: 5000 });
    const m = await page.evaluate(() => ({
      still: document.querySelector('.intro-flag')!.getAttribute('data-still'),
      wave: [...document.querySelectorAll('.intro-flag-strip')].map((e) => getComputedStyle(e).animationName),
      sets: document.querySelectorAll('.intro .palace-lights').length,
      twinkle: document.querySelector('.intro .palace')!.getAttribute('data-twinkle'),
    }));
    expect(m.still === 'true' && m.wave.every((n) => n === 'none'), `flag still animating: ${JSON.stringify(m)}`);
    expect(m.sets === 1 && m.twinkle === 'false', `low-end bulbs: ${m.sets} light sets, twinkle ${m.twinkle}`);
    await page.keyboard.press('Escape');
    await page.browserContext().close();
    return 'static flag, 1 of 3 bulb sets, no twinkle';
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
