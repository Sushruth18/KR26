/**
 * Brass plaques on Home and Event Details (ui/BrassPlaque) against the dev server (mock endpoint).
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:plaques    (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * kn/en × 320/360/768/1280/1920 px, for every plaque:
 *  - nothing overflows: the face, the value line and every value/unit/caption piece have scrollWidth <= clientWidth,
 *    and every piece's box (measured as rects, because <body> clips horizontal overflow) lies inside the card face;
 *  - no plaque overlaps a neighbour;
 *  - all cards on the page are the same height; in each row the icons and the first caption line line up;
 *  - the value is at least 16 px, wraps to at most two lines, and only Latin digits are shown (numerals rule);
 *  - Event Details' time value breaks only after the dash ("9:00 AM –" / "5:45 PM").
 * Screenshots of each plaque row go to e2e-output/plaques.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/plaques');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

type Lang = 'kn' | 'en';
const WIDTHS = [320, 360, 768, 1280, 1920];
const PAGES = [
  { name: 'home', path: '/?mock=', count: 3 },
  { name: 'event', path: '/event?mock=', count: 4 },
];
const results: { name: string; ok: boolean; detail: string }[] = [];
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function open(browser: Browser, lang: Lang, width: number, path: string, errors: string[]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(`localStorage.setItem('kr26.lang', ${JSON.stringify(lang)}); sessionStorage.setItem('seenIntro', '1');`);
  // Final state straight away (no scroll reveal / count-up) so every plaque is measured as it ends up.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid=plaques] [data-testid=plaque]');
  await page.evaluate(() => document.fonts.ready);
  // content-visibility:auto would skip layout of the off-screen section.
  await page.$eval('[data-testid=plaques]', (s) => ((s as HTMLElement).style.contentVisibility = 'visible'));
  await page.$eval('[data-testid=plaques]', (s) => s.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 150));
  return page;
}

interface Measured {
  cards: { top: number; left: number; right: number; bottom: number; height: number; iconTop: number; capTop: number }[];
  problems: string[];
  values: { text: string; fontSize: number; lines: number }[];
}

// A string, not a function: tsx/esbuild would inject a `__name` helper that does not exist in the page.
const MEASURE = `(function () {
  var problems = [];
  var cards = [];
  var values = [];
  var plaques = Array.prototype.slice.call(document.querySelectorAll('[data-testid=plaques] [data-testid=plaque]'));
  plaques.forEach(function (p, i) {
    var face = p.querySelector('.plaque-face');
    var f = face.getBoundingClientRect();
    var cs = getComputedStyle(face);
    var inner = { left: f.left + parseFloat(cs.paddingLeft) - 1, right: f.right - parseFloat(cs.paddingRight) + 1, top: f.top - 1, bottom: f.bottom + 1 };
    [face, p.querySelector('.plaque-line'), p.querySelector('.plaque-value'), p.querySelector('.plaque-unit'), p.querySelector('.plaque-caption')].forEach(function (el) {
      if (!el) return;
      if (el.scrollWidth > el.clientWidth + 0) problems.push('plaque ' + i + ' ' + el.className + ': scrollWidth ' + el.scrollWidth + ' > clientWidth ' + el.clientWidth);
    });
    p.querySelectorAll('.plaque-value, .plaque-unit, .plaque-caption, .plaque-icon').forEach(function (el) {
      var rects = Array.prototype.slice.call(el.getClientRects());
      var range = document.createRange();
      range.selectNodeContents(el);
      rects = rects.concat(Array.prototype.slice.call(range.getClientRects()));
      rects.forEach(function (r) {
        if (r.width === 0) return;
        if (r.left < inner.left || r.right > inner.right || r.top < inner.top || r.bottom > inner.bottom)
          problems.push('plaque ' + i + ' ' + el.className + ' "' + (el.textContent || '').trim() + '" leaves its card: ' +
            [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)].join(',') + ' vs ' +
            [Math.round(inner.left), Math.round(inner.right), Math.round(inner.top), Math.round(inner.bottom)].join(','));
      });
    });
    var v = p.querySelector('.plaque-value');
    var vs = getComputedStyle(v);
    var lineRange = document.createRange();
    lineRange.selectNodeContents(v);
    var tops = {};
    Array.prototype.slice.call(lineRange.getClientRects()).forEach(function (r) { if (r.width > 0) tops[Math.round(r.top / 4)] = 1; });
    values.push({ text: v.textContent, fontSize: parseFloat(vs.fontSize), lines: Object.keys(tops).length });
    var b = p.getBoundingClientRect();
    cards.push({ top: b.top, left: b.left, right: b.right, bottom: b.bottom, height: b.height,
      iconTop: p.querySelector('.plaque-icon').getBoundingClientRect().top, capTop: p.querySelector('.plaque-caption').getBoundingClientRect().top });
  });
  return { cards: cards, problems: problems, values: values };
})()`;

async function check(page: Page, expectCount: number): Promise<string> {
  const m = (await page.evaluate(MEASURE)) as Measured;
  expect(m.cards.length === expectCount, `${m.cards.length} plaques, expected ${expectCount}`);
  expect(m.problems.length === 0, m.problems.join('\n      '));
  // No overlap with any neighbour.
  for (let a = 0; a < m.cards.length; a++) {
    for (let b = a + 1; b < m.cards.length; b++) {
      const A = m.cards[a]!;
      const B = m.cards[b]!;
      const overlap = A.left < B.right - 0.5 && B.left < A.right - 0.5 && A.top < B.bottom - 0.5 && B.top < A.bottom - 0.5;
      expect(!overlap, `plaques ${a} and ${b} overlap`);
    }
  }
  const heights = m.cards.map((c) => Math.round(c.height));
  expect(Math.max(...heights) - Math.min(...heights) <= 1, `card heights differ: ${heights.join(', ')}`);
  // Rows: cards sharing a top edge.
  const rows = new Map<number, Measured['cards']>();
  for (const c of m.cards) rows.set(Math.round(c.top), [...(rows.get(Math.round(c.top)) ?? []), c]);
  for (const row of rows.values()) {
    const icon = row.map((c) => Math.round(c.iconTop));
    const cap = row.map((c) => Math.round(c.capTop));
    expect(Math.max(...icon) - Math.min(...icon) <= 1, `icons not aligned in a row: ${icon.join(', ')}`);
    expect(Math.max(...cap) - Math.min(...cap) <= 1, `captions not aligned in a row: ${cap.join(', ')}`);
  }
  for (const v of m.values) {
    expect(v.fontSize >= 16, `value "${v.text}" is ${v.fontSize}px`);
    expect(v.lines <= 2, `value "${v.text}" wraps to ${v.lines} lines`);
    expect(!/[\u0CE6-\u0CEF]/.test(v.text), `value "${v.text}" uses Kannada digits`);
  }
  return `${m.cards.length} cards ${heights[0]}px tall, ${rows.size} row(s); values ${m.values.map((v) => `${Math.round(v.fontSize)}px×${v.lines}`).join(' ')}`;
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

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  for (const pg of PAGES) {
    for (const lang of ['kn', 'en'] as const) {
      for (const width of WIDTHS) {
        await scenario(`${pg.name}-${lang}-${width}`, async (errors) => {
          const page = await open(browser, lang, width, pg.path, errors);
          const detail = await check(page, pg.count);
          const el = await page.$('[data-testid=plaques]');
          await el!.screenshot({ path: resolve(OUT, `${pg.name}-${lang}-${width}.png`) });
          await page.browserContext().close();
          return detail;
        });
      }
    }
  }

  // The time range wraps only after the dash; the Kannada venue only at its zero-width space.
  for (const lang of ['kn', 'en'] as const) {
    await scenario(`event-time-breaks-${lang}`, async (errors) => {
      const page = await open(browser, lang, 1280, '/event?mock=', errors);
      const lines = (await page.evaluate(`(function () {
        var out = [];
        Array.prototype.slice.call(document.querySelectorAll('[data-testid=plaques] .plaque-value')).forEach(function (v) {
          var text = v.firstChild;
          var rows = {};
          for (var i = 0; i < text.length; i++) {
            var r = document.createRange();
            r.setStart(text, i);
            r.setEnd(text, i + 1);
            var rect = r.getBoundingClientRect();
            if (rect.width === 0) continue;
            var k = Math.round(rect.top / 4);
            rows[k] = (rows[k] || '') + text.data[i];
          }
          out.push(Object.keys(rows).sort(function (a, b) { return a - b; }).map(function (k) { return rows[k].replace(/[\\u00a0\\u200b]/g, ' ').trim(); }));
        });
        return out;
      })()`)) as string[][];
      const time = lines[1]!;
      expect(time.length === 2 && time[0]!.endsWith('–') && !time[1]!.includes('–'), `time lines ${JSON.stringify(time)}`);
      if (lang === 'kn') expect(lines[2]!.length <= 2 && (lines[2]!.length === 1 || lines[2]![0] === 'ಬಿ.ಎಂ.ಎಸ್.'), `venue lines ${JSON.stringify(lines[2])}`);
      await page.browserContext().close();
      return `time ${JSON.stringify(time)}; venue ${JSON.stringify(lines[2])}`;
    });
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ''}. Screenshots in ${OUT}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
