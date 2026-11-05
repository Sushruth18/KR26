/**
 * Tests the real apps-script/Code.gs (run in a Node VM against fake Google services).
 *   npm run test:server
 */
import assert from 'node:assert/strict';
import { createGasRuntime, createOpenRuntime, type GasRuntime } from '../mock/gas-runtime';
import { normEmail, normId, normPhone, normText } from '../src/lib/validation';

let passed = 0;
const failures: string[] = [];
function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${(e as Error).message.split('\n').join('\n       ')}`);
  }
}

const base = {
  action: 'register',
  eventId: 's-essay',
  name: 'Ananya Rao',
  id: '1by23cs001',
  department: 'CSE',
  departmentOther: '',
  semester: 3,
  phone: '+91 98450 12345',
  email: 'Ananya@Example.com',
  teamName: '',
  members: [],
  consentRules: true,
  consentPhoto: false,
  website: '',
  elapsedMs: 45000,
  lang: 'kn',
};
const quiz = {
  ...base,
  eventId: 's-quiz',
  id: '1BY23CS010',
  teamName: 'Kannada Kalpa',
  members: [{ name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' }],
};
const reg = (rt: GasRuntime, over: Record<string, unknown> = {}) => rt.post({ ...base, ...over });
const regRow = (rt: GasRuntime, n: number) => rt.regs().getRange(n, 1, 1, 14).getDisplayValues()[0] ?? [];

console.log('\nSetup & status');
t('setupSheet creates both tabs with headers; every event seeded closed (is_open FALSE)', () => {
  const rt = createGasRuntime();
  (rt.ctx.setupSheet as () => void)();
  assert.equal(rt.events().getRange(1, 1, 1, 6).getDisplayValues()[0]?.join('|'), 'id|code|name_en|seats|deadline_iso|is_open');
  assert.equal(rt.regs().getLastColumn(), 14);
  assert.equal(rt.events().getLastRow(), 13);
  const st = rt.get({ action: 'status' }) as unknown as { events: Record<string, { isOpen: boolean; seatsLeft: number }> };
  assert.equal(st.events['s-essay']?.isOpen, false);
  assert.equal(st.events['s-essay']?.seatsLeft, 100);
  assert.equal(reg(rt).code, 'CLOSED');
  assert.equal(reg(rt).reason, 'NOT_OPEN');
  (rt.ctx.setupSheet as () => void)(); // re-running must not duplicate events
  assert.equal(rt.events().getLastRow(), 13);
});
t('status reports seats/seatsLeft/isOpen/deadline per event and serverTime', () => {
  const rt = createOpenRuntime();
  reg(rt);
  rt.cache.clear();
  const st = rt.get({ action: 'status' }) as unknown as { ok: boolean; serverTime: string; events: Record<string, { seats: number; seatsLeft: number; isOpen: boolean; deadline: string }> };
  assert.equal(st.ok, true);
  assert.deepEqual(st.events['s-essay'], { seats: 100, seatsLeft: 99, isOpen: true, deadline: '2026-11-18T18:29:00.000Z' });
  assert.equal(st.events['s-quiz']?.seats, 30);
  assert.ok(!Number.isNaN(Date.parse(st.serverTime)));
});
t('unknown GET action / bad JSON / unknown POST action → VALIDATION', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.get({}).code, 'VALIDATION');
  assert.equal(rt.postRaw('not json').code, 'VALIDATION');
  assert.equal(rt.post({ action: 'drop' }).code, 'VALIDATION');
});

console.log('\nRegister — success path');
t('success returns regId KR26-ESY-0001 and writes a normalised plain-text row', () => {
  const rt = createOpenRuntime();
  const r = reg(rt);
  assert.deepEqual(r, { ok: true, regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao' });
  const row = regRow(rt, 2);
  assert.equal(row[1], 'KR26-ESY-0001');
  assert.equal(row[3], 'students'); // category derived from the event
  assert.equal(row[5], '1BY23CS001'); // USN upper-cased
  assert.equal(row[7], '3');
  assert.equal(row[8], '9845012345'); // +91 and spaces stripped, kept as text
  assert.equal(row[9], 'ananya@example.com');
  assert.equal(row[13], 'FALSE');
  assert.ok(rt.regs().formats[1]?.every((f) => f === '@'), 'every written cell is plain-text format');
});
t('running number per event: 0001, 0002 for essay; quiz starts at 0001', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt).regId, 'KR26-ESY-0001');
  assert.equal(reg(rt, { id: '1BY23CS002' }).regId, 'KR26-ESY-0002');
  assert.equal(rt.post(quiz).regId, 'KR26-QIZ-0001');
});
t('after a coordinator deletes a middle row, numbering continues from the highest (no reuse)', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { id: '1BY23CS002' });
  reg(rt, { id: '1BY23CS003' });
  rt.regs().deleteRow(3); // delete KR26-ESY-0002
  assert.equal(reg(rt, { id: '1BY23CS004' }).regId, 'KR26-ESY-0004');
});
t('the same person may register for several different events', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt).ok, true);
  assert.equal(reg(rt, { eventId: 's-poem' }).ok, true);
  assert.equal(reg(rt, { eventId: 's-debate' }).ok, true);
});
t('faculty event: employee ID accepted, semester ignored, category faculty', () => {
  const rt = createOpenRuntime();
  const r = reg(rt, { eventId: 'f-debate', id: 'emp 1042', semester: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.regId, 'KR26-FDB-0001');
  const row = regRow(rt, 2);
  assert.equal(row[3], 'faculty');
  assert.equal(row[5], 'EMP1042');
  assert.equal(row[7], '');
});
t('team registration stores members_json and member_ids', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post(quiz).ok, true);
  const row = regRow(rt, 2);
  assert.equal(row[10], 'Kannada Kalpa');
  assert.deepEqual(JSON.parse(row[11] ?? ''), [{ name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' }]);
  assert.equal(row[12], '1BY23CS011');
});
t('"Other" department is stored as "Other: <text>"', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt, { department: 'Other', departmentOther: 'Robotics' }).ok, true);
  assert.equal(regRow(rt, 2)[6], 'Other: Robotics');
});
t('confirmation email is sent to the normalised address with the regId', () => {
  const rt = createOpenRuntime();
  reg(rt);
  assert.equal(rt.mail.sent.length, 1);
  assert.equal(rt.mail.sent[0]?.to, 'ananya@example.com');
  assert.match(rt.mail.sent[0]?.body ?? '', /KR26-ESY-0001/);
  assert.match(rt.mail.sent[0]?.body ?? '', /ನೋಂದಣಿ ಐಡಿ/);
});
t('email failure (quota/outage) does NOT fail the registration', () => {
  const rt = createOpenRuntime();
  rt.mail.fail = true;
  assert.equal(reg(rt).ok, true);
  rt.mail.fail = false;
  rt.mail.quota = 0;
  assert.equal(reg(rt, { id: '1BY23CS002' }).ok, true);
  assert.equal(rt.mail.sent.length, 0);
});

console.log('\nRegister — DUPLICATE (per event, across all team member IDs)');
t('same USN again for the same event → DUPLICATE with the existing regId', () => {
  const rt = createOpenRuntime();
  reg(rt);
  assert.deepEqual(reg(rt, { id: ' 1by23cs001 ', name: 'Someone Else' }), { ok: false, code: 'DUPLICATE', regId: 'KR26-ESY-0001' });
});
t('new registrant who is already a member of another team → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(quiz);
  const r = rt.post({ ...quiz, id: '1BY23CS011', members: [{ name: 'Meera S', id: '1BY23CS020', phone: '9845022222' }] });
  assert.deepEqual(r, { ok: false, code: 'DUPLICATE', regId: 'KR26-QIZ-0001' });
});
t('new team containing an existing registrant as a member → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(quiz);
  const r = rt.post({ ...quiz, id: '1BY23CS030', members: [{ name: 'Ravi K', id: '1BY23CS010', phone: '9845011111' }] });
  assert.equal(r.code, 'DUPLICATE');
});
t('new team sharing only a member with an existing team → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(quiz);
  const r = rt.post({ ...quiz, id: '1BY23CS040', members: [{ name: 'Ravi K', id: '1by23cs011', phone: '9845011111' }] });
  assert.equal(r.code, 'DUPLICATE');
});
t('faculty team member employee IDs are duplicate-checked too', () => {
  const rt = createOpenRuntime();
  const fac = {
    ...base,
    eventId: 'f-group-singing',
    id: 'EMP1',
    teamName: 'Gaana',
    members: [{ name: 'Asha', id: 'EMP2', phone: '9845000002' }, { name: 'Bindu', id: 'EMP3', phone: '9845000003' }],
  };
  assert.equal(rt.post(fac).ok, true);
  const r = rt.post({ ...fac, id: 'EMP9', members: [{ name: 'Chetan', id: 'emp3', phone: '9845000009' }, { name: 'Divya', id: 'EMP8', phone: '9845000008' }] });
  assert.equal(r.code, 'DUPLICATE');
});
t('duplicate wins over FULL (an already-registered person is told their ID)', () => {
  const rt = createOpenRuntime();
  reg(rt);
  rt.setEventField('s-essay', 'seats', '1');
  assert.equal(reg(rt).code, 'DUPLICATE');
  assert.equal(reg(rt, { id: '1BY23CS099' }).code, 'FULL');
});

console.log('\nRegister — FULL / CLOSED / deadline');
t('FULL when registrations reach the Sheet seat count (a team = 1 seat)', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-quiz', 'seats', '1');
  assert.equal(rt.post(quiz).ok, true);
  assert.deepEqual(rt.post({ ...quiz, id: '1BY23CS050', members: [{ name: 'Nikhil', id: '1BY23CS051', phone: '9845055555' }] }), { ok: false, code: 'FULL' });
});
t('CLOSED/NOT_OPEN when the coordinator sets is_open to FALSE', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'is_open', 'FALSE');
  assert.deepEqual(reg(rt), { ok: false, code: 'CLOSED', reason: 'NOT_OPEN' });
});
t('CLOSED/DEADLINE when the Sheet deadline has passed', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'deadline_iso', '2020-01-01T00:00:00+05:30');
  assert.deepEqual(reg(rt), { ok: false, code: 'CLOSED', reason: 'DEADLINE' });
});
t('a broken deadline cell fails closed (never silently open)', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'deadline_iso', '18/11 midnight');
  assert.equal(reg(rt).code, 'CLOSED');
  rt.cache.clear();
  const st = rt.get({ action: 'status' }) as unknown as { events: Record<string, { isOpen: boolean }> };
  assert.equal(st.events['s-essay']?.isOpen, false);
});
t('Sheet seats win over events.json (seats raised to 150 in the Sheet)', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'seats', '150');
  const st = rt.get({ action: 'status' }) as unknown as { events: Record<string, { seats: number }> };
  assert.equal(st.events['s-essay']?.seats, 150);
});

console.log('\nRegister — VALIDATION (server re-checks everything)');
const cases: [string, Record<string, unknown>, string][] = [
  ['honeypot filled', { website: 'http://spam' }, 'form'],
  ['submitted 1.2 s after opening the form', { elapsedMs: 1200 }, 'form'],
  ['elapsedMs missing', { elapsedMs: undefined }, 'form'],
  ['unknown event', { eventId: 'x-rap-battle' }, 'eventId'],
  ['name with digits', { name: 'R2D2' }, 'name'],
  ['name one char', { name: 'A' }, 'name'],
  ['USN wrong college code', { id: '1RV23CS001' }, 'id'],
  ['department not in list', { department: 'Physics' }, 'department'],
  ['Other department empty', { department: 'Other', departmentOther: ' ' }, 'departmentOther'],
  ['even semester 2', { semester: 2 }, 'semester'],
  ['semester 5 for MBA (MBA allows 1, 3)', { department: 'MBA', semester: 5 }, 'semester'],
  ['student without semester', { semester: null }, 'semester'],
  ['phone starting with 5', { phone: '5845012345' }, 'phone'],
  ['phone 9 digits', { phone: '984501234' }, 'phone'],
  ['bad email', { email: 'ananya@' }, 'email'],
  ['rules consent missing', { consentRules: false }, 'consentRules'],
  ['members sent for an individual event', { members: [{ name: 'X Y', id: '1BY23CS002', phone: '9845012346' }] }, 'members'],
];
for (const [name, over, field] of cases) {
  t(`${name} → VALIDATION field "${field}"`, () => {
    const rt = createOpenRuntime();
    assert.deepEqual(reg(rt, over), { ok: false, code: 'VALIDATION', field });
    assert.equal(rt.countRegs(String(over.eventId ?? 's-essay')), 0);
  });
}
t('MBA semester 3 accepted', () => assert.equal(reg(createOpenRuntime(), { department: 'MBA', semester: 3 }).ok, true));
t('Kannada name with conjuncts accepted (ಶ್ರೀನಿವಾಸ್ ಕೆ.)', () => assert.equal(reg(createOpenRuntime(), { name: 'ಶ್ರೀನಿವಾಸ್ ಕೆ.' }).ok, true));
t('team: too few members (Group Dance min 6 incl. registrant) → members', () => {
  const r = createOpenRuntime().post({ ...quiz, eventId: 's-group-dance', members: quiz.members });
  assert.deepEqual(r, { ok: false, code: 'VALIDATION', field: 'members' });
});
t('team: too many members (Quiz max 2) → members', () => {
  const r = createOpenRuntime().post({ ...quiz, members: [...quiz.members, { name: 'Extra', id: '1BY23CS012', phone: '9845011112' }] });
  assert.equal(r.field, 'members');
});
t('team: duplicate USN inside the team → members.0.id', () => {
  const r = createOpenRuntime().post({ ...quiz, members: [{ name: 'Ravi K', id: '1BY23CS010', phone: '9845011111' }] });
  assert.deepEqual(r, { ok: false, code: 'VALIDATION', field: 'members.0.id' });
});
t('team: member with an employee ID on a student event → members.0.id', () => {
  const r = createOpenRuntime().post({ ...quiz, members: [{ name: 'Ravi K', id: 'EMP77', phone: '9845011111' }] });
  assert.equal(r.field, 'members.0.id');
});
t('team: missing team name → teamName', () => {
  assert.equal(createOpenRuntime().post({ ...quiz, teamName: '' }).field, 'teamName');
});

console.log('\nFormula injection');
t('safeCell_ prefixes = + - @ tab CR with an apostrophe, leaves others alone', () => {
  const rt = createOpenRuntime();
  const safe = rt.ctx.safeCell_ as (v: unknown) => string;
  for (const s of ['=1+1', '+SUM(A1)', '-2+3', '@me', '\t=x', '\r=x']) assert.equal(safe(s), `'${s}`);
  for (const s of ['Ananya', '9845012345', 'KR26-ESY-0001', '[{"a":1}]']) assert.equal(safe(s), s);
});
t('an email that passes format checks but starts with "=" is stored as text, never a formula', () => {
  const rt = createOpenRuntime();
  const r = reg(rt, { email: '=HYPERLINK("http://evil")@x.co'.replace(/[()"/:]/g, '') });
  assert.equal(r.ok, true);
  assert.equal(rt.regs().hasFormula(), false);
  assert.match(regRow(rt, 2)[9] ?? '', /^=hyperlink/);
  const r2 = reg(rt, { id: '1BY23CS002', email: '+cmd@x.co' });
  assert.equal(r2.ok, true);
  assert.equal(regRow(rt, 3)[9], '+cmd@x.co');
  assert.equal(rt.regs().hasFormula(), false);
});
t('setupSheet writes the Events tab as plain text too (deadline stays ISO)', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.events().getRange(2, 5).getDisplayValues()[0]?.[0], '2026-11-18T23:59:00+05:30');
});

console.log('\nLock');
t('every register call acquires and releases the script lock (success and error paths)', () => {
  const rt = createOpenRuntime();
  reg(rt); // ok
  reg(rt); // duplicate
  rt.setEventField('s-poem', 'is_open', 'FALSE');
  reg(rt, { eventId: 's-poem' }); // closed
  assert.equal(rt.lock.acquired, 3);
  assert.equal(rt.lock.released, 3);
  assert.equal(rt.lock.held, false);
});
t('validation failures are rejected before taking the lock', () => {
  const rt = createOpenRuntime();
  reg(rt, { phone: '1' });
  assert.equal(rt.lock.acquired, 0);
});
t('lock not obtainable within 20 s → SERVER/BUSY, nothing written', () => {
  const rt = createOpenRuntime();
  rt.lock.busy = true;
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'BUSY' });
  assert.equal(rt.countRegs('s-essay'), 0);
});
t('Sheet failure inside the lock → SERVER, and the lock is still released', () => {
  const rt = createOpenRuntime();
  rt.regs().throwOnAccess = true;
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER' });
  assert.equal(rt.lock.held, false);
  assert.equal(rt.lock.released, 1);
});
t('lock is held while the row is appended (seat check and write are atomic)', () => {
  const rt = createOpenRuntime();
  const sheet = rt.regs();
  const orig = sheet.write.bind(sheet);
  let heldDuringWrite = true;
  sheet.write = (r, c, v) => {
    if (!rt.lock.held) heldDuringWrite = false;
    orig(r, c, v);
  };
  reg(rt);
  assert.equal(heldDuringWrite, true);
});

