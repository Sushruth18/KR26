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
  reason?: 'NOT_OPEN' | 'DEADLINE' | 'BUSY' | string;
  field?: string;
  regId?: string;
}

export interface LiveEventStatus {
  seats: number;
  seatsLeft: number;
  isOpen: boolean;
  deadline: string | null;
}
export interface StatusResponse {
  ok: true;
  events: Record<string, LiveEventStatus>;
  serverTime: string;
}
export type RegisterResponse = { ok: true; regId: string; event: string; name: string } | ApiError;
export interface LookupPass {
  regId: string;
  event: string;
  name: string;
}
export type LookupResponse = { ok: true; passes: LookupPass[] } | ApiError;

class NetworkError extends Error {}

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
    return { ok: false, code: 'SERVER' } satisfies ApiError; // the server answered, but not with JSON
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
      if (!data || data.ok !== true || typeof data.events !== 'object') throw new Error('bad status');
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
      return res && typeof res.ok === 'boolean' ? res : { ok: false, code: 'SERVER' };
    } catch (e) {
      if (!(e instanceof NetworkError)) return { ok: false, code: 'SERVER' };
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
    return res && typeof res.ok === 'boolean' ? res : { ok: false, code: 'SERVER' };
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
}
