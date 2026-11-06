/**
 * Pass page layout test: the on-screen pass must fit every phone width, in both languages, and the downloaded
 * PNG must be a fixed-size render that does not depend on the screen.
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:pass       (E2E_BASE, E2E_OUT, CHROME_PATH optional)
 *
 * Why not just check scrollWidth: the page sets `overflow-x: clip` on <body>, which hides a too-wide card
 * (nothing scrolls, the right edge is simply cut off). So this test measures the card's own rectangle and every
 * piece of text inside it against the viewport.
 *
 * For each of 320/360/375/390/412/430/768 px × kn/en it registers through the real form (mock endpoint running the
 * real Code.gs) and checks the pass page three ways: straight after registering (router state), after a reload,
 * and after a fresh page load that has to use the copy kept in sessionStorage. It also repeats 360/390 px with
 * 130 % text (Android "large font" setting).
 *
 * WhatsApp: with no link in the Events tab there is no button; once a coordinator pastes one (done here through the mock's
 * /__set), the pass shows a "Join the WhatsApp group" button (new tab, noopener noreferrer) that fits every width, survives
 * a reload, appears after the ID + phone lookup too, and is NOT part of the exported PNG.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import sharp from 'sharp';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output', 'pass');
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 360, 375, 390, 412, 430, 768];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const failures: string[] = [];
let checks = 0;

async function typeInto(page: Page, sel: string, text: string) {
  await page.click(sel, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.type(sel, text);
}

/** Registers a quiz team (long Kannada-friendly names, a team line that wraps) and lands on the pass page. */
async function registerTeam(page: Page, lang: 'kn' | 'en', eventId = 's-quiz') {
  const n = ++counter;
  await page.goto(`${BASE}/register?event=${eventId}&mock=`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('[data-testid=event-summary] .skeleton'), { timeout: 15000 });
  const ready = Date.now();
  const click = async (sel: string) => {
    await page.click(sel);
    await sleep(350);
  };
  await click('[data-testid=next]');
  await typeInto(page, '#f-name', lang === 'kn' ? 'ಶ್ರೀನಿವಾಸ್ ಕೃಷ್ಣಮೂರ್ತಿ' : 'Venkatasubramanian Krishnamurthy');
  const id = `1BY25CS${String(100 + n)}`;
  const phone = `98450${String(30000 + n)}`;
  await typeInto(page, '#f-id', id);
  await page.select('#f-department', 'CSE');
  await page.select('#f-semester', '3');
  await typeInto(page, '#f-phone', phone);
  await typeInto(page, '#f-email', `pass${n}@example.com`);
  await click('[data-testid=next]');
  await typeInto(page, '#f-teamName', lang === 'kn' ? 'ಸ್ವರ ಸಂಗಮ ತಂಡ' : 'The Procession Players');
  if (!(await page.$('#f-members-0-name'))) await page.click('[data-testid=add-member]');
  await typeInto(page, '#f-members-0-name', lang === 'kn' ? 'ದ್ವಾರಕೀಶ್ ಭಟ್ಟಾಚಾರ್ಯ' : 'Aishwarya Lakshminarayanan');
  await typeInto(page, '#f-members-0-id', `1BY25CS${String(500 + n)}`);
  await typeInto(page, '#f-members-0-phone', `98450${String(40000 + n)}`);
  await click('[data-testid=next]');
  await page.click('#f-consentRules');
  const wait = 3600 - (Date.now() - ready);
  if (wait > 0) await sleep(wait);
  await page.click('[data-testid=submit]');
  await page.waitForSelector('[data-testid=pass-reg-id]', { timeout: 20000 });
  return { id, phone };
}

interface Layout {
  vw: number;
  docScroll: number;
  card: { left: number; right: number; width: number } | null;
  /** Elements/text outside the card or outside the viewport. */
  problems: string[];
  regId: { fits: boolean; font: number } | null;
}

