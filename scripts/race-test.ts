/**
 * Concurrency test: fires many registrations for the SAME event at the same instant and checks that
 * every one of them succeeds, with unique, sequential reg IDs and no duplicate rows. There is no seat
 * limit, so there is no FULL case — what this proves is that LockService really serialises the
 * "read the tab → pick the next number → append the row" step.
 *
 *   npm run race -- <endpoint-url> [eventId] [count]        (default: s-essay, 10 requests)
 *
 * Against the deployed Apps Script (the real test of LockService):
 *   1. Pick a test event (default s-essay) that is open (is_open TRUE, deadline in the future).
 *   2. npm run race -- "https://script.google.com/macros/s/XXXX/exec"
 *   3. Afterwards delete the test rows (names "Race Test …", USNs 1BY99ZZ…) from that event's own tab.
 * Against the local mock: npm run race -- http://localhost:5173/mock-api
 *
 * Note: each request holds the script lock for roughly 1–2 s on the real script and waits up to 20 s for
 * it, so a very large burst can legitimately come back "SERVER / LOCK_TIMEOUT" (the website tells the visitor to
 * try again). That is reported as a failure here too — lower the count if you only want to test ordering.
 */
const [endpoint, eventId = 's-essay', countArg = '10'] = process.argv.slice(2);
if (!endpoint) {
  console.error('Usage: npm run race -- <endpoint-url> [eventId] [count]');
  process.exit(2);
}
const count = Math.max(2, Number(countArg) || 10);

interface Status {
  ok: boolean;
  events: Record<string, { isOpen: boolean; registeredCount: number }>;
}
interface Result {
  ok: boolean;
  code?: string;
  reason?: string;
  regId?: string;
}

async function status(): Promise<Status> {
  const r = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}action=status`, { redirect: 'follow' });
  return (await r.json()) as Status;
}

const num = (regId: string) => parseInt(regId.split('-').pop() ?? '', 10);

async function main() {
  const before = (await status()).events[eventId];
  console.log(`Before: ${eventId} isOpen=${before?.isOpen} registeredCount=${before?.registeredCount}`);
  if (!before?.isOpen) throw new Error(`${eventId} is not open — set is_open to TRUE (and check its deadline) first.`);

  const stamp = Date.now() % 1000;
  const bodies = Array.from({ length: count }, (_, i) => ({
    action: 'register',
    eventId,
    name: `Race Test ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26)) : ''}`,
    id: `1BY99ZZ${String((stamp * 7 + i) % 1000).padStart(3, '0')}${String(i).padStart(2, '0')}`,
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
    bodies.map(async (b): Promise<Result> => {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b), redirect: 'follow' });
        return (await r.json()) as Result;
      } catch (e) {
        return { ok: false, code: `NETWORK ${(e as Error).message}` };
      }
    }),
  );
  results.forEach((r, i) => console.log(`  #${String(i + 1).padStart(2)} ${bodies[i]!.id}: ${r.ok ? `OK ${r.regId}` : `${r.code}${r.reason ? `/${r.reason}` : ''}`}`));

  const failures: string[] = [];
  const okResults = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  if (bad.length) {
    const busy = bad.filter((r) => r.code === 'SERVER' && r.reason === 'LOCK_TIMEOUT').length;
    failures.push(`${bad.length} of ${count} did not succeed (${busy} lock timeouts "LOCK_TIMEOUT") — expected every request to succeed`);
  }

  const regIds = okResults.map((r) => r.regId!);
  const unique = new Set(regIds);
  if (unique.size !== regIds.length) failures.push(`duplicate reg IDs handed out: ${regIds.filter((x, i) => regIds.indexOf(x) !== i).join(', ')}`);

  const nums = regIds.map(num).sort((a, b) => a - b);
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1]! + 1);
  if (!contiguous) failures.push(`reg IDs are not sequential: ${nums.join(', ')}`);
  if (regIds.some((r) => !new RegExp(`^KR26-[A-Z]{3}-\\d{4}$`).test(r))) failures.push('a reg ID has an unexpected format');
  const first = nums[0];
  if (before && first !== undefined && first !== before.registeredCount + 1) {
    console.log(`  note: numbering started at ${first} but the tab had ${before.registeredCount} registrations — fine if rows were deleted earlier.`);
  }

  // The status cache is cleared by every registration, so this is the fresh count.
  const after = (await status()).events[eventId];
  const delta = (after?.registeredCount ?? 0) - (before.registeredCount ?? 0);
  if (delta !== okResults.length) {
    failures.push(`the tab grew by ${delta} rows but ${okResults.length} registrations succeeded (another visitor may have registered meanwhile)`);
  }

  console.log(`\n${count} simultaneous requests in ${Date.now() - t0} ms → ${okResults.length} succeeded, ${unique.size} unique reg IDs${nums.length ? ` (${nums[0]}–${nums[nums.length - 1]})` : ''}.`);
  if (failures.length) {
    console.log('FAIL:\n  - ' + failures.join('\n  - '));
    process.exit(1);
  }
  console.log('PASS: all registrations succeeded with unique, sequential reg IDs and no duplicate rows.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
