/**
 * Brand-logo placement checks against the dev server.
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:brand      (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * kn/en × 320/360/1280:
 *   Home row    [seal plate] [college name] [25-years logo]: that DOM/visual order, all three centred on the
 *               same line, the row centred on the page, the 25 logo as tall as the seal plate, eager,
 *               correct alt, decoded WebP, no plate, no horizontal scroll, elephant still in the first screen (≤ 360 px).
 *   Footer      Honnudi wordmark + cultural emblem side by side: vertically centred on each other, whole logo
 *               row centred on the page, emblem not smaller than the wordmark, lazy, correct alt, no plate;
 *               footer height vs its `content-visibility` placeholder (--cv-h) reported.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer-core';
import kn from '../src/i18n/kn.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/brand');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

type Lang = 'kn' | 'en';
const ALT = {
  kn: { jubilee: kn.brand.jubileeLogoAlt, cultural: kn.brand.culturalLogoAlt },
  en: { jubilee: en.brand.jubileeLogoAlt, cultural: en.brand.culturalLogoAlt },
};
// Wording the brief asked for — guards against an i18n edit silently changing it.
expectEq(ALT.kn.jubilee, 'ಬಿ.ಎಂ.ಎಸ್.ಐ.ಟಿ.ಎಂ ೨೫ ವರ್ಷಗಳ ಶ್ರೇಷ್ಠತೆ', 'kn jubilee alt');
expectEq(ALT.en.jubilee, 'BMSIT&M 25 Years of Excellence, 2002–2027', 'en jubilee alt');
expectEq(ALT.kn.cultural, 'ಸಾಂಸ್ಕೃತಿಕ ಲಾಂಛನ', 'kn cultural alt');

function expectEq(a: unknown, b: unknown, what: string) {
  if (a !== b) throw new Error(`${what}: "${String(a)}" ≠ "${String(b)}"`);
}
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const results: { name: string; ok: boolean }[] = [];
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
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

async function open(browser: Browser, lang: Lang, width: number, errors: string[]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height: width < 768 ? 760 : 820, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(
    `globalThis.__name = (f) => f; localStorage.setItem('kr26.lang', ${JSON.stringify(lang)}); sessionStorage.setItem('seenIntro', '1');`,
  );
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?now=`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid=hero-scene]');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function main() {
  await fetch(`${BASE}/`).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

  for (const lang of ['kn', 'en'] as const) {
    for (const width of [320, 360, 1280]) {
      // ---------- Home logo row ----------
      await scenario(`home-row-${lang}-${width}`, async (errors) => {
        const page = await open(browser, lang, width, errors);
        const m = await page.evaluate(() => {
          const row = document.querySelector('[data-testid=college-row-main]')!;
          const r = (el: Element) => {
            const { left, right, top, bottom, width, height } = el.getBoundingClientRect(); // DOMRect itself does not serialise
            return { left, right, top, bottom, width, height };
          };
          const seal = row.querySelector<HTMLElement>('.logo-plate')!;
          const name = row.querySelector('p')!;
          const jub = row.querySelector<HTMLImageElement>('img[src*="25-logo"]');
          const rowRect = r(row);
          const kids = [seal, name, jub].map((e) => (e ? r(e) : null));
          return {
            hasJub: !!jub,
            order: jub ? [...row.children].indexOf(seal) < [...row.children].indexOf(name) && [...row.children].indexOf(name) < [...row.children].indexOf(jub) : false,
            kids,
            alt: jub?.alt,
            loading: jub?.getAttribute('loading'),
            wh: jub ? [jub.getAttribute('width'), jub.getAttribute('height')] : null,
            decoded: jub ? jub.complete && jub.naturalWidth > 0 : false,
            src: jub?.currentSrc ?? '',
            inPlate: !!jub?.closest('.logo-plate'),
            rowCentre: (rowRect.left + rowRect.right) / 2,
            rowLeft: rowRect.left,
            rowRight: rowRect.right,
            rowBottom: Math.round(rowRect.bottom),
            vw: document.documentElement.clientWidth,
            hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            elephantBottom: Math.round(r(document.querySelector('.hero-scene .ambari')!).bottom),
            viewH: window.innerHeight,
          };
        });
        await page.screenshot({ path: resolve(OUT, `home-${lang}-${width}.png`), clip: { x: 0, y: 60, width, height: 120 } });
        expect(m.hasJub && m.order, '25 logo missing or not [seal][name][25] in DOM order');
        const [seal, name, jub] = m.kids as { left: number; right: number; top: number; bottom: number; width: number; height: number }[];
        expect(name!.right <= jub!.left + 0.5 && seal!.right <= name!.left + 0.5, 'row items overlap / wrong visual order');
        const mid = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;
        expect(Math.abs(mid(seal!) - mid(jub!)) <= 1.5, `seal and 25 logo not on one line (${mid(seal!).toFixed(1)} vs ${mid(jub!).toFixed(1)})`);
        expect(Math.abs(mid(name!) - mid(jub!)) <= 1.5, `name not centred on the logos (${mid(name!).toFixed(1)} vs ${mid(jub!).toFixed(1)})`);
        expect(Math.abs(seal!.height - jub!.height) <= 1.5, `25 logo ${jub!.height}px tall vs seal plate ${seal!.height}px`);
        expect(Math.abs(m.rowCentre - m.vw / 2) <= 1.5, `row centred at ${m.rowCentre}px, page centre ${m.vw / 2}px`);
        expect(m.rowLeft >= 0 && m.rowRight <= m.vw && !m.hScroll, 'row overflows the viewport');
        expect(m.alt === ALT[lang].jubilee, `alt "${m.alt}"`);
        expect(m.loading !== 'lazy', '25 logo is lazy-loaded above the fold');
        expect(m.wh?.every((v) => Number(v) > 0), 'width/height attributes missing');
        expect(m.decoded && m.src.endsWith('.webp'), `not decoded as WebP (${m.src})`);
        expect(!m.inPlate, '25 logo unexpectedly on a plate');
        if (width <= 360) expect(m.elephantBottom <= m.viewH, `elephant ends at ${m.elephantBottom}px, below the ${m.viewH}px first screen`);
        await page.browserContext().close();
        return `order ✓, one line (centres ${mid(seal!).toFixed(1)}/${mid(name!).toFixed(1)}/${mid(jub!).toFixed(1)}), logo ${jub!.width.toFixed(0)}×${jub!.height.toFixed(0)} vs seal ${seal!.height.toFixed(0)}, row centred, elephant ↓${m.elephantBottom}/${m.viewH}`;
      });

      // ---------- Footer pair ----------
      await scenario(`footer-pair-${lang}-${width}`, async (errors) => {
        const page = await open(browser, lang, width, errors);
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
        await page.waitForFunction(
          () => {
            const i = document.querySelector<HTMLImageElement>('footer img[src*="cultural"]');
            return !!i && i.complete && i.naturalWidth > 0;
          },
          { timeout: 8000 },
        );
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
        const m = await page.evaluate(() => {
          const r = (el: Element) => {
            const { left, right, top, bottom, width, height } = el.getBoundingClientRect(); // DOMRect itself does not serialise
            return { left, right, top, bottom, width, height };
          };
          const footer = document.querySelector('footer')!;
          const logos = footer.querySelector('[data-testid=footer-logos]')!;
          const club = footer.querySelector<HTMLImageElement>('img[src*="honnudi-logo"]')!;
          const cul = footer.querySelector<HTMLImageElement>('img[src*="cultural"]')!;
          const l = r(logos);
          return {
            club: r(club),
            cul: r(cul),
            sameParent: club.parentElement === cul.parentElement,
            logosCentre: (l.left + l.right) / 2,
            logosLeft: l.left,
            logosRight: l.right,
            vw: document.documentElement.clientWidth,
            hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            alt: cul.alt,
            loading: cul.getAttribute('loading'),
            wh: [cul.getAttribute('width'), cul.getAttribute('height')],
            src: cul.currentSrc,
            inPlate: !!cul.closest('.logo-plate'),
            footerH: Math.round(r(footer).height),
            placeholder: getComputedStyle(footer).getPropertyValue('--cv-h').trim(),
            footers: document.querySelectorAll('footer').length,
          };
        });
        await page.screenshot({ path: resolve(OUT, `footer-${lang}-${width}.png`) });
        const mid = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;
        expect(m.footers === 1, `footer ×${m.footers}`);
        expect(m.sameParent, 'Honnudi and cultural logos are not a pair');
        expect(m.club.right <= m.cul.left + 0.5, 'cultural logo is not to the right of the Honnudi logo');
        expect(Math.abs(mid(m.club) - mid(m.cul)) <= 1.5, `pair not vertically centred (${mid(m.club).toFixed(1)} vs ${mid(m.cul).toFixed(1)})`);
        expect(m.cul.height >= m.club.height && m.cul.height <= m.club.height * 1.4, `cultural ${m.cul.height}px vs Honnudi ${m.club.height}px`);
        expect(Math.abs(m.logosCentre - m.vw / 2) <= 1.5, `logo row centred at ${m.logosCentre}px, page centre ${m.vw / 2}px`);
        expect(m.logosLeft >= 0 && m.logosRight <= m.vw && !m.hScroll, 'footer logos overflow the viewport');
        expect(m.alt === ALT[lang].cultural, `alt "${m.alt}"`);
        expect(m.loading === 'lazy', 'cultural logo should be lazy in the footer');
        expect(m.wh.every((v) => Number(v) > 0), 'width/height attributes missing');
        expect(m.src.endsWith('.webp'), `not WebP (${m.src})`);
        expect(!m.inPlate, 'cultural logo unexpectedly on a plate');
        await page.browserContext().close();
        return `pair ✓ (centres ${mid(m.club).toFixed(1)}/${mid(m.cul).toFixed(1)}, ${m.club.height}px + ${m.cul.height}px), row centred, footer ${m.footerH}px (placeholder ${m.placeholder})`;
      });
    }
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} brand checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
