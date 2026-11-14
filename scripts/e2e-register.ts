/**
 * End-to-end test of the registration flow against the dev server's mock endpoint (real Code.gs).
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e            (E2E_BASE, E2E_OUT, CHROME_PATH env vars optional)
 * Drives the real form in headless Chrome at 360×800, one fresh browser profile per scenario.
 * Writes screenshots, the downloaded pass PNG and .ics, and results.json to E2E_OUT.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import sharp from 'sharp';
import scheduleData from '../src/data/schedule.json' with { type: 'json' };
import siteData from '../src/data/site.json' with { type: 'json' };


const day2 = scheduleData.filter((x) => x.day === 2);
const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

interface Result {
  name: string;
  ok: boolean;
  detail: string;
  consoleErrors: string[];
  ms: number;
}
const results: Result[] = [];

interface Person {
  eventId: string;
  name: string;
  id: string;
  dept: string;
  sem?: string;
  phone: string;
  email: string;
  team?: { teamName: string; members: { name: string; id: string; phone: string }[] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser: Browser, lang: 'kn' | 'en', errors: string[]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((l) => localStorage.setItem('kr26.lang', l), lang);
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return page;
}

async function step(page: Page) {
  return page.$eval('[data-testid=register-form]', (f) => f.getAttribute('data-step'));
}
async function waitStep(page: Page, s: string) {
  await page.waitForFunction((x) => document.querySelector('[data-testid=register-form]')?.getAttribute('data-step') === x, { timeout: 10000 }, s);
  // A step change focuses its heading, which smooth-scrolls the page (html { scroll-behavior: smooth });
  // a click computed mid-scroll lands on whatever moved under it. Wait until the page holds still.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((done) => {
        const y = scrollY;
        setTimeout(() => done(scrollY === y), 150);
      }),
    { timeout: 5000, polling: 50 },
  );
}
async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}
async function typeInto(page: Page, sel: string, text: string) {
  await page.click(sel, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.type(sel, text);
}

/** Fills every step and stops on Review (consent ticked) without submitting. */
async function fillToReview(page: Page, p: Person, mock = '', waitMinTime = true) {
  const t0 = Date.now();
  await page.goto(`${BASE}/register?event=${p.eventId}${mock ? `&mock=${mock}` : '&mock='}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid=event-summary]');
  await page.waitForFunction(() => !document.querySelector('[data-testid=event-summary] .skeleton'), { timeout: 15000 });
  const formReady = Date.now(); // ≈ when the form mounted (the server's min-time clock starts there)
  const overflow: boolean[] = [await noHorizontalScroll(page)];
  await page.click('[data-testid=next]');
  await waitStep(page, 'details');
  await typeInto(page, '#f-name', p.name);
  await typeInto(page, '#f-id', p.id);
  await page.select('#f-department', p.dept);
  if (p.sem) await page.select('#f-semester', p.sem);
  await typeInto(page, '#f-phone', p.phone);
  await typeInto(page, '#f-email', p.email);
  overflow.push(await noHorizontalScroll(page));
  await page.click('[data-testid=next]');
  if (p.team) {
    await waitStep(page, 'team');
    await typeInto(page, '#f-teamName', p.team.teamName);
    for (const [i, m] of p.team.members.entries()) {
      if (!(await page.$(`#f-members-${i}-name`))) await page.click('[data-testid=add-member]');
      await typeInto(page, `#f-members-${i}-name`, m.name);
      await typeInto(page, `#f-members-${i}-id`, m.id);
      await typeInto(page, `#f-members-${i}-phone`, m.phone);
    }
    overflow.push(await noHorizontalScroll(page));
    await page.click('[data-testid=next]');
  }
  await waitStep(page, 'review');
  await page.click('#f-consentRules');
  overflow.push(await noHorizontalScroll(page));
  if (waitMinTime) {
    const elapsed = Date.now() - formReady;
    if (elapsed < 3500) await sleep(3500 - elapsed); // a human takes > 3 s; the server rejects faster
  }
  return { overflowFree: overflow.every(Boolean), fillMs: Date.now() - t0 };
}

/** Clicks submit and waits for the pass page or an error alert. */
async function submit(page: Page, timeout = 15000) {
  await page.click('[data-testid=submit]');
  await page.waitForFunction(
    () => location.pathname === '/register/success' || document.querySelector('[data-testid=submit-error]'),
    { timeout },
  );
  if (new URL(page.url()).pathname === '/register/success') {
    await page.waitForSelector('[data-testid=pass-reg-id]');
    return { kind: 'success' as const, regId: await page.$eval('[data-testid=pass-reg-id]', (e) => e.textContent?.trim() ?? '') };
  }
  return page.$eval('[data-testid=submit-error]', (e) => ({
    kind: 'error' as const,
    code: e.getAttribute('data-code') ?? '',
    text: e.textContent?.trim() ?? '',
    regId: e.querySelector('[data-testid=existing-reg-id]')?.textContent?.trim() ?? '',
  }));
}

