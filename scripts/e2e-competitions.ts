/**
 * Browser checks for /competitions against the dev server (mock endpoint).
 *   1. npm run dev                 (in another terminal)
 *   2. npm run e2e:competitions    (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * Both languages × 320/360/768/1280 px: no horizontal scroll, layout columns, no clipped Kannada,
 * footer once, no console errors. Plus behaviour: ?for= sync, Register links, TBA values,
 * one tel: link per coordinator (Treasure Hunt has three), rules disclosure + every rule list vs events.json,
 * General instructions panel, live open/closed status + fallback, reduced motion.
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
              tel: [...document.querySelectorAll('[data-testid=competition-grid] a[href^="tel:"]')].map((a) => a.getAttribute('href')),
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
          // One tel: link per coordinator, in data order, each a full +91 number (never a dead link).
          const wantTel = (cat === 'students' ? students : faculty).flatMap((e) => e.coordinators.map((c) => `tel:+91${c.phone}`));
          expect(m.tel.join() === wantTel.join(), `tel: links ${m.tel.length}, expected ${wantTel.length} matching events.json`);
          expect(m.clipped.length === 0, `clipped headings: ${m.clipped.join(', ')}`);
          expect(m.pressed === `toggle-${cat}`, `toggle shows ${m.pressed}`);
          await page.browserContext().close();
          return `${m.cards} cards, ${cols} col, no h-scroll, footer×1, ${m.tel.length} tel: links = coordinators, no clipping`;
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
    expect(card.includes('12:30 PM – 4:30 PM') && card.includes('BSN 422'), 'time range + venue');
    const quiz = await page.$eval('[data-testid=card-s-quiz]', (e) => e.textContent ?? '');
    expect(quiz.includes('12:30 PM – 4:30 PM') && quiz.includes('To be announced'), 'quiz: time known, venue TBA');
    const essay = events.find((e) => e.id === 's-essay')!;
    expect(card.includes('Coordinators') && essay.coordinators.every((c) => card.includes(c.name)), 'coordinator names from events.json');
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
    return `TBA shown for time/venue, coordinator names shown, no raw TODO; ${hrefs.length} Register links → /register?event=<id>; clicking Quiz opens the form preselected`;
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
    const items = await page.$$eval('[data-testid=rules-s-debate] li', (li) => li.map((x) => x.textContent));
    const debate = events.find((e) => e.id === 's-debate')!;
    expect(expanded[0] === 'true' && expanded[1] === 'rules-s-debate', `aria ${expanded.join(',')}`);
    expect(items.join('|') === debate.rules.kn.join('|'), `Kannada debate rules: ${items.length} items, expected ${debate.rules.kn.length}`);
    await page.$eval('[data-testid=card-s-debate]', (e) => e.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: resolve(OUT, 'rules-open-kn-360.png') });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !document.querySelector('[data-testid=rules-s-debate]'));
    // Faculty Group Dance has no rules in the PDF yet → "announced soon".
    await page.click('[data-testid=toggle-faculty]');
    await page.waitForSelector('[data-testid=rules-toggle-f-group-dance]');
    await page.click('[data-testid=rules-toggle-f-group-dance]');
    await page.waitForSelector('[data-testid=rules-f-group-dance]');
    const tba = await page.$eval('[data-testid=rules-f-group-dance]', (e) => e.textContent);
    expect(tba?.includes('ಶೀಘ್ರದಲ್ಲೇ'), `TODO rules → announced soon, got "${tba}"`);
    await page.browserContext().close();
    return `Enter opens (aria-expanded=true, controls panel), Space closes; ${items.length} Kannada debate rules from data; f-group-dance → "${tba}"`;
  });

  for (const lang of ['kn', 'en'] as const) {
    await scenario(`every-card-rules-match-data-${lang}`, async (errors) => {
      const issues: string[] = [];
      for (const cat of ['students', 'faculty'] as const) {
        const page = await open(browser, lang, 1280, `/competitions?for=${cat}&mock=`, errors, true);
        for (const e of events.filter((x) => x.category === cat)) {
          await page.click(`[data-testid=rules-toggle-${e.id}]`);
          await page.waitForSelector(`[data-testid=rules-${e.id}]`);
          const items = await page.$$eval(`[data-testid=rules-${e.id}] li`, (li) => li.map((x) => x.textContent));
          const want = e.rules[lang].filter((r) => r !== 'TODO-CONFIRM');
          if (items.join('|') !== want.join('|')) issues.push(`${e.id}: ${items.length} shown, ${want.length} in data`);
        }
        const text = await page.$eval('main', (m) => m.textContent ?? '');
        if (text.includes('TODO')) issues.push(`${cat}: raw TODO text`);
        await page.browserContext().close();
      }
      expect(!issues.length, issues.join('; '));
      return `all ${events.length} rule lists render exactly as in events.json (${lang}), numbered, no raw TODO`;
    });

    await scenario(`treasure-hunt-three-coordinators-${lang}-360`, async (errors) => {
      const page = await open(browser, lang, 360, '/competitions?for=students&mock=', errors);
      const hunt = events.find((e) => e.id === 's-treasure-hunt')!;
      await page.$eval('[data-testid=card-s-treasure-hunt]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(600);
      const m = await page.$eval('[data-testid=coordinators-s-treasure-hunt]', (box) => {
        const vw = document.documentElement.clientWidth;
        const card = box.closest('article')!.getBoundingClientRect();
        return {
          label: box.querySelector('p')?.textContent ?? '',
          rows: [...box.querySelectorAll('li')].map((li) => {
            const a = li.querySelector('a');
            const r = (a ?? li).getBoundingClientRect();
            const n = li.querySelector('span')!.getBoundingClientRect();
            return {
              name: li.querySelector('span')?.textContent ?? '',
              href: a?.getAttribute('href') ?? null,
              aria: a?.getAttribute('aria-label') ?? '',
              h: r.height,
              inside: r.left >= card.left - 0.5 && r.right <= card.right + 0.5 && n.right <= card.right + 0.5 && r.right <= vw,
            };
          }),
          hScroll: document.documentElement.scrollWidth > vw,
        };
      });
      expect(m.rows.length === 3, `${m.rows.length} coordinator rows`);
      m.rows.forEach((r, i) => {
        const c = hunt.coordinators[i]!;
        expect(r.name === c.name, `row ${i} name "${r.name}"`);
        expect(r.href === `tel:+91${c.phone}`, `row ${i} href ${r.href}`);
        expect(r.aria.includes(c.name), `row ${i} aria-label "${r.aria}"`);
        expect(r.h >= 44, `row ${i} link only ${r.h}px tall`);
        expect(r.inside, `row ${i} leaves the card or the screen`);
      });
      expect(m.label === (lang === 'kn' ? 'ಸಂಯೋಜಕರು' : 'Coordinators'), `label "${m.label}"`);
      expect(!m.hScroll, 'horizontal scroll');
      await page.$eval('[data-testid=coordinators-s-treasure-hunt]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: resolve(OUT, `coordinators-treasure-hunt-${lang}-360.png`) });
      await page.browserContext().close();
      return `3 coordinators, each with its own tel:+91… link (≥44 px, labelled), all inside the card at 360 px, no h-scroll`;
    });

    await scenario(`general-instructions-${lang}-360`, async (errors) => {
      const page = await open(browser, lang, 360, '/competitions?mock=', errors);
      const btn = '[data-testid=general-rules-toggle]';
      const before = await page.$eval(btn, (b) => [b.getAttribute('aria-expanded'), b.textContent?.trim()]);
      expect(before[0] === 'false', 'starts collapsed');
      expect(before[1] === (lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಸೂಚನೆಗಳು' : 'General instructions'), `label "${before[1]}"`);
      const gridTop = await page.$eval('[data-testid=competition-grid]', (g) => g.getBoundingClientRect().top);
      const btnTop = await page.$eval(btn, (b) => b.getBoundingClientRect().top);
      expect(btnTop < gridTop, 'panel sits above the cards');
      await page.click(btn);
      await page.waitForSelector('[data-testid=general-rules]');
      await sleep(400);
      const items = await page.$$eval('[data-testid=general-rules] li', (li) => li.map((x) => x.textContent));
      const want = site.generalRules[lang];
      expect(items.join('|') === want.join('|'), `${items.length} items, expected ${want.length} from site.json`);
      expect(!items.some((x) => /10:15/.test(x ?? '')), 'no fixed 10:15 reporting time');
      const geo = await page.$eval('[data-testid=general-rules]', (p) => {
        const r = p.getBoundingClientRect();
        return { right: r.right, vw: document.documentElement.clientWidth, hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
      });
      expect(geo.right <= geo.vw && !geo.hScroll, 'panel fits, no horizontal scroll');
      await page.screenshot({ path: resolve(OUT, `general-instructions-${lang}-360.png`) });
      await page.browserContext().close();
      return `collapsed by default, above the cards; opens to the ${items.length} instructions from site.json; fits 360 px`;
    });
  }

  await scenario(
    'status-down-fallback-kn',
    async (errors) => {
      const page = await open(browser, 'kn', 360, '/competitions?mock=statusdown', errors);
      const note = await page.$eval('[data-testid=live-unavailable]', (e) => e.textContent).catch(() => null);
      const states = await page.$$eval('[data-testid=competition-grid] article', (as) => as.map((a) => a.getAttribute('data-state')));
      const beforeDeadline = Date.now() < Date.parse(events[0]!.deadline);
      const hrefs = await page.$$('[data-testid=competition-grid] a[href^="/register"]');
      expect(note?.includes('ಲೈವ್ ತೆರೆದ/ಮುಚ್ಚಿದ ಸ್ಥಿತಿ'), `"live open/closed status unavailable" note, got "${note}"`);
      // Registration is open from the start: without live data the cards fall back to events.json + the clock.
      const want = beforeDeadline ? 'open' : 'deadline';
      expect(states.length > 0 && states.every((s) => s === want), `states ${states.join(',')}, expected all "${want}"`);
      expect(beforeDeadline ? hrefs.length === states.length : hrefs.length === 0, `${hrefs.length} Register links`);
      expect((await page.$$('[data-testid^=seats-]')).length === 0, 'no seat counts');
      await page.screenshot({ path: resolve(OUT, 'statusdown-kn-360.png'), fullPage: true });
      await page.browserContext().close();
      return `status endpoint down → note + retry; fallback from events.json + clock: all cards "${want}", ${hrefs.length} Register links`;
    },
    /ERR_EMPTY_RESPONSE|Failed to load resource/,
  );

  await scenario('live-status-open-and-closed-en', async (errors) => {
    const set = (value: string) => fetch(`${BASE}/mock-api/__set?id=s-essay&header=is_open&value=${value}`);
    const page = await open(browser, 'en', 768, '/competitions?mock=', errors);
    const states = await page.$$eval('[data-testid=competition-grid] article', (as) => as.map((a) => a.getAttribute('data-state')));
    const text = await page.$eval('main', (e) => e.textContent ?? '');
    expect(states.every((s) => s === 'open'), `all open from the start, got ${states.join(',')}`);
    expect(!/seat|opens soon|full/i.test(text), 'no seat / "Opens soon" / "Full" wording on the page');
    expect((await page.$$('[data-testid^=seats-]')).length === 0, 'no seat counts');
    await page.browserContext().close();

    await set('FALSE'); // a coordinator closes one event in the Sheet
    try {
      const closed = await open(browser, 'en', 768, '/competitions?mock=', errors);
      const closedState = await closed.$eval('[data-testid=card-s-essay]', (e) => e.getAttribute('data-state'));
      const otherState = await closed.$eval('[data-testid=card-s-poem]', (e) => e.getAttribute('data-state'));
      const disabled = await closed.$eval('[data-testid=register-s-essay]', (b) => (b as HTMLButtonElement).disabled);
      const reason = await closed.$eval('[data-testid=reason-s-essay]', (e) => e.textContent);
      expect(closedState === 'closed' && otherState === 'open', `essay ${closedState}, poem ${otherState}`);
      expect(disabled && /closed/i.test(reason ?? ''), `register disabled with a reason, got ${disabled} "${reason}"`);
      await closed.browserContext().close();
      return `all ${states.length} cards open with no seat wording; is_open=FALSE on Essay → that card "closed" (Register disabled: "${reason}"), the rest stay open`;
    } finally {
      await set('TRUE');
    }
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