console.log('\nLookup');
t('ID + full phone → passes (regId, event, name only)', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { eventId: 's-poem' });
  const r = rt.post({ action: 'lookup', id: '1by23cs001', phone: '98450 12345' });
  assert.deepEqual(r, {
    ok: true,
    passes: [
      { regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao' },
      { regId: 'KR26-POM-0001', event: 's-poem', name: 'Ananya Rao' },
    ],
  });
});
t('team member can look up with their own ID + phone', () => {
  const rt = createOpenRuntime();
  rt.post(quiz);
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS011', phone: '9845011111' }), {
    ok: true,
    passes: [{ regId: 'KR26-QIZ-0001', event: 's-quiz', name: 'Ravi K' }],
  });
});
t('right ID, wrong phone → NOT_FOUND (no data leaked)', () => {
  const rt = createOpenRuntime();
  reg(rt);
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845099999' }), { ok: false, code: 'NOT_FOUND' });
});
t('partial phone is rejected as VALIDATION', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post({ action: 'lookup', id: '1BY23CS001', phone: '12345' }).code, 'VALIDATION');
});
t('5 failed lookups for one ID → RATE_LIMITED, even with the right phone', () => {
  const rt = createOpenRuntime();
  reg(rt);
  for (let i = 0; i < 5; i++) rt.post({ action: 'lookup', id: '1BY23CS001', phone: `98450000${10 + i}` });
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845012345' }), { ok: false, code: 'RATE_LIMITED' });
});

