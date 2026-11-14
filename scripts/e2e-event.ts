/**
 * Browser checks for /event against the dev server (mock endpoint).
 *   1. npm run dev          (in another terminal)
 *   2. npm run e2e:event    (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * kn/en × 320/360/768/1280 px: no clipped or overflowing element, footer once, one h1, no console errors,
 * Day 2 timeline = schedule.json (order, start times only, per-language numerals, no Break), Now/Next from the
 * dev clock, headline artists section (both artists, equal frames, stacked / side by side) + stop + banner, day tabs and ?day=, Day 1 stops, lazy map, reduced
 * motion, and no banned programme names in the rendered text, alt or aria text.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import artists from '../src/data/artist.json' with { type: 'json' };
import artistAssets from '../src/data/artist.generated.json' with { type: 'json' };
import events from '../src/data/events.json' with { type: 'json' };
import schedule from '../src/data/schedule.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };
import { formatDate, formatTime } from '../src/lib/format';
import { BANNED } from './banned-terms';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/event');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

type Lang = 'kn' | 'en';
const day2 = schedule.filter((s) => s.day === 2);
const results: { name: string; ok: boolean; detail: string }[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const ist = (hhmm: string, date = site.day2Date) => encodeURIComponent(`${date}T${hhmm}:00+05:30`);

async function open(browser: Browser, lang: Lang, width: number, path: string, errors: string[], reduced = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(
    `localStorage.setItem('kr26.lang', ${JSON.stringify(lang)}); sessionStorage.setItem('seenIntro', '1');`,
  );
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid=day-tabs]');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function revealAll(page: Page) {
  await page.evaluate(async () => {
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

/** Reads the Day 2 timeline: one record per stop. */
const readStops = (page: Page) =>
  page.$$eval('[data-testid=timeline-day2] > li', (lis) =>
    lis.map((li) => ({
      id: li.getAttribute('data-testid'),
      state: li.getAttribute('data-state'),
      current: li.getAttribute('aria-current'),
      time: li.querySelector('time')?.textContent ?? '',
      dateTime: li.querySelector('time')?.getAttribute('datetime') ?? '',
      title: li.querySelector('h3')?.textContent ?? '',
      text: (li as HTMLElement).innerText,
      links: li.querySelectorAll('a, button').length,
      now: !!li.querySelector('[data-testid=pill-now]'),
      next: !!li.querySelector('[data-testid=pill-next]'),
    })),
  );

