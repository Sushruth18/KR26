/**
 * The site's clock. In production this is just Date.now(). In dev, `?now=<ISO>` on any URL shifts the
 * clock to that instant (it keeps ticking from there) so every countdown phase / deadline banner can be
 * checked: /?now=2026-11-20T10:00:00%2B05:30 — `?now=` with no value resets it.
 */
import { getItem, removeItem, setItem } from './storage';

const KEY = 'kr26.clockOffset';
let offsetMs = 0;

export function now(): number {
  return Date.now() + offsetMs;
}

/** Dev only (called from main.tsx behind import.meta.env.DEV). */
export function captureClockFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('now')) {
    // A literal "+05:30" arrives as " 05:30" after query decoding.
    const at = Date.parse((params.get('now') ?? '').replace(' ', '+'));
    if (Number.isFinite(at)) setItem('session', KEY, String(at - Date.now()));
    else removeItem('session', KEY);
  }
  offsetMs = Number(getItem('session', KEY)) || 0;
}