/** Intercepts <a download> clicks and returns the downloaded file's bytes. */
async function captureDownload(page: Page, buttonSel: string) {
  await page.evaluate(() => {
    const w = window as unknown as { __dl: { name: string; href: string }[] };
    w.__dl = [];
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.download) w.__dl.push({ name: this.download, href: this.href });
    };
  });
  await page.click(buttonSel);
  await page.waitForFunction(() => (window as unknown as { __dl: unknown[] }).__dl.length > 0, { timeout: 30000 });
  const file = await page.evaluate(async () => {
    const d = (window as unknown as { __dl: { name: string; href: string }[] }).__dl[0]!;
    const buf = new Uint8Array(await (await fetch(d.href)).arrayBuffer());
    let bin = '';
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    return { name: d.name, b64: btoa(bin) };
  });
  return { name: file.name, bytes: Buffer.from(file.b64, 'base64') };
}

/**
 * Stats of one region of a PNG. `sharp(png).extract(r).stats()` ignores the extract and reports the
 * whole image, so materialise the crop first.
 */
async function cropStats(png: Buffer, region: { left: number; top: number; width: number; height: number }) {
  return sharp(await sharp(png).extract(region).png().toBuffer()).stats();
}

/**
 * The brand logos on the pass must reach the exported PNG (html-to-image embeds each <img> src):
 * each logo's area in the 2× PNG must hold image detail, not flat card background.
 */
async function logosInPng(page: Page, png: Buffer) {
  // The PNG is made from the fixed-size off-screen export copy of the card, so measure that one.
  const boxes = await page.$$eval('[data-testid=pass-logos-export] img', (imgs) => {
    const card = document.querySelector('[data-testid=pass-card-export]')!.getBoundingClientRect();
    return imgs.map((el) => {
      const img = el as HTMLImageElement;
      const b = img.getBoundingClientRect();
      const plate = img.parentElement!.classList.contains('logo-plate') ? img.parentElement!.getBoundingClientRect() : null;
      return {
        file: img.src.split('/').pop()!,
        loaded: img.complete && img.naturalWidth > 0,
        srcset: img.srcset,
        x: b.left - card.left,
        y: b.top - card.top,
        w: b.width,
        h: b.height,
        // A point in the plate's top padding, between its gold border and the logo.
        plateProbe: plate ? { x: b.left - card.left + b.width / 2, y: (plate.top + b.top) / 2 - card.top + 0.5 } : null,
      };
    });
  });
  expect(boxes.length === 2, `pass shows ${boxes.length} logos, expected 2`);
  const out: string[] = [];
  for (const b of boxes) {
    expect(b.loaded && !b.srcset, `${b.file}: loaded ${b.loaded}, srcset "${b.srcset}" (the export ignores srcset)`);
    const crop = { left: Math.round(b.x * 2), top: Math.round(b.y * 2), width: Math.round(b.w * 2), height: Math.round(b.h * 2) };
    const { channels } = await cropStats(png, crop);
    const detail = Math.max(...channels.slice(0, 3).map((c) => c.stdev));
    expect(detail > 25, `${b.file} looks blank in the PNG (colour stdev ${detail.toFixed(1)})`);
    let plateNote = '';
    if (b.file.startsWith('college-logo')) {
      // The college logo sits on an ivory plate (the pass card is dark) — it must reach the PNG too.
      expect(b.plateProbe, 'college logo is not on its plate on the pass');
      const px = { left: Math.round(b.plateProbe!.x * 2), top: Math.round(b.plateProbe!.y * 2), width: 2, height: 2 };
      const [r, g, bl] = (await cropStats(png, px)).channels.map((c) => Math.round(c.mean));
      expect(r! > 235 && g! > 225 && bl! > 195, `college logo plate not ivory in the PNG (rgb ${r},${g},${bl})`);
      plateNote = `, ivory plate rgb(${r},${g},${bl})`;
    }
    out.push(`${b.file.split('.')[0]} in PNG (stdev ${detail.toFixed(0)}${plateNote})`);
  }
  return out.join(', ');
}

