/**
 * Runs the real apps-script/Code.gs inside a Node VM with fake Google services.
 * Used by the Vite mock endpoint (/mock-api) and by `npm run test:server`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { FakeCache, FakeLock, FakeMail, FakeProperties, FakeSpreadsheet, type FakeSheet } from './fake-sheets.ts';
import { buildGasConfigSource } from '../scripts/gas-config.ts';

export interface GasResponse {
  ok: boolean;
  [k: string]: unknown;
}

export interface GasRuntime {
  ss: FakeSpreadsheet;
  lock: FakeLock;
  cache: FakeCache;
  mail: FakeMail;
  /** Script Properties (ID high-water marks, notice send log). */
  props: FakeProperties;
  /** Functions defined in Code.gs / Config.gs (doGet, doPost, setupSheet, validate_, safeCell_, CONFIG …). */
  ctx: Record<string, unknown>;
  get(params: Record<string, string>): GasResponse;
  post(body: unknown): GasResponse;
  postRaw(raw: string): GasResponse;
  /** The Events tab. */
  events(): FakeSheet;
  /** The tab an event's registrations go to, found through the Events tab's sheet_name cell (like Code.gs does). */
  tab(eventId: string): FakeSheet;
  /** Current value of an Events-tab cell. */
  eventField(id: string, header: string): string;
  setEventField(id: string, header: string, value: string): string;
  countRegs(eventId: string): number;
}

/**
 * Utilities.formatDate(date, timeZone, pattern) for the patterns Code.gs uses (yyyy MM dd HH mm ss). Like Apps Script it
 * formats in the given time zone, independent of the machine's zone.
 */
export function formatDate(date: Date, timeZone: string, pattern: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (t) => ({ yyyy: parts.year, MM: parts.month, dd: parts.day, HH: parts.hour, mm: parts.minute, ss: parts.second })[t] ?? t);
}

export function createGasRuntime(root = process.cwd()): GasRuntime {
  const code = readFileSync(resolve(root, 'apps-script/Code.gs'), 'utf8');
  const config = buildGasConfigSource(root);

  const ss = new FakeSpreadsheet();
  const lock = new FakeLock();
  const cache = new FakeCache();
  const mail = new FakeMail();
  const props = new FakeProperties();

  const ctx: Record<string, unknown> = {
    console: { log: () => undefined, warn: () => undefined, error: () => undefined },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => undefined },
    LockService: { getScriptLock: () => lock },
    CacheService: { getScriptCache: () => cache },
    PropertiesService: { getScriptProperties: () => props },
    Utilities: { formatDate },
    MailApp: mail,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s: string) => {
        const out = { content: s, mime: 'text/plain', setMimeType: (m: string) => ((out.mime = m), out), getContent: () => s };
        return out;
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(`${config}\n${code}`, ctx, { filename: 'Code.gs' });

  const call = (fn: string, arg: unknown): GasResponse => {
    const out = (ctx[fn] as (a: unknown) => { getContent(): string; mime: string })(arg);
    if (out.mime !== 'application/json') throw new Error('Response MIME type must be JSON');
    return JSON.parse(out.getContent());
  };

  const sheet = (n: string) => {
    const s = ss.getSheetByName(n);
    if (!s) throw new Error(`no sheet ${n}`);
    return s;
  };

  const rt: GasRuntime = {
    ss,
    lock,
    cache,
    mail,
    props,
    ctx,
    get: (parameter) => call('doGet', { parameter }),
    post: (body) => call('doPost', { postData: { contents: JSON.stringify(body) } }),
    postRaw: (raw) => call('doPost', { postData: { contents: raw } }),
    events: () => sheet('Events'),
    tab: (eventId) => sheet(rt.eventField(eventId, 'sheet_name')),
    eventField(id, header) {
      const s = sheet('Events');
      const headers = s.getRange(1, 1, 1, s.getLastColumn()).getDisplayValues()[0] ?? [];
      const col = headers.indexOf(header) + 1;
      if (col < 1) throw new Error(`no column ${header} in the Events tab`);
      for (let r = 2; r <= s.getLastRow(); r++) if (String(s.get(r, 1)) === id) return String(s.get(r, col));
      throw new Error(`event ${id} not in Events tab`);
    },
    setEventField(id, header, value) {
      const s = sheet('Events');
      const headers = s.getRange(1, 1, 1, s.getLastColumn()).getDisplayValues()[0] ?? [];
      const col = headers.indexOf(header) + 1;
      if (col < 1) throw new Error(`no column ${header} in the Events tab`);
      for (let r = 2; r <= s.getLastRow(); r++) {
        if (String(s.get(r, 1)) === id) {
          const prev = String(s.get(r, col));
          s.setFormat(r, col, '@');
          s.write(r, col, value);
          cache.clear(); // status cache must not hide the change
          return prev;
        }
      }
      throw new Error(`event ${id} not in Events tab`);
    },
    countRegs(eventId) {
      const s = rt.tab(eventId);
      let n = 0;
      for (let r = 2; r <= s.getLastRow(); r++) if (String(s.get(r, 2)) !== '') n++; // column 2 = reg_id
      return n;
    },
  };
  return rt;
}

/** A runtime after setupSheet(): the Events tab plus one tab per event, every event open — what the dev mock starts from. */
export function createOpenRuntime(root = process.cwd()): GasRuntime {
  const rt = createGasRuntime(root);
  (rt.ctx.setupSheet as () => void)();
  return rt;
}