/** Measures the on-screen pass block. Everything is compared with the card's own box and the viewport. */
async function measure(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const cardEl = document.querySelector<HTMLElement>('[data-testid=pass-card]');
    const problems: string[] = [];
    const describe = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    if (!cardEl) return { vw, docScroll: document.documentElement.scrollWidth, card: null, problems: ['no pass card'], regId: null };
    const cb = cardEl.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(cardEl).borderLeftWidth) || 0;

    // 1. the card itself is inside the viewport
    if (cb.left < -0.5) problems.push(`card starts ${cb.left.toFixed(1)}px left of the screen`);
    if (cb.right > vw + 0.5) problems.push(`card ends ${(cb.right - vw).toFixed(1)}px right of the screen`);

    // 2. every text run in the card sits inside the card's border box (clipped text = overflow:hidden on the card)
    const walker = document.createTreeWalker(cardEl, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const rect of Array.from(r.getClientRects())) {
        if (rect.width === 0) continue;
        if (rect.left < cb.left + border - 0.5 || rect.right > cb.right - border + 0.5) {
          problems.push(`text "${(n.textContent ?? '').trim().slice(0, 30)}" spans ${rect.left.toFixed(0)}–${rect.right.toFixed(0)}px, card ${cb.left.toFixed(0)}–${cb.right.toFixed(0)}px`);
          break;
        }
      }
    }
    // 3. every visible box in the card is inside it
    for (const el of Array.from(cardEl.querySelectorAll('*'))) {
      if (el.closest('[aria-hidden=true]')) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.left < cb.left - 0.5 || b.right > cb.right + 0.5) problems.push(`${describe(el)} box ${b.left.toFixed(0)}–${b.right.toFixed(0)} leaves the card`);
    }
    // 4. nothing in the page body (card, buttons, banners…) pokes out of the viewport — body clips it, scrollWidth won't tell
    const main = document.querySelector('main') ?? document.body;
    for (const el of Array.from(main.querySelectorAll('*'))) {
      if (el.closest('[aria-hidden=true],[inert]')) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.display === 'none') continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right > vw + 0.5 || b.left < -0.5) problems.push(`${describe(el)} box ${b.left.toFixed(0)}–${b.right.toFixed(0)} leaves the ${vw}px screen`);
    }
    const reg = document.querySelector<HTMLElement>('[data-testid=pass-reg-id]');
    let regId = null;
    if (reg) {
      const rb = reg.getBoundingClientRect();
      const lines = Math.round(rb.height / parseFloat(getComputedStyle(reg).lineHeight || '1'));
      regId = { fits: rb.right <= cb.right - border + 0.5 && rb.left >= cb.left + border - 0.5 && lines <= 1, font: parseFloat(getComputedStyle(reg).fontSize) };
    }
    return { vw, docScroll: document.documentElement.scrollWidth, card: { left: cb.left, right: cb.right, width: cb.width }, problems: [...new Set(problems)].slice(0, 6), regId };
  });
}

function verdict(label: string, l: Layout, width: number) {
  checks++;
  const issues = [...l.problems];
  if (l.docScroll > l.vw) issues.push(`document scrolls horizontally (${l.docScroll} > ${l.vw})`);
  if (l.card && l.card.width > 380.5) issues.push(`card is ${l.card.width.toFixed(0)}px wide, max is 380`);
  if (l.card && width < 420 && l.card.width < width - 2 * 16 - 1) issues.push(`card is only ${l.card.width.toFixed(0)}px on a ${width}px screen (should fill it minus the 16px gutters)`);
  if (l.regId && !l.regId.fits) issues.push(`registration ID does not fit on one line (font ${l.regId.font}px)`);
  const ok = issues.length === 0;
  if (!ok) failures.push(`${label}: ${issues.join('; ')}`);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  card ${l.card ? `${l.card.left.toFixed(0)}–${l.card.right.toFixed(0)}` : '-'} (${l.card?.width.toFixed(0)}px) reg-ID font ${l.regId?.font ?? '-'}px${ok ? '' : `\n        ${issues.join('\n        ')}`}`);
}

/** Exported PNG: fixed 380 CSS px design at 2× → 760 px wide, whatever the screen. */
async function checkPng(page: Page, label: string) {
  await page.evaluate(() => {
    const w = window as unknown as { __dl: { name: string; href: string }[] };
    w.__dl = [];
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.download) w.__dl.push({ name: this.download, href: this.href });
    };
  });
  await page.click('[data-testid=download-png]');
  await page.waitForFunction(() => (window as unknown as { __dl: unknown[] }).__dl.length > 0, { timeout: 30000 });
  const b64 = await page.evaluate(async () => {
    const d = (window as unknown as { __dl: { href: string }[] }).__dl[0]!;
    const buf = new Uint8Array(await (await fetch(d.href)).arrayBuffer());
    let bin = '';
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  });
  const png = Buffer.from(b64, 'base64');
  writeFileSync(resolve(OUT, `${label}.png`), png);
  const meta = await sharp(png).metadata();
  checks++;
  const issues: string[] = [];
  if (meta.width !== 760) issues.push(`PNG is ${meta.width}px wide, expected 760 (380 CSS px × 2)`);
  // The right-hand border column must hold the gold border colour, i.e. the card is not cut off.
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  };
  const midY = Math.floor(info.height / 2);
  const gold = (c: number[]) => c[0]! > 180 && c[1]! > 120 && c[2]! < 110;
  const left = [0, 1, 2, 3].some((dx) => gold(px(dx, midY)));
  const right = [0, 1, 2, 3].some((dx) => gold(px(info.width - 1 - dx, midY)));
  if (!left || !right) issues.push(`gold card border missing in the PNG (left ${left}, right ${right})`);
  // Narrow screens must not squeeze the export: all PNGs share one height per language.
  const ok = issues.length === 0;
  if (!ok) failures.push(`${label} PNG: ${issues.join('; ')}`);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  PNG ${meta.width}×${meta.height}${ok ? '' : `\n        ${issues.join('\n        ')}`}`);
  return meta;
}