async function scenario(browser: Browser, name: string, lang: 'kn' | 'en', fn: (page: Page) => Promise<string>, allowErrors?: RegExp) {
  const errors: string[] = [];
  const page = await newPage(browser, lang, errors);
  const t0 = Date.now();
  let ok = true;
  let detail: string;
  try {
    detail = await fn(page);
  } catch (e) {
    ok = false;
    detail = `FAILED: ${(e as Error).message}`;
  }
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true }).catch(() => undefined);
  const unexpected = errors.filter((e) => !(allowErrors && allowErrors.test(e)));
  if (unexpected.length) ok = false;
  results.push({ name, ok, detail, consoleErrors: unexpected, ms: Date.now() - t0 });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (${Math.round((Date.now() - t0) / 100) / 10}s)\n      ${detail}${unexpected.length ? `\n      console: ${unexpected.join(' | ')}` : ''}`);
  await page.browserContext().close();
}

function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const ananya: Person = { eventId: 's-essay', name: 'ಅನನ್ಯಾ ರಾವ್', id: '1by23cs101', dept: 'CSE', sem: '3', phone: '+91 98450 12345', email: 'Ananya@Example.com' };
const poem = (n: number): Person => ({ eventId: 's-poem', name: 'Rahul Shetty', id: `1BY22IS${String(200 + n)}`, dept: 'ISE', sem: '5', phone: `98450${String(20000 + n)}`, email: `rahul${n}@example.com` });

async function main() {
  await fetch(`${BASE}/mock-api/__reset`, { method: 'POST' }).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

  await scenario(browser, '01-success-individual-kn', 'kn', async (page) => {
    const fill = await fillToReview(page, ananya);
    const r = await submit(page);
    expect(r.kind === 'success', `expected success, got ${JSON.stringify(r)}`);
    expect(r.regId === 'KR26-ESY-0001', `regId ${r.regId}`);
    const passText = await page.$eval('[data-testid=pass-card]', (e) => e.textContent ?? '');
    expect(passText.includes('ದಿನ ೧ · ೨೦ ನವೆಂಬರ್'), 'pass shows Day 1 in Kannada numerals');
    expect(passText.includes('ಪ್ರಬಂಧ ಬರಹ'), 'pass shows Kannada event name');
    expect(passText.includes('ಮಧ್ಯಾಹ್ನ ೧೨:೩೦ – ಸಂಜೆ ೪:೩೦'), 'pass shows the Day 1 time range in Kannada');
    expect(passText.includes('ಬಿಎಸ್‌ಎನ್ ಕೊಠಡಿ 422'), 'pass shows the Essay venue in Kannada');
    expect(!passText.includes('TBA'), 'no TBA once time and venue are set');
    expect(passText.includes('೨೧ ನವೆಂಬರ್'), 'pass invites to Day 2 (21 Nov)');
    await page.screenshot({ path: resolve(OUT, '01-pass-screen.png') });

    const png = await captureDownload(page, '[data-testid=download-png]');
    writeFileSync(resolve(OUT, png.name), png.bytes);
    expect(png.bytes.subarray(1, 4).toString() === 'PNG', 'file is a PNG');
    const w = png.bytes.readUInt32BE(16);
    const h = png.bytes.readUInt32BE(20);
    const cardW = await page.$eval('[data-testid=pass-card-export]', (e) => e.getBoundingClientRect().width);
    expect(cardW === 380 && w === 760, `PNG width ${w} should be 2× the fixed 380px export card (${cardW})`);

    const ics = await captureDownload(page, '[data-testid=download-ics]');
    writeFileSync(resolve(OUT, ics.name), ics.bytes);
    const text = ics.bytes.toString('utf8');
    const lines = text.split('\r\n');
    expect(!/[^\r]\n/.test(text), 'all line breaks are CRLF');
    expect(lines.every((l) => Buffer.byteLength(l, 'utf8') <= 75), 'every line ≤ 75 octets (folded)');
    expect(text.includes('DTSTART:20261120T070000Z\r\nDTEND:20261120T110000Z'),'Day 1 runs 12:30–16:30 IST (07:00–11:00 UTC), not all-day');
    expect(!text.includes('VALUE=DATE'), 'no all-day entry');
    // Day 2: one VEVENT per schedule stop, same start time and kn name as the Event Details timeline.
    const utcOf = (hhmm: string) => new Date(`${siteData.day2Date}T${hhmm}:00+05:30`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const unfolded = text.replace(/\r\n /g, '');
    day2.forEach((stop, i) => {
      const end = day2[i + 1] ? utcOf(day2[i + 1]!.start) : utcOf(siteData.eventEnd.slice(11, 16));
      expect(unfolded.includes(`DTSTART:${utcOf(stop.start)}\r\nDTEND:${end}`), `Day 2 ${stop.start} stop starts ${utcOf(stop.start)} and ends ${end}`);
      expect(unfolded.includes(`SUMMARY:${stop.title.kn.replace(/,/g, '\\,')}\r\n`), `Day 2 ${stop.start} stop is named "${stop.title.kn}"`);
    });
    expect((text.match(/BEGIN:VEVENT/g) ?? []).length === 1 + day2.length, `${1 + day2.length} VEVENTs (Day 1 + ${day2.length} Day 2 stops)`);
    expect(!/DAP|Motor Head|Movie Promotion|Break/.test(unfolded) && !/(?:^|[^A-Za-z])DAP(?:[^A-Za-z]|$)/.test(unfolded), 'no banned programme names in the .ics');

    await page.reload({ waitUntil: 'networkidle0' });
    const afterReload = await page.$eval('[data-testid=pass-reg-id]', (e) => e.textContent?.trim());
    expect(afterReload === 'KR26-ESY-0001', 'pass survives a page refresh (sessionStorage)');
    return `regId ${r.regId}; filled in ${fill.fillMs} ms; no horizontal scroll: ${fill.overflowFree}; PNG ${w}×${h} (2× ${cardW}px card); .ics ${lines.length - 1} lines, CRLF, folded, Day 1 12:30–16:30 + one timed entry per Day 2 stop; pass persists after refresh`;
  });

  await scenario(browser, '02-success-team-exact-en', 'en', async (page) => {
    // Rangoli: exactly 5 people (min = max) → 4 member rows from the start, no add/remove buttons.
    const team = {
      teamName: 'Kannada Kalpa',
      members: [
        { name: 'Ravi K', id: '1by23ai051', phone: '9845044444' },
        { name: 'Asha M', id: '1BY23AI052', phone: '9845044445' },
        { name: 'Bharath N', id: '1BY23AI053', phone: '9845044446' },
        { name: 'Chaitra P', id: '1BY23AI054', phone: '9845044447' },
      ],
    };
    await page.goto(`${BASE}/register?event=s-rangoli&mock=`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => !document.querySelector('[data-testid=event-summary] .skeleton'), { timeout: 15000 });
    await page.click('[data-testid=next]');
    await waitStep(page, 'details');
    await typeInto(page, '#f-name', 'Meera S');
    await typeInto(page, '#f-id', '1BY23AI050');
    await page.select('#f-department', 'AIML');
    await page.select('#f-semester', '3');
    await typeInto(page, '#f-phone', '9845033333');
    await typeInto(page, '#f-email', 'meera@example.com');
    await page.click('[data-testid=next]');
    await waitStep(page, 'team');
    const step = await page.evaluate(() => ({
      rows: document.querySelectorAll('[data-testid^=member-]').length,
      add: !!document.querySelector('[data-testid=add-member]'),
      remove: document.querySelectorAll('[data-testid^=member-] button').length,
      intro: document.querySelector('[data-testid=team-intro]')?.textContent ?? '',
      count: document.querySelector('[data-testid=team-count]')?.textContent ?? '',
    }));
    expect(step.rows === 4, `${step.rows} member rows (want 4)`);
    expect(!step.add && step.remove === 0, `add button ${step.add}, remove buttons ${step.remove}`);
    expect(step.intro.includes('exactly 5 members including you'), `intro: ${step.intro}`);
    expect(step.count === 'Team members: 5 of 5', `count: ${step.count}`);
    const overflowFree = await noHorizontalScroll(page);
    await typeInto(page, '#f-teamName', team.teamName);
    for (const [i, m] of team.members.entries()) {
      await typeInto(page, `#f-members-${i}-name`, m.name);
      await typeInto(page, `#f-members-${i}-id`, m.id);
      await typeInto(page, `#f-members-${i}-phone`, m.phone);
    }
    await page.click('[data-testid=next]');
    await waitStep(page, 'review');
    // General instructions sit right above the rules-agreement checkbox and open in place.
    const general = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid=general-rules-toggle]');
      const box = document.querySelector('#f-consentRules');
      return { found: !!btn, before: !!btn && !!box && !!(btn.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    expect(general.found && general.before, `General instructions beside the rules checkbox: ${JSON.stringify(general)}`);
    await page.click('[data-testid=general-rules-toggle]');
    await page.waitForSelector('[data-testid=general-rules] li');
    const generalItems = await page.$$eval('[data-testid=general-rules] li', (li) => li.length);
    expect(generalItems === 6, `${generalItems} general instructions`);
    await page.click('#f-consentRules');
    await sleep(500);
    const fill = { overflowFree: overflowFree && (await noHorizontalScroll(page)) };
    const review = await page.$eval('[data-testid=register-form]', (e) => e.textContent ?? '');
    expect(review.includes('1BY23AI051'), 'review shows normalised member USN');
    const r = await submit(page);
    expect(r.kind === 'success' && r.regId === 'KR26-RGL-0001', JSON.stringify(r));
    const passText = await page.$eval('[data-testid=pass-card]', (e) => e.textContent ?? '');
    expect(passText.includes('Meera S, Ravi K, Asha M, Bharath N, Chaitra P') && passText.includes('Day 1 · 20 November'), 'pass lists team, Latin numerals in EN');
    return `regId ${r.regId}; Rangoli exactly 5 → 4 member rows, no add/remove, "${step.intro.slice(0, 50)}…", "${step.count}"; no horizontal scroll: ${fill.overflowFree}`;
  });

  await scenario(browser, '03-duplicate-real-kn', 'kn', async (page) => {
    await fillToReview(page, { ...ananya, name: 'Someone Else', phone: '9845099999', email: 'x@example.com' });
    const r = await submit(page);
    expect(r.kind === 'error' && r.code === 'DUPLICATE' && r.regId === 'KR26-ESY-0001', JSON.stringify(r));
    return `same USN as scenario 01 (typed lower-case) → DUPLICATE showing existing ID ${r.regId}; message: "${r.text.slice(0, 80)}…"`;
  });

  const forced: [string, string, (r: Awaited<ReturnType<typeof submit>>) => boolean, string][] = [
    ['duplicate', 'en', (r) => r.kind === 'error' && r.code === 'DUPLICATE' && /^KR26-POM-\d{4}$/.test(r.regId), 'DUPLICATE with real regId'],
    ['closed', 'kn', (r) => r.kind === 'error' && r.code === 'CLOSED' && r.text.includes('ತೆರೆದಿಲ್ಲ'), 'CLOSED (not open), Kannada message'],
    ['deadline', 'en', (r) => r.kind === 'error' && r.code === 'CLOSED' && r.text.includes('deadline'), 'CLOSED (deadline) message'],
    ['server', 'en', (r) => r.kind === 'error' && r.code === 'SERVER', 'SERVER with Retry'],
    ['full', 'kn', (r) => r.kind === 'error' && r.code === 'FULL' && r.text.includes('ಭರ್ತಿಯಾಗಿವೆ'), 'FULL, friendly Kannada message'],
    ['full', 'en', (r) => r.kind === 'error' && r.code === 'FULL' && r.text.includes('all places have been taken'), 'FULL, friendly message'],
  ];
  for (const [i, [mock, lang, check, label]] of forced.entries()) {
    // A SERVER answer logs its machine-readable reason to the console (and shows visitors nothing extra).
    const serverLog = /\[registration\] register: server error, reason=UNEXPECTED/;
    await scenario(
      browser,
      `04-forced-${mock}-${lang}`,
      lang as 'kn' | 'en',
      async (page) => {
        const logged: string[] = [];
        page.on('console', (m) => m.type() === 'error' && serverLog.test(m.text()) && logged.push(m.text()));
        await fillToReview(page, poem(i), mock);
        const r = await submit(page);
        expect(check(r), `expected ${label}, got ${JSON.stringify(r)}`);
        if (mock === 'server') {
          expect(logged.length === 1, `expected one console line with the SERVER reason, got ${logged.length}`);
          expect(!/UNEXPECTED|reason/i.test('text' in r ? r.text : ''), 'the reason must not be shown to the visitor');
        }
        const hasRetry = !!(await page.$('[data-testid=retry]'));
        return `?mock=${mock} → ${label}${'regId' in r && r.regId ? ` (${r.regId})` : ''}; retry button: ${hasRetry}; text: "${('text' in r ? r.text : '').slice(0, 90)}"${logged[0] ? `; console: ${logged[0]}` : ''}`;
      },
      mock === 'server' ? serverLog : undefined,
    );
  }

  await scenario(browser, '05-forced-validation-en', 'en', async (page) => {
    await fillToReview(page, poem(10), 'validation');
    const r = await submit(page);
    expect(r.kind === 'error' && r.code === 'VALIDATION', JSON.stringify(r));
    await waitStep(page, 'details');
    const msg = await page.$eval('#f-phone-error', (e) => e.textContent);
    const invalid = await page.$eval('#f-phone', (e) => e.getAttribute('aria-invalid'));
    const describedBy = await page.$eval('#f-phone', (e) => e.getAttribute('aria-describedby'));
    expect(invalid === 'true' && describedBy === 'f-phone-error', 'phone marked invalid + described by its error');
    return `server rejected phone → form jumped back to step "${await step(page)}", phone field: aria-invalid=${invalid}, "${msg}"`;
  });

  await scenario(
    browser,
    '06-forced-network-kn',
    'kn',
    async (page) => {
      await fillToReview(page, poem(11), 'network');
      const r = await submit(page, 30000);
      expect(r.kind === 'error' && r.code === 'NETWORK', JSON.stringify(r));
      // Turn the mock off and press Retry: the saved form submits successfully.
      await page.evaluate(() => sessionStorage.removeItem('kr26.mock'));
      await page.click('[data-testid=retry]');
      await page.waitForSelector('[data-testid=pass-reg-id]', { timeout: 15000 });
      const regId = await page.$eval('[data-testid=pass-reg-id]', (e) => e.textContent?.trim());
      return `connection dropped on submit → NETWORK message (after the one automatic retry), form data kept; Retry with network back → success ${regId}`;
    },
    /ERR_EMPTY_RESPONSE|Failed to load resource/,
  );

  await scenario(
    browser,
    '06b-status-endpoint-down-kn',
    'kn',
    async (page) => {
      await page.goto(`${BASE}/register?event=s-essay&mock=statusdown`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => !document.querySelector('[data-testid=event-summary] .skeleton'), { timeout: 15000 });
      const text = await page.$eval('main', (e) => e.textContent ?? '');
      const note = text.includes('ಲೈವ್ ತೆರೆದ/ಮುಚ್ಚಿದ ಸ್ಥಿತಿ');
      const nextDisabled = await page.$eval('[data-testid=next]', (b) => (b as HTMLButtonElement).disabled);
      // Registration is open from the start, so without live data the fallback (events.json + clock) must allow it.
      const beforeDeadline = Date.now() < Date.parse('2026-11-18T23:59:00+05:30');
      expect(note, '"live open/closed status unavailable" note');
      expect(nextDisabled === !beforeDeadline, `fallback: Next disabled=${nextDisabled}, before deadline=${beforeDeadline}`);
      return `status GET failed → fallback to events.json + clock: "live open/closed status unavailable" shown; ${beforeDeadline ? 'before the deadline so registration stays open (Next enabled)' : 'deadline passed so Next is disabled'}`;
    },
    /ERR_EMPTY_RESPONSE|Failed to load resource/,
  );

  await scenario(
    browser,
    '07-forced-slow-timeout-en',
    'en',
    async (page) => {
      await fillToReview(page, poem(12), 'slow');
      const t0 = Date.now();
      const r = await submit(page, 100000);
      const waited = Math.round((Date.now() - t0) / 1000);
      expect(r.kind === 'error' && r.code === 'NETWORK', JSON.stringify(r));
      await sleep(6000); // let the mock finish the requests the browser gave up on
      await page.evaluate(() => sessionStorage.removeItem('kr26.mock'));
      await page.click('[data-testid=retry]');
      const r2 = await page.waitForFunction(
        () => location.pathname === '/register/success' || document.querySelector('[data-testid=existing-reg-id]'),
        { timeout: 15000 },
      ).then(() => page.evaluate(() => document.querySelector('[data-testid=existing-reg-id]')?.textContent ?? 'success'));
      expect(/^KR26-POM-\d{4}$/.test(r2), `retry after timeout should be DUPLICATE (request had landed), got ${r2}`);
      return `40 s server delay → client timed out at 35 s, retried once, showed NETWORK after ${waited}s; the first request had actually landed, so manual Retry → DUPLICATE ${r2} (no double registration)`;
    },
    /ERR|Failed to load resource|aborted/i,
  );

  await scenario(browser, '08-client-validation-kn', 'kn', async (page) => {
    await page.goto(`${BASE}/register?event=s-essay&mock=`, { waitUntil: 'networkidle0' });
    await page.click('[data-testid=next]');
    await waitStep(page, 'details');
    await page.click('[data-testid=next]');
    await page.waitForSelector('.field-error');
    const msgs = await page.$$eval('.field-error', (els) => els.map((e) => e.textContent));
    expect((await step(page)) === 'details', 'stays on details');
    const focused = await page.evaluate(() => document.activeElement?.id);
    await typeInto(page, '#f-id', 'X'.repeat(21));
    await typeInto(page, '#f-phone', '12345');
    await page.click('[data-testid=next]');
    await sleep(300);
    const usnMsg = await page.$eval('#f-id-error', (e) => e.textContent);
    expect(usnMsg?.includes('೨೦'), `21-char USN → length message, got "${usnMsg}"`);
    // Any format is accepted: another college's USN clears the error.
    await typeInto(page, '#f-id', '1TD24CS001');
    await page.click('[data-testid=next]');
    await sleep(300);
    expect(!(await page.$('#f-id-error')), '1TD24CS001 accepted by the client');
    return `${msgs.length} inline Kannada errors (${msgs.slice(0, 3).join(' / ')}…); focus moved to #${focused}; 21-char USN → "${usnMsg}"; 1TD24CS001 → no error`;
  });

  await scenario(browser, '09-too-fast-honeypot-en', 'en', async (page) => {
    const fill = await fillToReview(page, poem(13), '', false);
    const r = await submit(page);
    if (fill.fillMs >= 3000) return `SKIPPED min-time check: automation needed ${fill.fillMs} ms (> 3 s) — covered by test:server`;
    expect(r.kind === 'error' && r.code === 'VALIDATION', `expected VALIDATION/form, got ${JSON.stringify(r)}`);
    expect(!(await page.$('#f-phone-error')), 'no field blamed');
    // Honeypot: fill the hidden field, wait past 3 s, submit.
    await page.$eval('#f-website', (e) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(e, 'http://spam.example');
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(3200);
    const r2 = await submit(page);
    expect(r2.kind === 'error' && r2.code === 'VALIDATION', `honeypot: ${JSON.stringify(r2)}`);
    return `submitted ${fill.fillMs} ms after opening → generic "${'text' in r ? r.text.slice(0, 50) : ''}…"; honeypot filled → rejected the same way`;
  });

  await scenario(browser, '10-draft-survives-reload-en', 'en', async (page) => {
    await page.goto(`${BASE}/register?event=s-rangoli&mock=`, { waitUntil: 'networkidle0' });
    await page.click('[data-testid=next]');
    await waitStep(page, 'details');
    await typeInto(page, '#f-name', 'Kavya N');
    await typeInto(page, '#f-email', 'kavya@example.com');
    await page.select('#f-department', 'MBA');
    const semOptions = await page.$$eval('#f-semester option', (o) => o.map((x) => x.textContent).filter((x) => !x?.startsWith('—')));
    await page.reload({ waitUntil: 'networkidle0' });
    await waitStep(page, 'details');
    const name = await page.$eval('#f-name', (e) => (e as HTMLInputElement).value);
    const email = await page.$eval('#f-email', (e) => (e as HTMLInputElement).value);
    expect(name === 'Kavya N' && email === 'kavya@example.com', `after reload: ${name} / ${email}`);
    expect(semOptions.join(',') === '1,3', `MBA semesters ${semOptions.join(',')}`);
    await page.select('#f-department', 'CSE');
    const cse = await page.$$eval('#f-semester option', (o) => o.map((x) => x.textContent).filter((x) => !x?.startsWith('—')));
    expect(cse.join(',') === '1,3,5,7', `CSE semesters ${cse.join(',')}`);
    return `step + values restored after reload; semester options MBA = ${semOptions.join(', ')}, CSE = ${cse.join(', ')}`;
  });

  await scenario(browser, '11-lookup-kn', 'kn', async (page) => {
    await page.goto(`${BASE}/register/success`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid=lookup-form]');
    await page.type('#lk-id', '1BY23CS101');
    await page.type('#lk-phone', '9845000000');
    await page.click('[data-testid=lookup-form] button[type=submit]');
    await page.waitForSelector('[data-testid=lookup-error]');
    const wrong = await page.$eval('[data-testid=lookup-error]', (e) => e.textContent);
    await typeInto(page, '#lk-phone', '98450 12345');
    await page.click('[data-testid=lookup-form] button[type=submit]');
    await page.waitForSelector('[data-testid=pass-reg-id]');
    const regId = await page.$eval('[data-testid=pass-reg-id]', (e) => e.textContent?.trim());
    expect(regId === 'KR26-ESY-0001', `lookup regId ${regId}`);
    return `no pass on device → lookup form; wrong phone → "${wrong}"; ID + full phone → pass ${regId}`;
  });

  await scenario(browser, '11b-lookup-withdrawn-en', 'en', async (page) => {
    // A coordinator marks the Essay registration from scenario 01 as WITHDRAWN in its status column.
    const w = (await (await fetch(`${BASE}/mock-api/__status?event=s-essay&regId=KR26-ESY-0001&value=WITHDRAWN`)).json()) as { ok: boolean };
    expect(w.ok, 'row marked withdrawn');
    try {
      await page.goto(`${BASE}/register/success?lookup=1`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=lookup-form]');
      await page.type('#lk-id', '1BY23CS101');
      await page.type('#lk-phone', '9845012345');
      await page.click('[data-testid=lookup-form] button[type=submit]');
      await page.waitForSelector('[data-testid=lookup-error]');
      const m = await page.$eval('[data-testid=lookup-error]', (e) => ({ text: e.textContent ?? '', code: e.getAttribute('data-code') }));
      expect(m.code === 'WITHDRAWN' && m.text.includes('KR26-ESY-0001') && /withdrawn/i.test(m.text), `message "${m.text}"`);
      expect(!(await page.$('[data-testid=pass-reg-id]')), 'no pass shown');
      return `lookup of a withdrawn registration → "${m.text}"`;
    } finally {
      await fetch(`${BASE}/mock-api/__status?event=s-essay&regId=KR26-ESY-0001&value=`);
    }
  });

  await scenario(browser, '12-pass-png-kannada', 'kn', async (page) => {
    // Kannada-heavy pass: Kannada names with conjuncts, Kannada event name, team.
    await fillToReview(page, {
      eventId: 's-group-singing', name: 'ಶ್ರೀನಿವಾಸ್ ಕೃಷ್ಣಮೂರ್ತಿ', id: '1BY21EC077', dept: 'ECE', sem: '7', phone: '9845055555', email: 'sri@example.com',
      // Group Singing: 6–12 people incl. the registrant → 5 members.
      team: { teamName: 'ಸ್ವರ ಸಂಗಮ', members: [
        { name: 'ಅಕ್ಷತಾ ಭಟ್', id: '1BY21EC078', phone: '9845055556' },
        { name: 'ದ್ವಾರಕೀಶ್', id: '1BY21EC079', phone: '9845055557' },
        { name: 'ಲಕ್ಷ್ಮೀ ನಾರಾಯಣ', id: '1BY21EC080', phone: '9845055558' },
        { name: 'ಪ್ರಜ್ವಲ್ ಕೆ.', id: '1BY21EC081', phone: '9845055559' },
        { name: 'ಸೌಮ್ಯಾ ರಾವ್', id: '1BY21EC082', phone: '9845055560' },
      ] },
    });
    const r = await submit(page);
    expect(r.kind === 'success', JSON.stringify(r));
    await page.evaluate(() => document.fonts.ready);
    const png = await captureDownload(page, '[data-testid=download-png]');
    writeFileSync(resolve(OUT, `kannada-${png.name}`), png.bytes);
    await page.screenshot({ path: resolve(OUT, '12-pass-on-screen.png') });
    const logos = await logosInPng(page, png.bytes);
    return `team pass ${r.regId}; PNG saved as kannada-${png.name} (${png.bytes.readUInt32BE(16)}×${png.bytes.readUInt32BE(20)}) for visual check; ${logos}`;
  });

  await scenario(browser, '13-any-usn-1TD24CS001-en', 'en', async (page) => {
    const p: Person = { eventId: 's-debate', name: 'Kiran T', id: '1td24cs001', dept: 'CSE', sem: '3', phone: '9845066666', email: 'kiran@example.com' };
    await fillToReview(page, p);
    const r = await submit(page);
    expect(r.kind === 'success', `1TD24CS001 should register, got ${JSON.stringify(r)}`);
    const passText = await page.$eval('[data-testid=pass-card]', (e) => e.textContent ?? '');
    await fillToReview(page, { ...p, id: '1TD24 CS001', name: 'Someone Else', phone: '9845066667', email: 'other@example.com' });
    const dup = await submit(page);
    expect(dup.kind === 'error' && dup.code === 'DUPLICATE' && dup.regId === r.regId, `expected DUPLICATE ${r.regId}, got ${JSON.stringify(dup)}`);
    return `non-BMSIT USN 1td24cs001 → ${r.regId}${passText.includes('Kiran T') ? ' (pass shown)' : ''}; "1TD24 CS001" again → DUPLICATE ${dup.regId}`;
  });

  await scenario(browser, '14-any-usn-abc-123-team-kn', 'kn', async (page) => {
    const p: Person = {
      eventId: 's-treasure-hunt', name: 'Nandini B', id: 'abc-123', dept: 'ISE', sem: '5', phone: '9845077770', email: 'nandini@example.com',
      // Treasure Hunt: exactly 4 people → 3 members.
      team: { teamName: 'Hudukata', members: [
        { name: 'Pavan M', id: 'zz 9/1', phone: '9845077771' },
        { name: 'Rekha L', id: '1TD24EC010', phone: '9845077772' },
        { name: 'Sagar D', id: '1TD24EC011', phone: '9845077775' },
      ] },
    };
    await fillToReview(page, p);
    const review = await page.$eval('[data-testid=register-form]', (e) => e.textContent ?? '');
    expect(review.includes('ABC-123') && review.includes('ZZ9/1'), 'review shows normalised odd IDs');
    const r = await submit(page);
    expect(r.kind === 'success', `abc-123 team should register, got ${JSON.stringify(r)}`);
    // A different team whose member is "ABC - 123" (the earlier registrant) is caught.
    await fillToReview(page, {
      ...p, id: 'new-one', phone: '9845077773', email: 'x2@example.com', team: { teamName: 'Matte', members: [
        { name: 'Usha K', id: 'qq1', phone: '9845077774' },
        { name: 'Nandini B', id: 'ABC - 123', phone: '9845077770' },
        { name: 'Vinay R', id: 'qq2', phone: '9845077776' },
      ] },
    });
    const dup = await submit(page);
    expect(dup.kind === 'error' && dup.code === 'DUPLICATE' && dup.regId === r.regId, `expected DUPLICATE ${r.regId}, got ${JSON.stringify(dup)}`);
    return `registrant "abc-123" + members "zz 9/1", "1TD24EC010" → ${r.regId}; new team with member "ABC - 123" → DUPLICATE ${dup.regId}`;
  });

  await scenario(browser, '15-eligibility-elocution-kn', 'kn', async (page) => {
    const p: Person = { eventId: 's-elocution', name: 'Arjun Mehta', id: '1BY24ME501', dept: 'Mech', sem: '3', phone: '9845066660', email: 'arjun@example.com' };
    await fillToReview(page, p);
    const box = await page.$('#f-eligibilityConfirmed');
    expect(box, 'the eligibility checkbox is on the review step');
    const label = await page.$eval('label[for=f-eligibilityConfirmed]', (l) => l.textContent ?? '');
    expect(label.includes('ಕನ್ನಡ ನನ್ನ ಮಾತೃಭಾಷೆ ಅಲ್ಲ ಎಂದು ದೃಢೀಕರಿಸುತ್ತೇನೆ'), `label "${label}"`);
    // Without it the form does not submit and says why.
    await page.click('[data-testid=submit]');
    await page.waitForSelector('#f-eligibilityConfirmed-error');
    expect(new URL(page.url()).pathname === '/register', 'still on the form');
    await page.click('#f-eligibilityConfirmed');
    const r = await submit(page);
    expect(r.kind === 'success' && r.regId === 'KR26-ELO-0001', `expected KR26-ELO-0001, got ${JSON.stringify(r)}`);
    // Other events never show it.
    await fillToReview(page, { ...p, eventId: 's-poem', id: '1BY24ME502', phone: '9845066661' }, '', false);
    expect(!(await page.$('#f-eligibilityConfirmed')), 'no eligibility checkbox for the Poem');
    return `checkbox required (client error without it) → ${r.regId}; absent for other events`;
  });

  await browser.close();
  writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passed. Output: ${OUT}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
