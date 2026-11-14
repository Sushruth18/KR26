/**
 * The festival is "Kannada Rajyotsava" / "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ" everywhere on the website. Only the procession pass
 * (card + PNG), the .ics file and the confirmation email keep "Karnataka Rajyotsava".
 *   1. npm run dev            (in another terminal)
 *   2. npm run e2e:rename     (E2E_BASE, CHROME_PATH optional)
 * For every route × kn/en: visible text (outside the pass card), <title>, meta description, OG/Twitter tags, alt,
 * aria-label and title attributes must not contain the old name, and the navbar wordmark shows the new one.
 * The pass page is checked with a pass in sessionStorage: its card still says "Karnataka Rajyotsava".
 */
import puppeteer, { type Page } from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OLD = /Karnataka\s+Rajyotsava|ಕರ್ನಾಟಕ\s+ರಾಜ್ಯೋತ್ಸವ/i;
const NEW = { kn: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ', en: 'Kannada Rajyotsava' } as const;
const ROUTES = ['/', '/competitions', '/competitions?for=faculty', '/event', '/event?day=1', '/gallery', '/team', '/register', '/register?event=s-essay', '/no-such-page', '/register/success'];
const PASS = { regId: 'KR26-ESY-0001', eventId: 's-essay', name: 'Ananya Rao', members: [], teamName: '' };

const failures: string[] = [];
let checks = 0;
function expect(cond: unknown, msg: string) {
  checks++;
  if (!cond) failures.push(msg);
}

/** Every string a visitor (or a crawler / screen reader) can get from the page, minus the pass card itself. */
async function pageStrings(page: Page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-testid^="pass-card"]').forEach((n) => n.remove());
    const attrs = [...clone.querySelectorAll('[alt],[aria-label],[title]')].flatMap((el) =>
      ['alt', 'aria-label', 'title'].map((a) => el.getAttribute(a) ?? ''),
    );
    const metas = [...document.head.querySelectorAll('meta[name],meta[property]')].map((m) => m.getAttribute('content') ?? '');
    // innerText of a detached clone is its textContent: also catches text that is only hidden (e.g. closed menus).
    return { text: document.body.innerText, hidden: clone.textContent ?? '', attrs, metas, title: document.title };
  });
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  for (const lang of ['kn', 'en'] as const) {
    for (const route of ROUTES) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 360, height: 800 });
      await page.evaluateOnNewDocument(
        `localStorage.setItem('kr26.lang', ${JSON.stringify(lang)}); sessionStorage.setItem('seenIntro', '1');` +
          `sessionStorage.setItem('kr26.lastPass', ${JSON.stringify(JSON.stringify(PASS))});`,
      );
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      const s = await pageStrings(page);
      const where = `${lang} ${route}`;
      expect(!OLD.test(s.title), `${where}: <title> has the old name: ${s.title}`);
      expect(!OLD.test(s.hidden), `${where}: page text (outside the pass) has the old name`);
      for (const a of s.attrs) expect(!OLD.test(a), `${where}: attribute has the old name: ${a}`);
      for (const m of s.metas) expect(!OLD.test(m), `${where}: meta tag has the old name: ${m}`);
      const wordmark = await page.$eval('header', (h) => h.textContent ?? '');
      expect(wordmark.includes(NEW[lang]), `${where}: navbar wordmark is not "${NEW[lang]}"`);
      if (route === '/') expect(s.title.includes(NEW[lang]), `${where}: <title> lacks the new name`);
      if (route === '/register/success') {
        const card = await page.$eval('[data-testid=pass-card]', (c) => c.textContent ?? '');
        expect(/Karnataka Rajyotsava|ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ/.test(card), `${where}: the pass card must keep "Karnataka Rajyotsava"`);
        expect(!card.includes(NEW[lang]), `${where}: the pass card must not use the new name`);
      }
      await ctx.close();
    }
  }
  // Static files crawlers read without JavaScript.
  const page = await browser.newPage();
  for (const file of ['/manifest.webmanifest', '/index.html']) {
    const res = await page.goto(`${BASE}${file}`);
    const body = (await res?.text()) ?? '';
    expect(!OLD.test(body), `${file} has the old name`);
    expect(body.includes('Kannada Rajyotsava'), `${file} lacks the new name`);
  }
  await browser.close();
  console.log(`${checks - failures.length}/${checks} checks passed`);
  if (failures.length) {
    console.log(failures.map((f) => `  FAIL ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
