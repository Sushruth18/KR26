/**
 * Last-seat race test: fires several registrations for the SAME event at the same instant.
 * With exactly one seat left, exactly one must succeed and every other must get FULL.
 *
 *   npm run race -- <endpoint-url> [eventId] [count]
 *
 * Against the deployed Apps Script (the real test of LockService):
 *   1. In the Sheet's Events tab, pick a test event (default s-essay) and set its `seats` to
 *      (number of rows it already has in Registrations) + 1, and `is_open` to TRUE.
 *   2. npm run race -- "https://script.google.com/macros/s/XXXX/exec"
 *   3. Afterwards delete the one test row from Registrations and restore `seats`.
 * Against the local mock: npm run race -- http://localhost:5173/mock-api   (sets seats itself)
 */
const [endpoint, eventId = 's-essay', countArg = '5'] = process.argv.slice(2);
if (!endpoint) {
  console.error('Usage: npm run race -- <endpoint-url> [eventId] [count]');
  process.exit(2);
}
const count = Math.max(2, Number(countArg) || 5);
const isMock = endpoint.includes('/mock-api');

interface Status {
  ok: boolean;
  events: Record<string, { seatsLeft: number; isOpen: boolean }>;
}

async function status(): Promise<Status> {
  const r = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}action=status`, { redirect: 'follow' });
  return (await r.json()) as Status;
}

async function main() {
  if (isMock) {
    const s = await status();
    const used = 100 - (s.events[eventId]?.seatsLeft ?? 100);
    await fetch(`${endpoint.replace(/\/$/, '')}/__set?id=${eventId}&header=seats&value=${used + 1}`);
  }
  // Status is cached server-side for up to 10 s; that's fine for this check.
  const before = (await status()).events[eventId];
  console.log(`Before: ${eventId} seatsLeft=${before?.seatsLeft} isOpen=${before?.isOpen}`);
  if (!before?.isOpen) throw new Error(`${eventId} is not open — set is_open to TRUE first.`);
  if (before.seatsLeft !== 1) console.warn(`  ! seatsLeft is ${before.seatsLeft}, not 1 — set seats so exactly one is left.`);

  const stamp = Date.now() % 1000;
  const bodies = Array.from({ length: count }, (_, i) => ({
    action: 'register',
    eventId,
    name: `Race Test ${String.fromCharCode(65 + i)}`,
    id: `1BY99ZZ${String((stamp + i) % 1000).padStart(3, '0')}`,
    department: 'CSE',
    departmentOther: '',
    semester: 1,
    phone: `98${String(10000000 + stamp * 10 + i).slice(-8)}`,
    email: `race${i}@example.com`,
    teamName: '',
    members: [],
    consentRules: true,
    consentPhoto: false,
    website: '',
    elapsedMs: 10000,
    lang: 'en',
  }));

  const t0 = Date.now();
  const results = await Promise.all(
    bodies.map(async (b) => {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b), redirect: 'follow' });
        return (await r.json()) as { ok: boolean; code?: string; regId?: string };
      } catch (e) {
        return { ok: false, code: `NETWORK ${(e as Error).message}` };
      }
    }),
  );
  results.forEach((r, i) => console.log(`  #${i + 1} ${bodies[i]!.id}: ${r.ok ? `OK ${r.regId}` : r.code}`));
  const ok = results.filter((r) => r.ok).length;
  const full = results.filter((r) => r.code === 'FULL').length;
  console.log(`\n${count} simultaneous requests in ${Date.now() - t0} ms → ${ok} succeeded, ${full} FULL.`);
  if (ok === 1 && full === count - 1) console.log('PASS: exactly one registration took the last seat.');
  else {
    console.log('FAIL: expected exactly 1 success and the rest FULL.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
