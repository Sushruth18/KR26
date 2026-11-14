/**
 * Dev-only mock of the Apps Script endpoint at /mock-api, backed by the REAL apps-script/Code.gs.
 * Forced outcomes (?mock=<state> on the request, set by the dev panel or the page's ?mock= flag) are
 * produced by changing the fake Sheet so Code.gs itself returns the error — not by canned replies.
 *
 *   duplicate  register the same body first, then again → real DUPLICATE with the real regId
 *   closed     is_open := FALSE                           → real CLOSED / NOT_OPEN (a coordinator closed it)
 *   deadline   deadline_iso := 2020                       → real CLOSED / DEADLINE
 *   full       max_teams := 0 (no places)                 → real FULL
 *   validation phone := 5555555555 (fails the phone rule) → real VALIDATION field "phone"
 *   server     the event's own tab throws                 → real SERVER
 *   network    submit: socket destroyed, no response      → fetch() rejects in the browser
 *   slow       submit: 40 s delay (client times out at 35 s)
 *   statusdown status GET: socket destroyed               → UI falls back to events.json + clock
 * POST /mock-api/__reset wipes all mock data; /mock-api/__set?id=&header=&value= edits an Events cell;
 * /mock-api/__status?event=&regId=&value=WITHDRAWN types into a registration row's status column.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createOpenRuntime, type GasRuntime } from './gas-runtime.ts';

const LATENCY_MS = 450;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, obj: unknown) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

/** Runs fn with a temporary change to one Events-tab cell, then restores it. */
function withEventField<T>(rt: GasRuntime, id: string, header: string, value: string, fn: () => T): T {
  let prev: string;
  try {
    prev = rt.setEventField(id, header, value);
  } catch {
    return fn(); // unknown event id — let Code.gs reject it normally
  }
  try {
    return fn();
  } finally {
    rt.setEventField(id, header, prev);
  }
}

export function handlePost(rt: GasRuntime, raw: string, mock: string | null) {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return rt.postRaw(raw);
  }
  const eventId = String(body.eventId ?? '');
  if (body.action !== 'register' || !mock) return rt.post(body);

  switch (mock) {
    case 'duplicate':
      rt.post(body);
      return rt.post(body);
    case 'closed':
      return withEventField(rt, eventId, 'is_open', 'FALSE', () => rt.post(body));
    case 'deadline':
      return withEventField(rt, eventId, 'deadline_iso', '2020-01-01T00:00:00+05:30', () => rt.post(body));
    case 'full':
      return withEventField(rt, eventId, 'max_teams', '0', () => rt.post(body));
    case 'validation':
      return rt.post({ ...body, phone: '5555555555' });
    case 'server': {
      let sheet;
      try {
        sheet = rt.tab(eventId);
      } catch {
        return rt.post(body); // unknown event id — let Code.gs reject it normally
      }
      sheet.throwOnAccess = true;
      try {
        return rt.post(body);
      } finally {
        sheet.throwOnAccess = false;
      }
    }
    default:
      return rt.post(body);
  }
}

export function mockGas(): Plugin {
  let rt: GasRuntime | null = null;
  const runtime = () => (rt ??= createOpenRuntime());

  return {
    name: 'kr26-mock-gas',
    apply: 'serve',
    configureServer(server) {
      // Pick up edits to Code.gs or the data files without restarting the dev server.
      server.watcher.on('change', (file) => {
        if (/apps-script[\\/]Code\.gs$|src[\\/]data[\\/](site|events)\.json$|src[\\/]lib[\\/]rules\.ts$/.test(file)) rt = null;
      });

      server.middlewares.use('/mock-api', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const mock = url.searchParams.get('mock');
        try {
          if (url.pathname === '/__reset') {
            rt = null;
            return send(res, { ok: true, reset: true });
          }
          // Edit one Events-tab cell, like a coordinator would: /__set?id=s-essay&header=is_open&value=FALSE
          if (url.pathname === '/__set') {
            const q = url.searchParams;
            const prev = runtime().setEventField(q.get('id') ?? '', q.get('header') ?? '', q.get('value') ?? '');
            return send(res, { ok: true, prev, registrations: runtime().countRegs(q.get('id') ?? '') });
          }
          // A coordinator marks a registration withdrawn: /__status?event=s-essay&regId=KR26-ESY-0001&value=WITHDRAWN
          if (url.pathname === '/__status') {
            const q = url.searchParams;
            const sh = runtime().tab(q.get('event') ?? '');
            const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0] ?? [];
            const col = headers.indexOf('status') + 1;
            for (let r = 2; r <= sh.getLastRow(); r++) {
              if (String(sh.get(r, 2)) === q.get('regId')) {
                sh.getRange(r, col, 1, 1).setValues([[q.get('value') ?? '']]);
                runtime().cache.clear();
                return send(res, { ok: true, row: r });
              }
            }
            return send(res, { ok: false });
          }
          // network/slow hit submissions (POST) only; statusdown kills just the status GET.
          const isPost = req.method === 'POST';
          if ((mock === 'network' && isPost) || (mock === 'statusdown' && !isPost)) {
            await sleep(LATENCY_MS);
            req.socket.destroy();
            return;
          }
          // Read the body first, like a real server: if the browser gives up while we're "slow",
          // the request is still processed (that is exactly what happens with Apps Script).
          const body = isPost ? await readBody(req) : '';
          await sleep(mock === 'slow' && isPost ? 40000 : LATENCY_MS);
          if (req.method === 'GET') {
            return send(res, runtime().get(Object.fromEntries(url.searchParams)));
          }
          if (isPost) {
            const result = handlePost(runtime(), body, mock);
            if (!res.writableEnded && !req.socket.destroyed) send(res, result);
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (e) {
          server.config.logger.error(`[mock-api] ${(e as Error).stack ?? e}`);
          send(res, { ok: false, code: 'SERVER', reason: 'UNEXPECTED' });
        }
      });
    },
  };
}
