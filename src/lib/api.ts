/**
 * Registration backend client (Google Apps Script web app; local mock at /mock-api in dev).
 * - POST bodies are sent as text/plain JSON → a "simple" CORS request with no preflight.
 * - register(): 20 s timeout, ONE automatic retry on network failure only (never after a server reply).
 *   A retry after a request that did reach the server comes back DUPLICATE with the regId — safe.
 */
import type { RegisterPayload } from './validation';
import { getMockState } from './mockFlag';

const CONFIGURED = (import.meta.env.VITE_REGISTRATION_ENDPOINT as string | undefined)?.trim() ?? '';
export const ENDPOINT = CONFIGURED || (import.meta.env.DEV ? '/mock-api' : '');
export const USING_MOCK = import.meta.env.DEV && !CONFIGURED;

const REGISTER_TIMEOUT_MS = 20000;
const STATUS_TIMEOUT_MS = 10000;
const STATUS_CACHE_MS = 30000;

export type ErrorCode =
  | 'VALIDATION'
  | 'CLOSED'
  | 'FULL'
  | 'DUPLICATE'
  | 'SERVER'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'CONFIG';

export interface ApiError {
  ok: false;
  code: ErrorCode;
  /** CLOSED: NOT_OPEN | DEADLINE. SERVER: LOCK_TIMEOUT, EVENTS_TAB_MISSING, EVENT_TAB_MISSING:<id>, UNEXPECTED … (console only). */
  reason?: string;
  field?: string;
  regId?: string;
}

export interface LiveEventStatus {
  isOpen: boolean;
  deadline: string | null;
  /** Non-withdrawn registrations. For coordinators (and the race test); never shown in the UI. */
  registeredCount: number;
  /** Only for capped events (Events tab → max_teams): places left, ≥ 0. */
  seatsLeft?: number;
}
export interface StatusResponse {
  ok: true;
  events: Record<string, LiveEventStatus>;
  serverTime: string;
  /** Hash of the Config.gs the deployed script runs (compare with `npm run gas:config`); console/debugging only. */
  configVersion?: string;
}
/** whatsappUrl: the event's WhatsApp group/channel invite — only when the coordinators have set a valid one. */
export type RegisterResponse = { ok: true; regId: string; event: string; name: string; whatsappUrl?: string } | ApiError;
export interface LookupPass {
  regId: string;
  event: string;
  name: string;
  whatsappUrl?: string;
}
export type LookupResponse = { ok: true; passes: LookupPass[] } | ApiError;

class NetworkError extends Error {}

/**
 * A SERVER answer carries a short machine-readable reason (EVENT_TAB_MISSING:s-essay, LOCK_TIMEOUT, UNEXPECTED …).
 * Visitors see nothing extra — the reason is only written to the browser console for whoever is debugging.
 */
function logServerReason(where: 'status' | 'register' | 'lookup', res: unknown) {
  if (!res || typeof res !== 'object') return;
  const r = res as Partial<ApiError>;
  if (r.ok === false && r.code === 'SERVER') console.error(`[registration] ${where}: server error, reason=${r.reason ?? '(none)'}`);
}

function url(params: Record<string, string> = {}) {
  const u = new URL(ENDPOINT, window.location.origin);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  if (USING_MOCK) {
    const m = getMockState();
    if (m) u.searchParams.set('mock', m);
  }
  return u.toString();
}

async function fetchJson(target: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(target, { ...init, signal: ctrl.signal, redirect: 'follow' });
  } catch {
    throw new NetworkError('network'); // offline, DNS, connection reset, or our own timeout abort
  } finally {
    clearTimeout(timer);
  }
  try {
    return await res.json();
  } catch {
    return { ok: false, code: 'SERVER', reason: 'BAD_RESPONSE' } satisfies ApiError; // the server answered, but not with JSON
  }
}

function post(body: unknown, timeoutMs: number) {
  return fetchJson(
    url(),
    { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) },
    timeoutMs,
  );
}

const configError: ApiError = { ok: false, code: 'CONFIG' };

// ---------- status (cached 30 s in memory) ----------
let statusCache: { at: number; data: StatusResponse } | null = null;
let inflight: Promise<StatusResponse> | null = null;

export function invalidateStatus() {
  statusCache = null;
}

export async function getStatus(): Promise<StatusResponse> {
  if (!ENDPOINT) throw new Error('CONFIG');
  if (statusCache && Date.now() - statusCache.at < STATUS_CACHE_MS) return statusCache.data;
  inflight ??= (async () => {
    try {
      const data = (await fetchJson(url({ action: 'status' }), { method: 'GET' }, STATUS_TIMEOUT_MS)) as StatusResponse;
      if (!data || data.ok !== true || typeof data.events !== 'object') {
        logServerReason('status', data);
        throw new Error('bad status');
      }
      statusCache = { at: Date.now(), data };
      return data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ---------- register ----------
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  if (!ENDPOINT) return configError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = (await post(payload, REGISTER_TIMEOUT_MS)) as RegisterResponse;
      invalidateStatus();
      logServerReason('register', res);
      return res && typeof res.ok === 'boolean' ? res : { ok: false, code: 'SERVER', reason: 'BAD_RESPONSE' };
    } catch (e) {
      if (!(e instanceof NetworkError)) return { ok: false, code: 'SERVER', reason: 'UNEXPECTED' };
      // fall through to the single retry
    }
  }
  return { ok: false, code: 'NETWORK' };
}

// ---------- lookup ----------
export async function lookup(id: string, phone: string): Promise<LookupResponse> {
  if (!ENDPOINT) return configError;
  try {
    const res = (await post({ action: 'lookup', id, phone }, REGISTER_TIMEOUT_MS)) as LookupResponse;
    logServerReason('lookup', res);
    return res && typeof res.ok === 'boolean' ? res : { ok: false, code: 'SERVER', reason: 'BAD_RESPONSE' };
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
}