console.log('\nClient/server parity');
t('normalisers in validation.ts and Code.gs give identical results', () => {
  const rt = createOpenRuntime();
  const inputs = ['  1by 23cs001 ', '+91 98450-12345', '919845012345', '09845012345', ' A.  B   ', 'ಶ್ರೀ  ನಿವಾಸ್', ' X@Y.CO ', '', '\t', 'emp 10 42'];
  for (const s of inputs) {
    assert.equal((rt.ctx.normText_ as (v: string) => string)(s), normText(s), `normText(${JSON.stringify(s)})`);
    assert.equal((rt.ctx.normId_ as (v: string) => string)(s), normId(s), `normId(${JSON.stringify(s)})`);
    assert.equal((rt.ctx.normPhone_ as (v: string) => string)(s), normPhone(s), `normPhone(${JSON.stringify(s)})`);
    assert.equal((rt.ctx.normEmail_ as (v: string) => string)(s), normEmail(s), `normEmail(${JSON.stringify(s)})`);
  }
});
t('Config.gs carries site.json semesters and departments', () => {
  const cfg = createOpenRuntime().ctx.CONFIG as { semesters: { default: number[]; byDepartment: Record<string, number[]> }; departments: string[] };
  // VM-realm arrays: compare by JSON
  assert.equal(JSON.stringify(cfg.semesters.default), '[1,3,5,7]');
  assert.equal(JSON.stringify(cfg.semesters.byDepartment.MBA), '[1,3]');
  assert.equal(JSON.stringify(cfg.semesters.byDepartment.MCA), '[1,3]');
  assert.ok(cfg.departments.includes('AIML'));
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
