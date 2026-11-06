/**
 * Dev-only forced mock outcome. Set from the floating dev panel or by opening any page with
 * ?mock=<state> (e.g. /register?event=s-essay&mock=closed). ?mock= with no value clears it.
 * In production builds these functions are never called (guarded by import.meta.env.DEV).
 */
import { getItem, removeItem, setItem } from './storage';

export const MOCK_KEY = 'kr26.mock';
export const MOCK_STATES = ['duplicate', 'closed', 'deadline', 'validation', 'server', 'network', 'slow', 'statusdown'] as const;
export type MockState = (typeof MOCK_STATES)[number];

export function getMockState(): MockState | null {
  const v = getItem('session', MOCK_KEY);
  return (MOCK_STATES as readonly string[]).includes(v ?? '') ? (v as MockState) : null;
}

export function setMockState(v: MockState | null) {
  if (v) setItem('session', MOCK_KEY, v);
  else removeItem('session', MOCK_KEY);
  window.dispatchEvent(new Event('kr26-mock-change'));
}

/** Reads ?mock= from the current URL once at startup. */
export function captureMockFlagFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('mock')) return;
  const v = params.get('mock') ?? '';
  setMockState((MOCK_STATES as readonly string[]).includes(v) ? (v as MockState) : null);
}