async function main() {
  await fetch(`${BASE}/mock-api/__reset`, { method: 'POST' }).catch(() => {
    throw new Error(`Dev server not reachable at ${BASE} — run "npm run dev" first.`);
  });
  const browser: Browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const consoleErrors: string[] = [];
  const pngHeights: Record<string, Set<number>> = { kn: new Set(), en: new Set() };

  const runCase = async (lang: 'kn' | 'en', width: number, textScale: number) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width, height: 800, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
    await page.evaluateOnNewDocument((l) => {
      if (location.protocol.startsWith('http')) localStorage.setItem('kr26.lang', l); // not on about:blank
    }, lang);
    // tsx/esbuild wraps nested functions in __name(); functions serialised into the page need it defined.
    await page.evaluateOnNewDocument('window.__name = (f) => f;');
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${lang}@${width}: ${m.text()}`));
    page.on('pageerror', (e) => consoleErrors.push(`${lang}@${width}: ${String(e)}`));
    const scale = async () => {
      if (textScale !== 1) await page.addStyleTag({ content: `html{font-size:${textScale * 100}% !important}` });
    };
    const tag = `${lang}-${width}${textScale !== 1 ? `-text${textScale * 100}` : ''}`;
    try {
      await registerTeam(page, lang);
      await scale();
      await page.evaluate(() => document.fonts.ready);
      await sleep(250);
      verdict(`${tag} just registered`, await measure(page), width);
      await page.screenshot({ path: resolve(OUT, `${tag}-1-registered.png`) });
      if (textScale === 1) {
        checks++;
        const stray = await page.$('[data-testid=whatsapp-join]');
        if (stray) failures.push(`${tag}: WhatsApp button shown although the event has no link`);
        console.log(`${stray ? 'FAIL' : 'PASS'}  ${tag} no WhatsApp button while the event has no link`);
      }

      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=pass-reg-id]');
      await scale();
      await page.evaluate(() => document.fonts.ready);
      await sleep(250);
      verdict(`${tag} after reload`, await measure(page), width);

      // A goto to the URL we are already on is a reload that keeps the router state — leave the page first so this
      // really is a new visit that has to use the copy in sessionStorage.
      await page.goto('about:blank');
      await page.goto(`${BASE}/register/success`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=pass-reg-id]');
      await scale();
      await page.evaluate(() => document.fonts.ready);
      await sleep(250);
      verdict(`${tag} fresh load (sessionStorage)`, await measure(page), width);
      await page.screenshot({ path: resolve(OUT, `${tag}-3-stored.png`) });

      if (textScale === 1) {
        const meta = await checkPng(page, tag);
        pngHeights[lang].add(meta.height ?? 0);
      }
    } catch (e) {
      failures.push(`${tag}: ${(e as Error).message}`);
      console.log(`FAIL  ${tag}: ${(e as Error).message}`);
    }
    await ctx.close();
  };

  for (const lang of ['kn', 'en'] as const) for (const w of WIDTHS) await runCase(lang, w, 1);
  for (const lang of ['kn', 'en'] as const) for (const w of [360, 390]) await runCase(lang, w, 1.3);

  // ---- WhatsApp group button ----
  const LINK = 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv';
  await fetch(`${BASE}/mock-api/__set?id=s-quiz&header=whatsapp_url&value=${encodeURIComponent(LINK)}`);
  const LABEL = { kn: 'ವಾಟ್ಸಾಪ್ ಗುಂಪಿಗೆ ಸೇರಿ', en: 'Join the WhatsApp group' } as const;

  const whatsappState = async (page: Page) =>
    page.evaluate(() => {
      const a = document.querySelector<HTMLAnchorElement>('[data-testid=whatsapp-join]');
      if (!a) return null;
      const b = a.getBoundingClientRect();
      const exportCard = document.querySelector('[data-testid=pass-card-export]');
      return {
        href: a.getAttribute('href'),
        target: a.target,
        rel: a.rel,
        text: (a.textContent ?? '').trim(),
        w: b.width,
        h: b.height,
        inViewport: b.left >= 0 && b.right <= document.documentElement.clientWidth,
        linkInExport: /whatsapp/i.test(exportCard?.textContent ?? '') || !!exportCard?.querySelector('a'),
      };
    });

  const runWhatsapp = async (lang: 'kn' | 'en', width: number) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width, height: 800, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
    await page.evaluateOnNewDocument((l) => {
      if (location.protocol.startsWith('http')) localStorage.setItem('kr26.lang', l); // not on about:blank
    }, lang);
    await page.evaluateOnNewDocument('window.__name = (f) => f;');
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${lang}@${width} whatsapp: ${m.text()}`));
    page.on('pageerror', (e) => consoleErrors.push(`${lang}@${width} whatsapp: ${String(e)}`));
    const tag = `whatsapp-${lang}-${width}`;
    const check = (name: string, issues: string[]) => {
      checks++;
      if (issues.length) failures.push(`${tag} ${name}: ${issues.join('; ')}`);
      console.log(`${issues.length ? 'FAIL' : 'PASS'}  ${tag} ${name}${issues.length ? `\n        ${issues.join('\n        ')}` : ''}`);
    };
    const buttonIssues = async (): Promise<string[]> => {
      const s = await whatsappState(page);
      if (!s) return ['no "Join the WhatsApp group" button'];
      const i: string[] = [];
      if (s.href !== LINK) i.push(`href is ${s.href}`);
      if (s.target !== '_blank') i.push(`target is "${s.target}"`);
      if (!/noopener/.test(s.rel) || !/noreferrer/.test(s.rel)) i.push(`rel is "${s.rel}"`);
      if (s.text !== LABEL[lang]) i.push(`label "${s.text}" (expected "${LABEL[lang]}")`);
      if (s.h < 44) i.push(`only ${s.h.toFixed(0)}px tall`);
      if (!s.inViewport) i.push('button leaves the screen');
      if (s.linkInExport) i.push('the export card contains the WhatsApp link');
      return i;
    };
    try {
      const creds = await registerTeam(page, lang);
      await page.evaluate(() => document.fonts.ready);
      await sleep(250);
      check('button right after registering (new tab, noopener noreferrer, label, ≥44px)', await buttonIssues());
      const l1 = await measure(page);
      check('layout fits with the button', [...l1.problems, ...(l1.docScroll > l1.vw ? ['document scrolls horizontally'] : [])]);
      await page.screenshot({ path: resolve(OUT, `${tag}-1-registered.png`) });

      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=pass-reg-id]');
      check('button after a reload', await buttonIssues());
      await page.goto('about:blank');
      await page.goto(`${BASE}/register/success`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=pass-reg-id]');
      check('button after a fresh load (sessionStorage copy)', await buttonIssues());

      // the PNG has exactly the same size as one made without a link: nothing extra is drawn into it
      const meta = await checkPng(page, tag);
      check('PNG unchanged by the link (same size as without)', pngHeights[lang].has(meta.height ?? -1) ? [] : [`PNG height ${meta.height} not in ${[...pngHeights[lang]].join(',')}`]);

      // lookup flow: nothing on the device, find the pass again with USN + phone
      await page.evaluate(() => sessionStorage.clear());
      await page.goto('about:blank');
      await page.goto(`${BASE}/register/success`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid=lookup-form]');
      await typeInto(page, '#lk-id', creds.id);
      await typeInto(page, '#lk-phone', creds.phone);
      await page.click('[data-testid=lookup-form] button[type=submit]');
      await page.waitForSelector('[data-testid=pass-reg-id]', { timeout: 15000 });
      check('button after finding the pass with ID + phone', await buttonIssues());
      const l2 = await measure(page);
      check('layout fits after lookup', [...l2.problems, ...(l2.docScroll > l2.vw ? ['document scrolls horizontally'] : [])]);
    } catch (e) {
      failures.push(`${tag}: ${(e as Error).message}`);
      console.log(`FAIL  ${tag}: ${(e as Error).message}`);
    }
    await ctx.close();
  };
  for (const lang of ['kn', 'en'] as const) for (const w of [320, 390, 768]) await runWhatsapp(lang, w);

  // The export must not depend on the screen: every width gives the same PNG height for a language.
  for (const lang of ['kn', 'en'] as const) {
    checks++;
    const hs = [...pngHeights[lang]];
    const ok = hs.length === 1;
    if (!ok) failures.push(`${lang}: PNG height differs between screen widths (${hs.join(', ')})`);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${lang} PNG height identical at every screen width (${hs.join(', ')})`);
  }
  checks++;
  if (consoleErrors.length) failures.push(`console errors: ${[...new Set(consoleErrors)].slice(0, 3).join(' | ')}`);
  console.log(`${consoleErrors.length ? 'FAIL' : 'PASS'}  no console errors${consoleErrors.length ? `: ${consoleErrors[0]}` : ''}`);

  await browser.close();
  console.log(`\n${checks - failures.length}/${checks} checks passed. Screenshots and PNGs: ${OUT}`);
  if (failures.length) {
    console.log(failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
