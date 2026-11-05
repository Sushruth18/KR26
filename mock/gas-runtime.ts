/**
 * Runs the real apps-script/Code.gs inside a Node VM with fake Google services.
 * Used by the Vite mock endpoint (/mock-api) and by `npm run test:server`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { FakeCache, FakeLock, FakeMail, FakeSpreadsheet, type FakeSheet } from './fake-sheets.ts';
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
  /** Functions defined in Code.gs / Config.gs (doGet, doPost, setupSheet, validate_, safeCell_, CONFIG …). */
  ctx: Record<string, unknown>;
  get(params: Record<string, string>): GasResponse;
  post(body: unknown): GasResponse;
  postRaw(raw: string): GasResponse;
  events(): FakeSheet;
  regs(): FakeSheet;
  setEventField(id: string, header: string, value: string): string;
  countRegs(eventId: string): number;
}

export function createGasRuntime(root = process.cwd()): GasRuntime {
  const code = readFileSync(resolve(root, 'apps-script/Code.gs'), 'utf8');
  const config = buildGasConfigSource(root);

  const ss = new FakeSpreadsheet();
  const lock = new FakeLock();
  const cache = new FakeCache();
  const mail = new FakeMail();

  const ctx: Record<string, unknown> = {
    console: { log: () => undefined, warn: () => undefined, error: () => undefined },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => undefined },
    LockService: { getScriptLock: () => lock },
    CacheService: { getScriptCache: () => cache },
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
    ctx,
    get: (parameter) => call('doGet', { parameter }),
    post: (body) => call('doPost', { postData: { contents: JSON.stringify(body) } }),
    postRaw: (raw) => call('doPost', { postData: { contents: raw } }),
    events: () => sheet('Events'),
    regs: () => sheet('Registrations'),
    setEventField(id, header, value) {
      const s = sheet('Events');
      const headers = s.getRange(1, 1, 1, s.getLastColumn()).getDisplayValues()[0] ?? [];
      const col = headers.indexOf(header) + 1;
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
      const s = sheet('Registrations');
      let n = 0;
      for (let r = 2; r <= s.getLastRow(); r++) if (String(s.get(r, 3)) === eventId) n++;
      return n;
    },
  };
  return rt;
}

/** A runtime with tabs created and every event open — what the dev mock starts from. */
export function createOpenRuntime(root = process.cwd()): GasRuntime {
  const rt = createGasRuntime(root);
  (rt.ctx.setupSheet as () => void)();
  const ids = Object.keys((rt.ctx.CONFIG as { events: Record<string, unknown> }).events);
  for (const id of ids) rt.setEventField(id, 'is_open', 'TRUE');
  return rt;
}
