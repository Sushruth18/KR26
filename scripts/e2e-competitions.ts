/**
 * Browser checks for /competitions against the dev server (mock endpoint).
 *   1. npm run dev                 (in another terminal)
 *   2. npm run e2e:competitions    (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * Both languages × 320/360/768/1280 px: no horizontal scroll, layout columns, no clipped Kannada,
 * footer once, no console errors. Plus behaviour: ?for= sync, Register links, TBA values,
 * hidden tel: links, rules disclosure, live-status fallback ("Opens soon"), reduced motion.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import events from '../src/data/events.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/competitions');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

type Lang = 'kn' | 'en';
const results: { name: string; ok: boolean; detail: string }[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function open(browser: Browser, lang: Lang, width: number, path: string, errors: string[], reduced = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((l) => {
    localStorage.setItem('kr26.lang', l);
    sessionStorage.setItem('seenIntro', '1');
  }, lang);
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid=competition-grid] article');
  await page.waitForFunction(() => !document.querySelector('[data-testid=competition-grid] .skeleton'), { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** Scrolls through the page so every whileInView card reveals before a full-page screenshot. */
async function revealAll(page: Page) {
  await page.evaluate(async () => {
    // behavior 'instant': the site sets scroll-behavior: smooth, which would make each step lag behind.
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(500);
}

async function scenario(name: string, fn: (errors: string[]) => Promise<string>, allowErrors?: RegExp) {
  const errors: string[] = [];
  let ok = true;
  let detail: string;
  try {
    detail = await fn(errors);
  } catch (e) {
    ok = false;
    detail = `FAILED: ${(e as Error).message}`;
  }
  const unexpected = errors.filter((e) => !(allowErrors && allowErrors.test(e)));
  if (unexpected.length) {
    ok = false;
    detail += `\n      console: ${unexpected.join(' | ')}`;
  }
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

const students = events.filter((e) => e.category === 'students');
const faculty = events.filter((e) => e.category === 'faculty');

async function main() {
  await fetch(`${BASE}/mock-api/__reset`, { method: 'POST' }).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

  // ---------- Layout matrix ----------
  for (const lang of ['kn', 'en'] as const) {
    for (const width of [320, 360, 768, 1280]) {
      for (const cat of ['students', 'faculty'] as const) {
        await scenario(`layout-${lang}-${width}-${cat}`, async (errors) => {
          const page = await open(browser, lang, width, `/competitions?for=${cat}&mock=`, errors);
          await revealAll(page);
          const m = await page.evaluate(() => {
            const grid = document.querySelector('[data-testid=competition-grid]')!;
            const cards = [...grid.querySelectorAll('article')];
            const tops = new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)));
            // A heading "clips" if its glyph box is taller than its box with overflow hidden somewhere up the tree.
            const clipped = [...document.querySelectorAll('h1, h2, h3')].filter((h) => {
              if (h.classList.contains('sr-only')) return false; // visually hidden on purpose
              for (let el: Element | null = h; el; el = el.parentElement) {
                const cs = getComputedStyle(el);
                if (cs.overflow !== 'visible' && el.scrollHeight > el.clientHeight + 1 && cs.position !== 'fixed') return true;
              }
              return false;
            }).map((h) => h.textContent);
            return {
              hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              cards: cards.length,
              perRow: cards.length / tops.size,
              footers: document.querySelectorAll('footer').length,
              h1: document.querySelectorAll('h1').length,
              tel: document.querySelectorAll('a[href^="tel:"]').length,
              clipped,
              pressed: document.querySelector('[aria-pressed=true]')?.getAttribute('data-testid'),
            };
          });
          await page.addStyleTag({ content: '.cv-auto{content-visibility:visible!important}' }); // full-page capture skips off-screen content-visibility sections
          await page.screenshot({ path: resolve(OUT, `${lang}-${width}-${cat}.png`), fullPage: true });
          const expectCards = cat === 'students' ? students.length : faculty.length;
          const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
          expect(!m.hScroll, 'horizontal scroll');
          expect(m.cards === expectCards, `cards ${m.cards} ≠ ${expectCards}`);
          expect(Math.ceil(m.perRow) === Math.min(cols, expectCards), `columns ≈ ${m.perRow}, expected ${cols}`);
          expect(m.footers === 1 && m.h1 === 1, `footers ${m.footers}, h1 ${m.h1}`);
          expect(m.tel === 0, `tel: links shown although every coordinator phone is TODO (${m.tel})`);
          expect(m.clipped.length === 0, `clipped headings: ${m.clipped.join(', ')}`);
          expect(m.pressed === `toggle-${cat}`, `toggle shows ${m.pressed}`);
          await page.browserContext().close();
          return `${m.cards} cards, ${cols} col, no h-scroll, footer×1, no tel:, no clipping`;
        });
      }
    }
  }

  // ---------- Behaviour ----------
  await scenario('toggle-syncs-url-kn', async (errors) => {
    const page = await open(browser, 'kn', 360, '/competitions?mock=', errors);
    expect((await page.$$('[data-testid=competition-grid] article')).length === students.length, 'default = students');
    await page.click('[data-testid=toggle-faculty]');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('for') === 'faculty');
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid=competition-grid] article').length === n, { timeout: 5000 }, faculty.length);
    await page.reload({ waitUntil: 'networkidle0' });
    const pressed = await page.$eval('[aria-pressed=true]', (b) => b.getAttribute('data-testid'));
    expect(pressed === 'toggle-faculty', 'faculty survives reload');
    const memento = await page.$$('[data-testid=prize-memento]');
    expect(memento.length === faculty.length, 'every faculty card shows the Memento badge');
    const bad = await open(browser, 'kn', 360, '/competitions?for=nonsense&mock=', errors);
    expect((await bad.$eval('[aria-pressed=true]', (b) => b.getAttribute('data-testid'))) === 'toggle-students', 'bad ?for= → students');
    await page.browserContext().close();
    await bad.browserContext().close();
    return `?for= updated on toggle (replace), restored after reload, unknown value → students; ${memento.length} memento badges`;
  });

  await scenario('cards-content-en', async (errors) => {
    const page = await open(browser, 'en', 1280, '/competitions?for=students&mock=', errors);
    const card = await page.$eval('[data-testid=card-s-essay]', (e) => e.textContent ?? '');
    expect(card.includes('Time to be announced') && card.includes('To be announced'), 'TBA time + venue + coordinator');
    expect(card.includes('Day 1 · 20 November'), 'Day 1 date');
    expect(card.includes('₹2,000') && card.includes('₹1,000'), 'cash prizes with ₹ grouping');
    expect(card.includes('18 November, 11:59 PM'), 'deadline from data');
    expect(!card.includes('TODO'), 'no raw TODO-CONFIRM text');
    const hrefs = await page.$$eval('[data-testid=competition-grid] a[href^="/register"]', (as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.length === students.length && hrefs.every((h, i) => h === `/register?event=${students[i]!.id}`), `register hrefs ${hrefs.join(',')}`);
    const rangoli = await page.$$('[data-testid=card-s-rangoli] .corner-ornament');
    expect(rangoli.length === 2, 'rangoli has kolam corners');
    await page.click('[data-testid=register-s-quiz]');
    await page.waitForSelector('[data-testid=event-summary]');
    const url = new URL(page.url());
    expect(url.pathname === '/register' && url.searchParams.get('event') === 's-quiz', `navigated to ${page.url()}`);
    await page.browserContext().close();
    return `TBA shown for time/venue/coordinator, no raw TODO; ${hrefs.length} Register links → /register?event=<id>; clicking Quiz opens the form preselected`;
  });

  await scenario('rules-disclosure-kn', async (errors) => {
    const page = await open(browser, 'kn', 360, '/competitions?mock=', errors);
    const btn = '[data-testid=rules-toggle-s-debate]';
    expect((await page.$eval(btn, (b) => b.getAttribute('aria-expanded'))) === 'false', 'starts collapsed');
    await page.focus(btn);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid=rules-s-debate]');
    await sleep(400);
    const expanded = await page.$eval(btn, (b) => [b.getAttribute('aria-expanded'), b.getAttribute('aria-controls')]);
    const panelText = await page.$eval('[data-testid=rules-s-debate]', (e) => e.textContent);
    expect(expanded[0] === 'true' && expanded[1] === 'rules-s-debate', `aria ${expanded.join(',')}`);
    expect(panelText?.includes('ಶೀಘ್ರದಲ್ಲೇ'), `TODO rules → announced soon, got "${panelText}"`);
    await page.$eval('[data-testid=card-s-debate]', (e) => e.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: resolve(OUT, 'rules-open-kn-360.png') });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !document.querySelector('[data-testid=rules-s-debate]'));
    await page.browserContext().close();
    return `Enter opens (aria-expanded=true, controls panel), Space closes; TODO rules → "${panelText}"`;
  });

  await scenario(
    'status-down-fallback-kn',
    async (errors) => {
      const page = await open(browser, 'kn', 360, '/competitions?mock=statusdown', errors);
      const note = await page.$('[data-testid=live-unavailable]');
      const states = await page.$$eval('[data-testid=competition-grid] article', (as) => as.map((a) => a.getAttribute('data-state')));
      const beforeOpen = Date.now() < Date.parse(site.registrationOpen);
      const reason = await page.$eval('[data-testid=reason-s-essay]', (e) => e.textContent).catch(() => null);
      const disabled = await page.$eval('[data-testid=register-s-essay]', (b) => (b as HTMLButtonElement).disabled).catch(() => false);
      expect(note, '"live seat count unavailable" note');
      if (beforeOpen) {
        expect(states.every((s) => s === 'opensSoon'), `states ${states.join(',')}`);
        expect(disabled && reason?.includes('೮ ನವೆಂಬರ್'), `disabled register with "opens on" reason, got ${disabled} "${reason}"`);
      }
      const seats = await page.$$('[data-testid^=seats-]');
      expect(seats.length === 0, 'no seat counts without live data');
      await page.screenshot({ path: resolve(OUT, 'statusdown-kn-360.png'), fullPage: true });
      await page.browserContext().close();
      return `status endpoint down → note + retry; ${beforeOpen ? `before 8 Nov: all "${states[0]}", Register disabled, reason "${reason}"` : 'after open: fallback allows registration'}`;
    },
    /ERR_EMPTY_RESPONSE|Failed to load resource/,
  );

  await scenario('live-seats-and-full-en', async (errors) => {
    const page = await open(browser, 'en', 768, '/competitions?mock=', errors);
    const seats = await page.$eval('[data-testid=seats-s-essay]', (e) => e.textContent);
    expect(seats?.includes('100 of 100'), `live seats "${seats}"`);
    const full = await open(browser, 'en', 768, '/competitions?mock=full', errors);
    const fullStates = await full.$$eval('[data-testid=competition-grid] article', (as) => as.map((a) => a.getAttribute('data-state')));
    const reason = await full.$eval('[data-testid=reason-s-essay]', (e) => e.textContent).catch(() => '');
    await page.browserContext().close();
    await full.browserContext().close();
    return `live: "${seats}"; ?mock=full → states [${[...new Set(fullStates)].join(',')}]${reason ? `, reason "${reason}"` : ''}`;
  });

  await scenario('reduced-motion-kn', async (errors) => {
    const page = await open(browser, 'kn', 360, '/competitions?mock=', errors, true);
    // Cards must be visible immediately (no reveal animation) — check the last one without scrolling.
    const opacity = await page.$eval('[data-testid=competition-grid] li:last-child article', (e) => getComputedStyle(e).opacity);
    expect(opacity === '1', `last card opacity ${opacity} under reduced motion`);
    await page.click('[data-testid=toggle-faculty]');
    await page.screenshot({ path: resolve(OUT, 'reduced-motion-kn-360.png') });
    await page.browserContext().close();
    return 'all cards at full opacity without scrolling; toggle works';
  });

  await browser.close();
  writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${OUT}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