async function main() {
  await fetch(`${BASE}/mock-api/__reset`, { method: 'POST' }).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const noon = `now=${ist('11:00')}`;

  // ---------- Layout matrix ----------
  for (const lang of ['kn', 'en'] as const) {
    for (const width of [320, 360, 768, 1280]) {
      await scenario(`layout-${lang}-${width}`, async (errors) => {
        const page = await open(browser, lang, width, `/event?day=2&${noon}&mock=`, errors);
        await revealAll(page);
        const m = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          // body has overflow-x: clip, so scrollWidth cannot see clipped content: measure element rects instead.
          const out = [...document.querySelectorAll('main *')]
            .filter((el) => {
              if (el.closest('.sr-only, svg, .route-road, .darbar-pillar')) return false;
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.right > vw + 1 || r.left < -1);
            })
            .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`.slice(0, 60));
          const clipped = [...document.querySelectorAll('h1, h2, h3')]
            .filter((h) => {
              if (h.classList.contains('sr-only')) return false;
              for (let el: Element | null = h; el; el = el.parentElement) {
                const cs = getComputedStyle(el);
                if (cs.overflow !== 'visible' && el.scrollHeight > el.clientHeight + 1 && cs.position !== 'fixed') return true;
              }
              return false;
            })
            .map((h) => h.textContent);
          return {
            out,
            clipped,
            hScroll: document.documentElement.scrollWidth > vw,
            footers: document.querySelectorAll('footer').length,
            h1: document.querySelectorAll('h1').length,
            stops: document.querySelectorAll('[data-testid=timeline-day2] > li').length,
            banners: document.querySelectorAll('[data-testid^=attraction-]:not([data-testid=attraction-artist])').length,
            frames: document.querySelectorAll('.darbar').length,
          };
        });
        await page.addStyleTag({ content: '.cv-auto{content-visibility:visible!important}' });
        await page.screenshot({ path: resolve(OUT, `${lang}-${width}.png`), fullPage: true });
        await page.browserContext().close();
        expect(!m.hScroll, 'horizontal scroll');
        expect(m.out.length === 0, `elements outside the viewport: ${m.out.slice(0, 5).join(', ')}`);
        expect(m.clipped.length === 0, `clipped headings: ${m.clipped.join(', ')}`);
        expect(m.footers === 1 && m.h1 === 1, `footers ${m.footers}, h1 ${m.h1}`);
        expect(m.stops === day2.length, `stops ${m.stops}`);
        expect(m.banners === 5, `banners ${m.banners}`);
        expect(m.frames === 1 + artists.length, `Darbar frames ${m.frames} (guests + ${artists.length} artists)`);
        return `${m.stops} stops, ${m.banners} banners, ${m.frames} frames, no overflow/clipping, footer×1, h1×1`;
      });
    }
  }

  // ---------- Day 2 timeline content ----------
  for (const lang of ['kn', 'en'] as const) {
    await scenario(`timeline-content-${lang}`, async (errors) => {
      const page = await open(browser, lang, 360, `/event?day=2&${noon}&mock=`, errors);
      const stops = await readStops(page);
      await page.browserContext().close();
      expect(stops.length === day2.length, `${stops.length} stops`);
      const time = (hhmm: string) => formatTime(hhmm, lang);
      day2.forEach((s, i) => {
        const got = stops[i]!;
        expect(got.id === `stop-${s.start.replace(':', '')}`, `stop ${i} is ${got.id}`);
        expect(got.dateTime === s.start && got.time === time(s.start), `${s.start}: shows "${got.time}", expected "${time(s.start)}"`);
        expect(got.title === s.title[lang], `${s.start}: title "${got.title}" ≠ "${s.title[lang]}"`);
        expect(got.text.includes(s.venue[lang]), `${s.start}: venue ${s.venue[lang]} missing`);
        // Start times only: exactly one time in the card, no range dash, no duration units.
        const times = got.text.match(/[0-9೦-೯]{1,2}:[0-9೦-೯]{2}/g) ?? [];
        expect(times.length === 1, `${s.start}: ${times.length} times in the card (${times.join(', ')})`);
        expect(!/[–—]/.test(got.text) && !/\d\s?h\b|\d\s?m\b|ಗಂ|ನಿ\b/.test(got.text), `${s.start}: looks like an end time or duration: ${got.text}`);
        expect(got.links === 0, `${s.start}: has ${got.links} link/button (no registration on Day 2)`);
      });
      if (lang === 'kn') expect(/^[^0-9]*$/.test(stops.map((s) => s.time).join('')), 'kn times use Kannada numerals only');
      else expect(!/[೦-೯]/.test(stops.map((s) => s.time).join('')), 'en times use Latin numerals only');
      expect(!stops.some((s) => /Break|ವಿರಾಮ/.test(s.text)), 'no Break stop');
      const proc = stops.find((s) => s.id === 'stop-1000')!;
      expect(proc.text.includes(day2[1]!.description![lang]), 'procession keeps "with Veeragase & Tamate troupes"');
      const rally = stops[0]!;
      expect(rally.text.includes(lang === 'kn' ? 'ಬಿಲ್‌ಬೋರ್ಡ್' : 'Bill Board'), 'rally venue is Bill Board');
      const concert = stops[stops.length - 1]!;
      expect(artists.every((a) => concert.text.includes(a.name[lang])), `headline stop shows ${artists.map((a) => a.name[lang]).join(' · ')}`);
      return `9 stops match schedule.json; ${lang} numerals; single start time per card; no links; both artists on the 14:30 stop`;
    });
  }

  await scenario('procession-highlight-ambari', async (errors) => {
    const page = await open(browser, 'en', 360, `/event?day=2&now=${ist('08:00')}&mock=`, errors);
    const r = await page.evaluate(() => ({
      highlighted: [...document.querySelectorAll('[data-highlight=true]')].map((e) => e.getAttribute('data-testid')),
      ambariInCard: !!document.querySelector('[data-testid=stop-1000] .route-card .ambari'),
      ambariOnNode: document.querySelectorAll('.route-node .ambari').length,
    }));
    await page.browserContext().close();
    expect(r.highlighted.join() === 'stop-1000', `highlight ${r.highlighted.join()}`);
    expect(r.ambariInCard, 'procession card carries the Ambari');
    expect(r.ambariOnNode === 0, 'no Now marker before the programme starts');
    return 'only the Inauguration & Procession stop is highlighted, with the Ambari; no marker at 08:00';
  });

  // ---------- Now / Next ----------
  const cases: [string, string, string | null, string][] = [
    ['08:00', '', '0900', 'before the first stop: nothing current, 09:00 is next'],
    ['09:30', '0900', '1000', 'rally current, procession next'],
    ['10:00', '1000', '1205', 'exactly on a start: that stop is current'],
    ['12:50', '1245', '1300', 'mid-programme'],
    ['14:29', '1350', '1430', 'one minute before the headline'],
    ['16:00', '1430', null, 'the last stop runs on; nothing next'],
    ['17:46', '', null, 'after eventEnd: nothing current'],
  ];
  for (const [hhmm, cur, nxt, note] of cases) {
    await scenario(`now-next-${hhmm}`, async (errors) => {
      const page = await open(browser, 'en', 360, `/event?day=2&now=${ist(hhmm)}&mock=`, errors);
      const stops = await readStops(page);
      const markers = await page.$$eval('.route-node .ambari', (a) => a.length);
      await page.browserContext().close();
      const c = stops.filter((s) => s.now).map((s) => s.id?.slice(5));
      const n = stops.filter((s) => s.next).map((s) => s.id?.slice(5));
      expect(c.join() === cur, `current ${c.join() || '—'}, expected ${cur || '—'}`);
      expect(n.join() === (nxt ?? ''), `next ${n.join() || '—'}, expected ${nxt ?? '—'}`);
      expect(stops.filter((s) => s.current === 'step').length === (cur ? 1 : 0), 'aria-current on the current stop only');
      expect(markers === (cur ? 1 : 0), `${markers} Ambari markers on nodes`);
      return note;
    });
  }

  // ---------- Headline artists ----------
  // Tanmay's source photo is 200 px square: at 1x the browser may enlarge it at most this much (it is drawn at the arch's height).
  const MAX_UPSCALE_1X = 1.35;
  const names = (lang: Lang) => artists.map((a) => a.name[lang]).join(' · ');
  for (const lang of ['kn', 'en'] as const) {
    for (const width of [320, 360, 768, 1280]) {
      await scenario(`artist-section-${lang}-${width}`, async (errors) => {
        const page = await open(browser, lang, width, `/event?${noon}&mock=`, errors);
        await page.$eval('[data-testid=artist-section]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('[data-testid=artist-photo]')].every((i) => i.complete && i.naturalWidth > 0));
        const r = await page.evaluate(async () => {
          const section = document.querySelector('[data-testid=artist-section]')!;
          const items = [...section.querySelectorAll<HTMLElement>('[data-testid^=artist-]')].filter((e) => e.tagName === 'LI');
          // With a `w` srcset, naturalWidth is scaled by `sizes`; load the served file on its own for its real pixel size.
          // (inline, not a named helper: tsx would inject a __name() call that does not exist in the page)
          const files = await Promise.all(
            items.map(async (li) => {
              const probe = new Image();
              probe.src = li.querySelector<HTMLImageElement>('[data-testid=artist-photo]')!.currentSrc;
              await probe.decode();
              return [probe.naturalWidth, probe.naturalHeight];
            }),
          );
          return {
            items: items.map((li, k) => {
              const img = li.querySelector<HTMLImageElement>('[data-testid=artist-photo]')!;
              const cs = getComputedStyle(img);
              const box = img.getBoundingClientRect();
              const frame = li.querySelector('.darbar-arch')!.getBoundingClientRect();
              return {
                id: li.dataset.testid!.slice(7),
                alt: img.alt,
                w: img.getAttribute('width'),
                h: img.getAttribute('height'),
                natural: files[k]!,
                src: img.currentSrc,
                srcset: img.srcset,
                pos: cs.objectPosition,
                fit: cs.objectFit,
                filter: cs.filter,
                radius: cs.borderRadius,
                box: [box.width, box.height],
                frame: [Math.round(frame.left), Math.round(frame.top), Math.round(frame.width), Math.round(frame.height)],
                name: li.querySelector('[data-testid=artist-name]')?.textContent,
                pillars: li.querySelectorAll('.darbar-pillar').length,
              };
            }),
            captions: [...section.querySelectorAll('[data-testid=artist-caption]')].map((c) => c.textContent),
            heading: document.querySelector('#artist-title')?.textContent,
            inGuests: !!document.querySelector('#guests-title')?.closest('section')?.contains(section),
            sectionH2: section.querySelectorAll('h2').length,
            hScroll: document.documentElement.scrollWidth > window.innerWidth,
            sectionRight: section.getBoundingClientRect().right,
          };
        });
        if (width === 360) {
          // element shot (the stacked section is taller than the viewport); the sticky navbar is hidden so it cannot cover a frame
          await page.addStyleTag({ content: 'header{visibility:hidden!important}' });
          await (await page.$('[data-testid=artist-section]'))!.screenshot({ path: resolve(OUT, `artist-${lang}-360.png`) });
        }
        await page.browserContext().close();
        // order, names, alt, photo handling
        expect(r.items.map((i) => i.id).join() === artists.map((a) => a.id).join(), `artists in order ${r.items.map((i) => i.id).join()} (Remo first, then Tanmay)`);
        const headline = day2.find((s) => s.headline)!;
        for (const [k, a] of artists.entries()) {
          const it = r.items[k]!;
          const asset = artistAssets[a.id as keyof typeof artistAssets];
          const event = a.caption?.[lang] ?? headline.title[lang];
          expect(it.name === a.name[lang], `${a.id}: name "${it.name}"`);
          expect(it.alt === `${a.name[lang]} — ${event}`, `${a.id}: alt is "${it.alt}"`);
          expect(!/wearing|smil|jacket|glasses|shirt|woman|man\b|person|beard|hair/i.test(it.alt), `${a.id}: alt describes the person`);
          expect(it.w === String(asset.width) && it.h === String(asset.height), `${a.id}: explicit width/height ${it.w}×${it.h}`);
          expect(it.natural[0]! <= asset.width && asset.variants.every((v) => v.w <= asset.width), `${a.id}: upscaled copy (${it.natural[0]} px, source ${asset.width})`);
          expect(it.src.endsWith('.webp') && it.srcset.includes('.webp'), `${a.id}: not WebP (${it.src})`);
          expect(it.pos === a.focus && it.fit === 'cover', `${a.id}: object-position ${it.pos}, fit ${it.fit}`);
          expect(it.filter === 'none' && it.radius === '0px', `${a.id}: filter ${it.filter}, radius ${it.radius} (photo must be shown as supplied)`);
          expect(it.pillars === 2, `${a.id}: Darbar frame needs two gold pillars`);
          // square photo with object-fit: cover → drawn at max(box w/h ÷ natural) of its source pixels
          const scale = Math.max(it.box[0]! / asset.width, it.box[1]! / asset.height);
          expect(scale <= MAX_UPSCALE_1X, `${a.id}: enlarged ${scale.toFixed(2)}× at 1x (limit ${MAX_UPSCALE_1X})`);
        }
        // same size; stacked on phones, side by side from 640 px
        const [f1, f2] = r.items.map((i) => i.frame);
        expect(f1![2] === f2![2] && f1![3] === f2![3], `frames differ: ${f1!.slice(2)} vs ${f2!.slice(2)}`);
        if (width >= 640) expect(f1![1] === f2![1] && f2![0] > f1![0] + f1![2], `not side by side at ${width}px: ${f1} / ${f2}`);
        else expect(f2![1] > f1![1] + f1![3] && f1![0] === f2![0], `not stacked at ${width}px: ${f1} / ${f2}`);
        expect(!r.hScroll && r.sectionRight <= width, `horizontal scroll at ${width}px`);
        // one shared caption read from the 14:30 stop
        const want = `${headline.title[lang]} · ${formatDate(site.day2Date, lang, { short: true })} · ${formatTime(headline.start, lang)}`;
        expect(r.captions.length === 1 && r.captions[0] === want, `captions ${JSON.stringify(r.captions)} ≠ "${want}"`);
        expect(lang === 'en' ? r.captions[0] === 'Music Concert & DJ · 21 Nov · 2:30 PM' : r.captions[0]!.includes('೨೧') && r.captions[0]!.includes('೨:೩೦'), `caption wording "${r.captions[0]}"`);
        expect(r.heading === (lang === 'kn' ? 'ಪ್ರಮುಖ ಕಲಾವಿದರು' : 'Headline artists') && r.sectionH2 === 1 && !r.inGuests, `heading "${r.heading}"`);
        const scales = r.items.map((i, k) => `${i.id} ${Math.max(i.box[0]! / artistAssets[artists[k]!.id as keyof typeof artistAssets].width, i.box[1]! / artistAssets[artists[k]!.id as keyof typeof artistAssets].height).toFixed(2)}×`);
        return `${width >= 640 ? 'side by side' : 'stacked'}, frames ${f1![2]}×${f1![3]}; caption "${r.captions[0]}"; 1x scale ${scales.join(', ')}`;
      });
    }
  }

  await scenario('artist-on-banner-and-stop-en', async (errors) => {
    const page = await open(browser, 'en', 360, `/event?${noon}&mock=`, errors);
    const r = await page.evaluate(() => ({
      banner: document.querySelector('[data-testid=attraction-concert]')?.textContent ?? '',
      artistLine: [...document.querySelectorAll('[data-testid=attraction-artist]')].map((e) => e.textContent),
      stopArtist: document.querySelector('[data-testid=stop-1430] [data-testid=stop-artist]')?.textContent ?? '',
      stop: document.querySelector('[data-testid=stop-1430]')?.textContent ?? '',
      clubs: document.querySelector('[data-testid=attraction-clubs]')?.textContent ?? '',
      titles: [...document.querySelectorAll('[data-testid^=attraction-]:not([data-testid=attraction-artist]) h3')].map((h) => h.textContent),
    }));
    await page.browserContext().close();
    expect(names('en') === 'Remo & Team · Tanmay Gururaj', `names "${names('en')}"`);
    expect(r.artistLine.length === 1 && r.artistLine[0] === 'Remo & Team · Tanmay Gururaj', `banner artist line ${JSON.stringify(r.artistLine)} (one banner only)`);
    expect(r.banner.includes('Music Concert & DJ') && r.banner.includes('2:30 PM'), `concert banner: ${r.banner}`);
    expect(r.stopArtist === 'Remo & Team · Tanmay Gururaj' && r.stop.includes('Headline act'), `14:30 stop: ${r.stop}`);
    for (const c of ['Rangasthala', 'Rushaang', 'Tandava']) expect(r.clubs.includes(c), `clubs banner lacks ${c}`);
    expect(['drama', 'music', 'dance'].every((k) => r.clubs.toLowerCase().includes(k)), 'club kinds shown');
    expect(r.titles.join('|') === 'Dasara Procession|Rally|Fashion Show|Music Concert & DJ|Club performances', `banner titles ${r.titles.join('|')}`);
    return '"Remo & Team · Tanmay Gururaj" on the 14:30 stop and the Music Concert & DJ banner; 5 banners incl. Rangasthala / Rushaang / Tandava';
  });

  await scenario('artist-on-banner-and-stop-kn', async (errors) => {
    const page = await open(browser, 'kn', 360, `/event?${noon}&mock=`, errors);
    const r = await page.evaluate(() => ({
      banner: document.querySelector('[data-testid=attraction-artist]')?.textContent ?? '',
      stop: document.querySelector('[data-testid=stop-1430] [data-testid=stop-artist]')?.textContent ?? '',
    }));
    await page.browserContext().close();
    expect(r.banner === names('kn') && r.stop === names('kn'), `kn names: banner "${r.banner}", stop "${r.stop}"`);
    expect(names('kn') === 'ರೆಮೊ ಮತ್ತು ತಂಡ · ತನ್ಮಯ್ ಗುರುರಾಜ್', `kn names "${names('kn')}"`);
    return `"${names('kn')}" on the 14:30 stop and the banner`;
  });

  // ---------- Tabs, ?day= and Day 1 ----------
  await scenario('tabs-default-and-url', async (errors) => {
    const pressed = (p: Page) => p.$eval('[aria-pressed=true]', (b) => b.getAttribute('data-testid'));
    const a = await open(browser, 'en', 360, `/event?now=${ist('10:00', site.day1Date)}&mock=`, errors);
    expect((await pressed(a)) === 'tab-day1', 'on 20 Nov the default is Day 1');
    const b = await open(browser, 'en', 360, `/event?now=${ist('10:00', '2026-11-12')}&mock=`, errors);
    expect((await pressed(b)) === 'tab-day2', 'any other day defaults to Day 2');
    const c = await open(browser, 'en', 360, `/event?day=1&${noon}&mock=`, errors);
    expect((await pressed(c)) === 'tab-day1', '?day=1 wins over the clock');
    await c.click('[data-testid=tab-day2]');
    await c.waitForFunction(() => new URL(location.href).searchParams.get('day') === '2');
    await c.reload({ waitUntil: 'networkidle0' });
    expect((await pressed(c)) === 'tab-day2', 'Day 2 survives reload');
    const labels = await c.$$eval('[data-testid^=tab-day]', (t) => t.map((x) => (x as HTMLElement).innerText.replace(/\s+/g, ' ')));
    expect(labels[0] === 'Day 1 · 20 November Competitions' && labels[1] === 'Day 2 · 21 November Rajyotsava', `labels ${labels.join(' | ')}`);
    const bad = await open(browser, 'kn', 360, `/event?day=9&${noon}&mock=`, errors);
    expect((await pressed(bad)) === 'tab-day2', 'unknown ?day= falls back');
    const knLabels = await bad.$$eval('[data-testid^=tab-day]', (t) => t.map((x) => (x as HTMLElement).innerText.replace(/\s+/g, ' ')));
    expect(knLabels[0] === 'ದಿನ ೧ · ೨೦ ನವೆಂಬರ್ ಸ್ಪರ್ಧೆಗಳು' && knLabels[1] === 'ದಿನ ೨ · ೨೧ ನವೆಂಬರ್ ರಾಜ್ಯೋತ್ಸವ', `kn labels ${knLabels.join(' | ')}`);
    for (const p of [a, b, c, bad]) await p.browserContext().close();
    return 'Day 1 on 20 Nov, Day 2 otherwise, ?day= wins and syncs (replace), unknown value ignored; kn/en tab labels';
  });

  await scenario('day1-stops-link-to-competitions', async (errors) => {
    const page = await open(browser, 'en', 360, `/event?day=1&${noon}&mock=`, errors);
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=timeline-day1] .skeleton').length === 0, { timeout: 15000 });
    const r = await page.evaluate(() => ({
      stops: document.querySelectorAll('[data-testid=timeline-day1] > ol > li').length,
      tbaLabel: document.querySelector('[data-testid=tba-group]')?.textContent,
      details: [...document.querySelectorAll('[data-testid^=details-]')].map((a) => a.getAttribute('href')),
      register: [...document.querySelectorAll('[data-testid=timeline-day1] a[href^="/register"]')].map((a) => a.getAttribute('href')),
      times: document.querySelectorAll('[data-testid=timeline-day1] time').length,
      ranges: [...document.querySelectorAll('[data-testid=timeline-day1] time')].map((x) => x.textContent),
    }));
    expect(r.stops === events.length, `${r.stops} Day 1 stops`);
    expect(r.tbaLabel === undefined, `no "Time to be announced" group once every time is set (got "${r.tbaLabel}")`);
    expect(r.times === events.length, `${r.times} time ranges shown`);
    expect(r.ranges.every((x) => x === '12:30 PM – 4:30 PM'), `ranges ${[...new Set(r.ranges)].join(', ')}`);
    expect(r.details.every((h, i) => h === `/competitions?for=${events[i]!.category}#${events[i]!.id}`), 'every stop links to its competition card');
    expect(r.register.length === events.length && r.register.every((h, i) => h === `/register?event=${events[i]!.id}`), 'every stop has its Register link');
    await page.click('[data-testid=register-s-quiz]');
    await page.waitForSelector('[data-testid=event-summary]');
    expect(new URL(page.url()).searchParams.get('event') === 's-quiz', 'Register opens the form preselected');
    await page.browserContext().close();
    return `${r.stops} competitions, each 12:30 PM – 4:30 PM with Details + Register`;
  });

  // Day 1 competitions all run 12:30–16:30 IST side by side: all "next" before, all "now" during (one Ambari), all past after.
  const day1Cases: [string, string, string][] = [
    ['12:29', 'next', 'before 12:30 every competition is up next'],
    ['12:30', 'current', 'at 12:30 every competition is on'],
    ['16:29', 'current', 'still on one minute before the end'],
    ['16:30', 'past', 'over at 16:30'],
  ];
  for (const [hhmm, want, note] of day1Cases) {
    await scenario(`day1-now-next-${hhmm}`, async (errors) => {
      const out: string[] = [];
      for (const lang of ['kn', 'en'] as const) {
        const page = await open(browser, lang, 360, `/event?now=${ist(hhmm, site.day1Date)}&mock=`, errors);
        await page.waitForSelector('[data-testid=timeline-day1]'); // Day 1 is the default tab on 20 Nov
        const r = await page.evaluate(() => ({
          states: [...document.querySelectorAll('[data-testid=timeline-day1] > ol > li')].map((li) => li.getAttribute('data-state')),
          now: document.querySelectorAll('[data-testid=timeline-day1] [data-testid=pill-now]').length,
          next: document.querySelectorAll('[data-testid=timeline-day1] [data-testid=pill-next]').length,
          markers: document.querySelectorAll('[data-testid=timeline-day1] .route-node .ambari').length,
          time: document.querySelector('[data-testid=timeline-day1] time')?.textContent ?? '',
        }));
        await page.browserContext().close();
        expect(r.states.length === events.length && r.states.every((s) => s === want), `${lang}: states ${[...new Set(r.states)].join(',')}`);
        expect(r.now === (want === 'current' ? events.length : 0) && r.next === (want === 'next' ? events.length : 0), `${lang}: ${r.now} now / ${r.next} next pills`);
        expect(r.markers === (want === 'current' ? 1 : 0), `${lang}: ${r.markers} Ambari markers (one for the parallel stops)`);
        const range = lang === 'kn' ? 'ಮಧ್ಯಾಹ್ನ ೧೨:೩೦ – ಸಂಜೆ ೪:೩೦' : '12:30 PM – 4:30 PM';
        expect(r.time === range, `${lang}: time "${r.time}"`);
        out.push(lang);
      }
      return `${note} (${out.join(', ')})`;
    });
  }

  // ---------- Map, reduced motion, banned terms ----------
  await scenario('map-lazy-and-directions', async (errors) => {
    const page = await open(browser, 'en', 360, `/event?${noon}&mock=`, errors);
    const before = await page.$$('[data-testid=map-iframe]');
    expect(before.length === 0, 'iframe not created before the map is near the viewport');
    await page.$eval('[data-testid=map-frame]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForSelector('[data-testid=map-iframe]', { timeout: 5000 });
    const r = await page.evaluate(() => ({
      src: document.querySelector('[data-testid=map-iframe]')!.getAttribute('src'),
      title: document.querySelector('[data-testid=map-iframe]')!.getAttribute('title'),
      href: document.querySelector('[data-testid=directions]')!.getAttribute('href'),
      rel: document.querySelector('[data-testid=directions]')!.getAttribute('rel'),
    }));
    await page.browserContext().close();
    const q = encodeURIComponent(site.mapQuery);
    expect(r.src === `https://www.google.com/maps?q=${q}&output=embed` && !!r.title, `iframe ${r.src}`);
    expect(r.href === `https://www.google.com/maps/dir/?api=1&destination=${q}` && r.rel === 'noopener noreferrer', `directions ${r.href}`);
    return 'iframe appears on scroll with a title; directions link opens safely';
  }, /maps|google|net::|Failed to load resource|ERR_/i);

  await scenario('reduced-motion-and-kn-shot', async (errors) => {
    const page = await open(browser, 'kn', 360, `/event?day=2&now=${ist('10:30')}&mock=`, errors, true);
    await revealAll(page);
    const r = await page.evaluate(() => ({
      hidden: [...document.querySelectorAll('main *')].filter((e) => getComputedStyle(e).opacity === '0' && !e.closest('.sr-only')).length,
      walking: document.querySelectorAll('.ambari.is-walking').length,
    }));
    await page.browserContext().close();
    expect(r.hidden === 0, `${r.hidden} elements left at opacity 0 under reduced motion`);
    expect(r.walking === 0, 'Ambari does not walk under reduced motion');
    return 'everything visible, Ambari standing still';
  });

  for (const lang of ['kn', 'en'] as const) {
    await scenario(`no-banned-terms-rendered-${lang}`, async (errors) => {
      const texts: string[] = [];
      for (const day of [1, 2]) {
        const page = await open(browser, lang, 360, `/event?day=${day}&${noon}&mock=`, errors);
        await page.$eval('[data-testid=map-frame]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        texts.push(
          await page.evaluate(() => {
            const attrs = [...document.querySelectorAll('[alt],[aria-label],[title]')].map((e) => ['alt', 'aria-label', 'title'].map((a) => e.getAttribute(a) ?? '').join(' '));
            return [document.title, document.documentElement.outerHTML.length ? document.body.innerText : '', ...attrs, document.querySelector('meta[name=description]')?.getAttribute('content') ?? ''].join('\n');
          }),
        );
        await page.browserContext().close();
      }
      const all = texts.join('\n');
      const hit = BANNED.find((re) => re.test(all));
      expect(!hit, `banned term rendered: ${hit}`);
      return 'no Motor Heads / Movie Promotion / DAP in text, alt, aria or title (both days)';
    }, /maps|google|net::|Failed to load resource|ERR_/i);
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
