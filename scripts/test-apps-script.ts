/**
 * Tests the real apps-script/Code.gs (run in a Node VM against fake Google services).
 *   npm run test:server
 */
import assert from 'node:assert/strict';
import { createGasRuntime, createOpenRuntime, type GasRuntime } from '../mock/gas-runtime';
import { readdirSync, readFileSync } from 'node:fs';
import { buildGasConfigSource, computeConfigVersion, GAS_CONFIG_SCHEMA } from './gas-config';
import { cleanWhatsappUrl } from '../src/lib/whatsapp';
import { isValidId, normEmail, normId, normPhone, normText } from '../src/lib/validation';

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
/** Treasure Hunt: exactly 4 people, i.e. the registrant + 3 members. */
const hunt = {
  ...base,
  eventId: 's-treasure-hunt',
  id: '1BY23CS010',
  teamName: 'Kannada Kalpa',
  members: [
    { name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' },
    { name: 'Meera S', id: '1BY23CS012', phone: '9845022222' },
    { name: 'Kiran P', id: '1BY23CS013', phone: '9845033333' },
  ],
};
type Member = { name: string; id: string; phone: string };
let crewN = 0;
/** A 3-member Treasure Hunt crew whose first member is `first`; the other two are fresh people nobody else uses. */
const crew = (first: Member): Member[] => [
  first,
  ...[0, 1].map(() => {
    const n = ++crewN;
    return { name: `Crew ${String.fromCharCode(65 + (n % 26))}`, id: `1BY23ZZ${String(n).padStart(3, '0')}`, phone: `97400${String(n).padStart(5, '0')}` };
  }),
];
/** n people for a team event: the registrant (from `over.id`) + n − 1 fresh members. */
const membersFor = (n: number, prefix: string): Member[] =>
  Array.from({ length: n - 1 }, (_, i) => ({ name: `Member ${String.fromCharCode(65 + i)}`, id: `${prefix}${i + 1}`, phone: `96000${String(i + 1).padStart(5, '0')}` }));
const reg = (rt: GasRuntime, over: Record<string, unknown> = {}) => rt.post({ ...base, ...over });
/** Row n of an event's own tab (13 columns: timestamp | reg_id | category | name | usn | dept | sem | phone | email | team | members_json | member_ids | consent). */
const regRow = (rt: GasRuntime, n: number, eventId = 's-essay') => rt.tab(eventId).getRange(n, 1, 1, 13).getDisplayValues()[0] ?? [];
const setup = (rt: GasRuntime) => (rt.ctx.setupSheet as () => void)();
const st = (rt: GasRuntime) => {
  rt.cache.clear();
  return rt.get({ action: 'status' }) as unknown as {
    ok: boolean;
    serverTime: string;
    events: Record<string, { isOpen: boolean; deadline: string | null; registeredCount: number }>;
  };
};
const ids = (rt: GasRuntime) => Object.keys((rt.ctx.CONFIG as { events: Record<string, unknown> }).events);
const TAB_HEADERS = 'timestamp|reg_id|category|name|usn_or_empid|department|semester|phone|email|team_name|members_json|member_ids|consent_photo';

console.log('\nSetup & status');
t('setupSheet creates the Events tab and one tab per event — all 12 — and NO shared Registrations tab', () => {
  const rt = createGasRuntime();
  setup(rt);
  assert.equal(rt.events().getRange(1, 1, 1, 7).getDisplayValues()[0]?.join('|'), 'id|code|name_en|sheet_name|deadline_iso|is_open|whatsapp_url');
  assert.equal(rt.events().getLastRow(), 13);
  assert.equal(ids(rt).length, 12);
  const names = rt.ss.getSheets().map((x) => x.getName());
  assert.equal(names.length, 13, `tabs: ${names.join(', ')}`);
  assert.equal(names.includes('Registrations'), false);
  for (const id of ids(rt)) {
    const tab = rt.tab(id);
    assert.equal(tab.getRange(1, 1, 1, 13).getDisplayValues()[0]?.join('|'), TAB_HEADERS, id);
    assert.equal(tab.getLastColumn(), 13);
    assert.equal(tab.getLastRow(), 1, 'header only');
  }
  assert.equal(rt.eventField('s-essay', 'sheet_name'), 'ESY – Essay Writing');
  assert.equal(rt.tab('s-essay').getName(), 'ESY – Essay Writing');
  assert.equal(rt.tab('f-group-singing').getName(), 'FGS – Faculty Group Singing');
});
t('every event starts open (is_open TRUE), so registration works straight after setup — no opening date', () => {
  const rt = createGasRuntime();
  setup(rt);
  for (const id of ids(rt)) assert.equal(rt.eventField(id, 'is_open'), 'TRUE', id);
  assert.equal(st(rt).events['s-essay']?.isOpen, true);
  assert.equal(reg(rt).ok, true);
});
t('event tabs: header row frozen and bold, data columns are plain text', () => {
  const rt = createGasRuntime();
  const frozen: string[] = [];
  const bold: string[] = [];
  // Spy on the fake tab methods as they are created.
  const origInsert = rt.ss.insertSheet.bind(rt.ss);
  rt.ss.insertSheet = (n: string) => {
    const sh = origInsert(n);
    const f = sh.setFrozenRows.bind(sh);
    sh.setFrozenRows = (() => (frozen.push(n), f())) as typeof sh.setFrozenRows;
    const g = sh.getRange.bind(sh);
    sh.getRange = ((...a: Parameters<typeof sh.getRange>) => {
      const r = g(...a);
      const w = r.setFontWeight.bind(r);
      r.setFontWeight = ((...x: Parameters<typeof r.setFontWeight>) => (a[0] === 1 && bold.push(n), w(...x))) as typeof r.setFontWeight;
      return r;
    }) as typeof sh.getRange;
    return sh;
  };
  setup(rt);
  for (const id of ids(rt)) {
    const name = rt.tab(id).getName();
    assert.ok(frozen.includes(name), `${name} frozen`);
    assert.ok(bold.includes(name), `${name} header bold`);
    for (const row of [2, 3, 500, 1000]) {
      for (let c = 1; c <= 13; c++) assert.equal(rt.tab(id).formats[row - 1]?.[c - 1], '@', `${name} r${row}c${c}`);
    }
  }
});
t('status reports isOpen/deadline/registeredCount per event — and no seats anywhere', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { id: '1BY23CS002' });
  rt.post(hunt);
  const s0 = st(rt);
  assert.equal(s0.ok, true);
  assert.deepEqual(s0.events['s-essay'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 2 });
  assert.deepEqual(s0.events['s-treasure-hunt'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 1 });
  assert.deepEqual(s0.events['s-poem'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 0 });
  assert.ok(!Number.isNaN(Date.parse(s0.serverTime)));
  assert.doesNotMatch(JSON.stringify(s0), /seat/i);
});
t('setupSheet is safe to run again: a second run changes nothing', () => {
  const rt = createOpenRuntime();
  reg(rt);
  rt.post(hunt);
  rt.setEventField('s-debate', 'is_open', 'FALSE'); // a coordinator's manual close must survive
  const before = rt.ss.snapshot();
  const tabsBefore = rt.ss.getSheets().length;
  setup(rt);
  setup(rt);
  assert.equal(rt.ss.getSheets().length, tabsBefore);
  assert.equal(rt.ss.snapshot(), before);
  assert.equal(rt.eventField('s-debate', 'is_open'), 'FALSE');
  assert.equal(rt.events().getLastRow(), 13);
  assert.equal(rt.countRegs('s-essay'), 1);
});
t('setupSheet only adds what is missing: a deleted tab is recreated empty, other tabs keep their rows', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { eventId: 's-poem' });
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-poem')), 1); // coordinator deleted the Poem tab
  setup(rt);
  assert.equal(rt.countRegs('s-essay'), 1);
  assert.equal(rt.countRegs('s-poem'), 0);
  assert.equal(rt.tab('s-poem').getName(), 'POM – Poem');
});
t('setupSheet leaves an old shared "Registrations" tab untouched (and does not use it)', () => {
  const rt = createGasRuntime();
  const old = rt.ss.insertSheet('Registrations');
  old.getRange(1, 1, 1, 3).setValues([['timestamp', 'reg_id', 'event_id']]);
  old.getRange(2, 1, 1, 3).setValues([['2026-11-01', 'KR26-ESY-0007', 's-essay']]);
  const snap = JSON.stringify([old.cells, old.formats]);
  setup(rt);
  assert.equal(JSON.stringify([old.cells, old.formats]), snap);
  assert.equal(reg(rt).regId, 'KR26-ESY-0001'); // numbering comes from the event tab, not the old tab
  assert.equal(JSON.stringify([old.cells, old.formats]), snap);
  assert.equal(rt.countRegs('s-essay'), 1);
});
t('setupSheet upgrades an older Events tab (seats column, no sheet_name): adds sheet_name, keeps seats and is_open', () => {
  const rt = createGasRuntime();
  const evs = rt.ss.insertSheet('Events');
  evs.getRange(1, 1, 1, 6).setValues([['id', 'code', 'name_en', 'seats', 'deadline_iso', 'is_open']]);
  evs.getRange(2, 1, 1, 6).setValues([['s-essay', 'ESY', 'Essay Writing', '100', '2026-11-18T23:59:00+05:30', 'FALSE']]);
  setup(rt);
  const headers = rt.events().getRange(1, 1, 1, rt.events().getLastColumn()).getDisplayValues()[0] ?? [];
  assert.deepEqual(headers, ['id', 'code', 'name_en', 'seats', 'deadline_iso', 'is_open', 'sheet_name', 'whatsapp_url']);
  assert.equal(rt.eventField('s-essay', 'sheet_name'), 'ESY – Essay Writing');
  assert.equal(rt.eventField('s-essay', 'is_open'), 'FALSE'); // existing value kept
  assert.equal(rt.eventField('s-poem', 'is_open'), 'TRUE');
  assert.equal(rt.events().getLastRow(), 13);
});
t('an event tab with a wrong header row makes setupSheet stop with a clear error (nothing overwritten)', () => {
  const rt = createGasRuntime();
  const bad = rt.ss.insertSheet('ESY – Essay Writing');
  bad.getRange(1, 1, 1, 2).setValues([['foo', 'bar']]);
  assert.throws(() => setup(rt), /row 1 must be/);
  assert.equal(bad.get(1, 1), 'foo');
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
  assert.equal(row[2], 'students'); // category derived from the event
  assert.equal(row[3], 'Ananya Rao');
  assert.equal(row[4], '1BY23CS001'); // USN upper-cased
  assert.equal(row[6], '3');
  assert.equal(row[7], '9845012345'); // +91 and spaces stripped, kept as text
  assert.equal(row[8], 'ananya@example.com');
  assert.equal(row[12], 'FALSE');
  assert.ok(rt.tab('s-essay').formats[1]?.every((f) => f === '@'), 'every written cell is plain-text format');
});
t('running number per event: 0001, 0002 for essay; treasure hunt starts at 0001', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt).regId, 'KR26-ESY-0001');
  assert.equal(reg(rt, { id: '1BY23CS002' }).regId, 'KR26-ESY-0002');
  assert.equal(rt.post(hunt).regId, 'KR26-TRH-0001');
});
t('after a coordinator deletes a middle row, numbering continues from the highest (no reuse)', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { id: '1BY23CS002' });
  reg(rt, { id: '1BY23CS003' });
  rt.tab('s-essay').deleteRow(3); // delete KR26-ESY-0002
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
  const row = regRow(rt, 2, 'f-debate');
  assert.equal(row[2], 'faculty');
  assert.equal(row[4], 'EMP1042');
  assert.equal(row[6], '');
});
t('team registration stores members_json and member_ids', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post(hunt).ok, true);
  const row = regRow(rt, 2, 's-treasure-hunt');
  assert.equal(row[9], 'Kannada Kalpa');
  assert.deepEqual(JSON.parse(row[10] ?? ''), hunt.members);
  assert.equal(row[11], '1BY23CS011,1BY23CS012,1BY23CS013');
});
t('"Other" department is stored as "Other: <text>"', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt, { department: 'Other', departmentOther: 'Robotics' }).ok, true);
  assert.equal(regRow(rt, 2)[5], 'Other: Robotics');
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

console.log('\nRegister — any USN format is accepted (no college/format check)');
t("another college's USN 1TD24CS001 registers, and the duplicate check still catches it", () => {
  const rt = createOpenRuntime();
  const r = reg(rt, { id: '1TD24CS001' });
  assert.equal(r.ok, true);
  assert.equal(regRow(rt, 2)[4], '1TD24CS001');
  assert.deepEqual(reg(rt, { id: ' 1td24 cs001 ', name: 'Someone Else' }), { ok: false, code: 'DUPLICATE', regId: r.regId });
});
t('an odd value "abc-123" registers (stored as ABC-123), and "ABC - 123" is caught as a duplicate', () => {
  const rt = createOpenRuntime();
  const r = reg(rt, { id: 'abc-123' });
  assert.equal(r.ok, true);
  assert.equal(regRow(rt, 2)[4], 'ABC-123');
  assert.deepEqual(reg(rt, { id: 'ABC - 123', name: 'Someone Else' }), { ok: false, code: 'DUPLICATE', regId: r.regId });
});
t('exactly 20 characters accepted; inner spaces removed before the length check', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt, { id: 'A'.repeat(20) }).ok, true);
  assert.equal(reg(rt, { id: `${'B'.repeat(10)}   ${'B'.repeat(10)}` }).ok, true);
});
t('team members with any USN format register and are duplicate-checked', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post({ ...hunt, id: '1TD24CS001', members: crew({ name: 'Ravi K', id: 'abc-123', phone: '9845011111' }) }).ok, true);
  assert.match(regRow(rt, 2, 's-treasure-hunt')[11] ?? '', /^ABC-123,/);
  const r = rt.post({ ...hunt, id: 'xyz 9', members: crew({ name: 'Meera S', id: 'ABC-123', phone: '9845022222' }) });
  assert.deepEqual(r, { ok: false, code: 'DUPLICATE', regId: 'KR26-TRH-0001' });
  assert.equal(rt.post({ ...hunt, id: 'xyz 9', members: crew({ name: 'Meera S', id: '1td24cs001', phone: '9845022222' }) }).code, 'DUPLICATE');
});
t('lookup works with a non-BMSIT USN', () => {
  const rt = createOpenRuntime();
  reg(rt, { id: '1TD24CS001' });
  assert.deepEqual(rt.post({ action: 'lookup', id: '1td24cs001', phone: '9845012345' }), {
    ok: true,
    passes: [{ regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao' }],
  });
});
t('client isValidId and Code.gs validId_ agree for student USNs', () => {
  const server = createOpenRuntime().ctx.validId_ as (s: string, c: string) => boolean;
  for (const raw of ['1TD24CS001', 'abc-123', '1BY23CS001', 'X'.repeat(20), 'X'.repeat(21), '', 'ಕನ್ನಡ', '#/!']) {
    const s = normId(raw);
    assert.equal(server(s, 'students'), isValidId(s, 'students'), `validId(${JSON.stringify(raw)})`);
  }
});

console.log('\nRegister — DUPLICATE (per event, across all team member IDs)');
t('same USN again for the same event → DUPLICATE with the existing regId', () => {
  const rt = createOpenRuntime();
  reg(rt);
  assert.deepEqual(reg(rt, { id: ' 1by23cs001 ', name: 'Someone Else' }), { ok: false, code: 'DUPLICATE', regId: 'KR26-ESY-0001' });
});
t('new registrant who is already a member of another team → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  const r = rt.post({ ...hunt, id: '1BY23CS011', members: crew({ name: 'Meera S', id: '1BY23CS020', phone: '9845022222' }) });
  assert.deepEqual(r, { ok: false, code: 'DUPLICATE', regId: 'KR26-TRH-0001' });
});
t('new team containing an existing registrant as a member → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  const r = rt.post({ ...hunt, id: '1BY23CS030', members: crew({ name: 'Ravi K', id: '1BY23CS010', phone: '9845011111' }) });
  assert.equal(r.code, 'DUPLICATE');
});
t('new team sharing only a member with an existing team → DUPLICATE', () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  const r = rt.post({ ...hunt, id: '1BY23CS040', members: crew({ name: 'Ravi K', id: '1by23cs011', phone: '9845011111' }) });
  assert.equal(r.code, 'DUPLICATE');
});
t('faculty team member employee IDs are duplicate-checked too', () => {
  const rt = createOpenRuntime();
  const fac = {
    ...base,
    eventId: 'f-group-singing',
    id: 'EMP1',
    teamName: 'Gaana',
    // Group Singing needs 6–12 people: the registrant + 5 members.
    members: [{ name: 'Asha', id: 'EMP2', phone: '9845000002' }, { name: 'Bindu', id: 'EMP3', phone: '9845000003' }, ...membersFor(4, 'EMPA')],
  };
  assert.equal(rt.post(fac).ok, true);
  const r = rt.post({ ...fac, id: 'EMP9', members: [{ name: 'Chetan', id: 'emp3', phone: '9845000009' }, { name: 'Divya', id: 'EMP8', phone: '9845000008' }, ...membersFor(4, 'EMPB')] });
  assert.equal(r.code, 'DUPLICATE');
});
console.log('\nRegister — CLOSED / deadline (no seat limit exists)');
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
  assert.equal(st(rt).events['s-essay']?.isOpen, false);
});
t('closing one event with is_open does not affect the others; reopening works again', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'is_open', 'FALSE');
  assert.equal(st(rt).events['s-essay']?.isOpen, false);
  assert.equal(st(rt).events['s-poem']?.isOpen, true);
  assert.equal(reg(rt, { eventId: 's-poem' }).ok, true);
  rt.setEventField('s-essay', 'is_open', 'TRUE');
  assert.equal(reg(rt).ok, true);
});
t('an event is open until its Sheet deadline: the status flips to closed once the deadline passes', () => {
  const rt = createOpenRuntime();
  assert.equal(st(rt).events['s-essay']?.isOpen, true);
  rt.setEventField('s-essay', 'deadline_iso', '2020-01-01T00:00:00+05:30');
  assert.equal(st(rt).events['s-essay']?.isOpen, false);
});
t('300 registrations for one event all succeed (there is no cap) with sequential reg IDs', () => {
  const rt = createOpenRuntime();
  for (let i = 1; i <= 300; i++) {
    const r = reg(rt, { id: `1BY23CS${String(i).padStart(3, '0')}`, phone: `98450${String(10000 + i)}` });
    assert.equal(r.ok, true, `registration #${i}: ${JSON.stringify(r)}`);
    assert.equal(r.regId, `KR26-ESY-${String(i).padStart(4, '0')}`);
  }
  assert.equal(rt.countRegs('s-essay'), 300);
  assert.equal(rt.tab('s-essay').getLastRow(), 301);
  assert.equal(st(rt).events['s-essay']?.registeredCount, 300);
  assert.equal(st(rt).events['s-essay']?.isOpen, true);
  assert.equal(rt.post({ action: 'lookup', id: '1BY23CS300', phone: '9845010300' }).ok, true);
});

console.log('\nRegister — VALIDATION (server re-checks everything)');
const cases: [string, Record<string, unknown>, string][] = [
  ['honeypot filled', { website: 'http://spam' }, 'form'],
  ['submitted 1.2 s after opening the form', { elapsedMs: 1200 }, 'form'],
  ['elapsedMs missing', { elapsedMs: undefined }, 'form'],
  ['unknown event', { eventId: 'x-rap-battle' }, 'eventId'],
  ['name with digits', { name: 'R2D2' }, 'name'],
  ['name one char', { name: 'A' }, 'name'],
  ['USN empty', { id: '   ' }, 'id'],
  ['USN longer than 20 characters', { id: '1BY23CS0011BY23CS0011' }, 'id'],
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
    assert.equal(ids(rt).reduce((n, id) => n + rt.countRegs(id), 0), 0, 'nothing written to any tab');
  });
}
t('MBA semester 3 accepted', () => assert.equal(reg(createOpenRuntime(), { department: 'MBA', semester: 3 }).ok, true));
t('Kannada name with conjuncts accepted (ಶ್ರೀನಿವಾಸ್ ಕೆ.)', () => assert.equal(reg(createOpenRuntime(), { name: 'ಶ್ರೀನಿವಾಸ್ ಕೆ.' }).ok, true));
t('team: too few members (Group Dance min 4 incl. registrant: 3 people) → members', () => {
  const r = createOpenRuntime().post({ ...hunt, eventId: 's-group-dance', members: hunt.members.slice(0, 2) });
  assert.deepEqual(r, { ok: false, code: 'VALIDATION', field: 'members' });
});
t('team: Group Dance accepts 4 and 12 people (registrant included), rejects 13', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post({ ...hunt, eventId: 's-group-dance', id: 'GD4', members: membersFor(4, 'GDA') }).ok, true);
  assert.equal(rt.post({ ...hunt, eventId: 's-group-dance', id: 'GD12', members: membersFor(12, 'GDB') }).ok, true);
  assert.equal(rt.post({ ...hunt, eventId: 's-group-dance', id: 'GD13', members: membersFor(13, 'GDC') }).field, 'members');
});
t('team: too many members (Treasure Hunt exactly 4) → members', () => {
  const r = createOpenRuntime().post({ ...hunt, members: [...hunt.members, { name: 'Extra', id: '1BY23CS014', phone: '9845011112' }] });
  assert.equal(r.field, 'members');
});
t('team: exact size — Rangoli needs exactly 5: 4 and 6 rejected, 5 accepted', () => {
  const rt = createOpenRuntime();
  const rangoli = { ...hunt, eventId: 's-rangoli' };
  assert.equal(rt.post({ ...rangoli, members: membersFor(4, 'RGA') }).field, 'members');
  assert.equal(rt.post({ ...rangoli, members: membersFor(6, 'RGB') }).field, 'members');
  const ok = rt.post({ ...rangoli, members: membersFor(5, 'RGC') });
  assert.equal(ok.regId, 'KR26-RGL-0001');
});
t('team: Group Singing (students) now needs 6–12 people: 5 rejected, 6 accepted', () => {
  const rt = createOpenRuntime();
  const sing = { ...hunt, eventId: 's-group-singing' };
  assert.equal(rt.post({ ...sing, members: membersFor(5, 'GSA') }).field, 'members');
  assert.equal(rt.post({ ...sing, members: membersFor(6, 'GSB') }).ok, true);
});
t('Quiz is individual now: no team name needed, and members sent anyway → members', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt, { eventId: 's-quiz' }).regId, 'KR26-QIZ-0001');
  assert.equal(rt.post({ ...hunt, eventId: 's-quiz', id: '1BY23CS050', members: hunt.members.slice(0, 1) }).field, 'members');
});
t('team: duplicate USN inside the team → members.0.id', () => {
  const r = createOpenRuntime().post({ ...hunt, members: crew({ name: 'Ravi K', id: '1BY23CS010', phone: '9845011111' }) });
  assert.deepEqual(r, { ok: false, code: 'VALIDATION', field: 'members.0.id' });
});
t('team: member USN longer than 20 characters → members.0.id', () => {
  const r = createOpenRuntime().post({ ...hunt, members: crew({ name: 'Ravi K', id: 'X'.repeat(21), phone: '9845011111' }) });
  assert.equal(r.field, 'members.0.id');
});
t('team: empty member USN → members.0.id', () => {
  const r = createOpenRuntime().post({ ...hunt, members: crew({ name: 'Ravi K', id: ' ', phone: '9845011111' }) });
  assert.equal(r.field, 'members.0.id');
});
t('team: missing team name → teamName', () => {
  assert.equal(createOpenRuntime().post({ ...hunt, teamName: '' }).field, 'teamName');
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
  assert.equal(rt.tab('s-essay').hasFormula(), false);
  assert.match(regRow(rt, 2)[8] ?? '', /^=hyperlink/);
  const r2 = reg(rt, { id: '1BY23CS002', email: '+cmd@x.co' });
  assert.equal(r2.ok, true);
  assert.equal(regRow(rt, 3)[8], '+cmd@x.co');
  assert.equal(rt.tab('s-essay').hasFormula(), false);
});
t('setupSheet writes the Events tab as plain text too (deadline stays ISO)', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.eventField('s-essay', 'deadline_iso'), '2026-11-18T23:59:00+05:30');
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
t('lock not obtainable within 20 s → SERVER/LOCK_TIMEOUT, nothing written', () => {
  const rt = createOpenRuntime();
  rt.lock.busy = true;
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'LOCK_TIMEOUT' });
  assert.equal(rt.countRegs('s-essay'), 0);
});
t('Sheet failure inside the lock → SERVER/UNEXPECTED, and the lock is still released', () => {
  const rt = createOpenRuntime();
  rt.tab('s-essay').throwOnAccess = true;
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'UNEXPECTED' });
  assert.equal(rt.lock.held, false);
  assert.equal(rt.lock.released, 1);
});
t('lock is held while the row is appended (duplicate check, numbering and write are atomic)', () => {
  const rt = createOpenRuntime();
  const sheet = rt.tab('s-essay');
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
t('lookup searches every event tab and returns all passes found (individual + team, across tabs)', () => {
  const rt = createOpenRuntime();
  reg(rt); // Essay, Ananya 1BY23CS001 / 9845012345
  reg(rt, { eventId: 's-poem' });
  reg(rt, { eventId: 'f-debate', id: 'EMP9', phone: '9000000001' }); // someone else, other tab
  rt.post({ ...hunt, id: '1BY23CS001', phone: '9845012345' });
  rt.post({ ...base, eventId: 's-painting', id: '1BY23CS077', phone: '9845077777' });
  const r = rt.post({ action: 'lookup', id: '1by23cs001', phone: '9845012345' }) as unknown as { ok: boolean; passes: { regId: string; event: string; name: string }[] };
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.passes.map((p) => `${p.event}:${p.regId}`),
    ['s-essay:KR26-ESY-0001', 's-poem:KR26-POM-0001', 's-treasure-hunt:KR26-TRH-0001'],
  );
  assert.ok(r.passes.every((p) => Object.keys(p).sort().join() === 'event,name,regId'), 'only regId, event, name');
  // a team member found in the Treasure Hunt tab with their own phone
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS011', phone: '9845011111' }), {
    ok: true,
    passes: [{ regId: 'KR26-TRH-0001', event: 's-treasure-hunt', name: 'Ravi K' }],
  });
});
t('lookup survives one broken tab and still finds passes in the others', () => {
  const rt = createOpenRuntime();
  reg(rt);
  reg(rt, { eventId: 's-poem' });
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-essay')), 1);
  const r = rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845012345' }) as unknown as { ok: boolean; passes: { event: string }[] };
  assert.equal(r.ok, true);
  assert.deepEqual(r.passes.map((p) => p.event), ['s-poem']);
});
t('team member can look up with their own ID + phone', () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS011', phone: '9845011111' }), {
    ok: true,
    passes: [{ regId: 'KR26-TRH-0001', event: 's-treasure-hunt', name: 'Ravi K' }],
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

console.log('\nOne tab per event');
t('a registration lands only in its own event tab — every other tab stays untouched', () => {
  const rt = createOpenRuntime();
  const others = ids(rt).filter((id) => id !== 's-essay');
  const before = Object.fromEntries(others.map((id) => [id, JSON.stringify([rt.tab(id).cells, rt.tab(id).formats])]));
  assert.equal(reg(rt).ok, true);
  assert.equal(rt.tab('s-essay').getLastRow(), 2);
  assert.equal(regRow(rt, 2)[1], 'KR26-ESY-0001');
  for (const id of others) assert.equal(JSON.stringify([rt.tab(id).cells, rt.tab(id).formats]), before[id], `${id} untouched`);
  assert.equal(rt.events().getLastRow(), 13, 'Events tab gets no registration rows');
});
t('two events → two separate rows in two separate tabs (no shared tab)', () => {
  const rt = createOpenRuntime();
  assert.equal(reg(rt).regId, 'KR26-ESY-0001');
  assert.equal(reg(rt, { eventId: 's-poem' }).regId, 'KR26-POM-0001');
  assert.equal(rt.tab('s-essay').getLastRow(), 2);
  assert.equal(rt.tab('s-poem').getLastRow(), 2);
  assert.equal(regRow(rt, 2, 's-essay')[1], 'KR26-ESY-0001');
  assert.equal(regRow(rt, 2, 's-poem')[1], 'KR26-POM-0001');
  assert.notEqual(rt.tab('s-essay'), rt.tab('s-poem'));
  assert.equal(rt.ss.getSheetByName('Registrations'), null);
});
t('the same ID can register for two different events, but a second time for the same event is DUPLICATE', () => {
  const rt = createOpenRuntime();
  const first = reg(rt);
  assert.equal(reg(rt, { eventId: 's-poem' }).ok, true);
  assert.equal(reg(rt, { eventId: 's-painting' }).ok, true);
  assert.deepEqual(reg(rt), { ok: false, code: 'DUPLICATE', regId: first.regId });
  assert.deepEqual(reg(rt, { eventId: 's-poem' }), { ok: false, code: 'DUPLICATE', regId: 'KR26-POM-0001' });
  assert.equal(rt.countRegs('s-essay'), 1);
  assert.equal(rt.countRegs('s-poem'), 1);
});
t('a team member of one event may register on their own for another event', () => {
  const rt = createOpenRuntime();
  assert.equal(rt.post(hunt).ok, true);
  assert.equal(reg(rt, { id: '1BY23CS011', name: 'Ravi K' }).ok, true); // Ravi is in a Treasure Hunt team and registers for Essay
});
t('reg ID numbering is per tab: busy events do not advance the others', () => {
  const rt = createOpenRuntime();
  for (let i = 1; i <= 5; i++) assert.equal(reg(rt, { id: `1BY23CS00${i}` }).regId, `KR26-ESY-000${i}`);
  assert.equal(reg(rt, { eventId: 's-poem' }).regId, 'KR26-POM-0001');
  assert.equal(rt.post(hunt).regId, 'KR26-TRH-0001');
  assert.equal(reg(rt, { id: '1BY23CS006' }).regId, 'KR26-ESY-0006');
  assert.equal(reg(rt, { eventId: 's-poem', id: '1BY23CS002' }).regId, 'KR26-POM-0002');
});
t('numbering uses the highest number IN THAT TAB (a hand-added higher row is respected, other tabs ignored)', () => {
  const rt = createOpenRuntime();
  rt.tab('s-poem').getRange(2, 1, 1, 13).setValues([['t', 'KR26-POM-0041', 'students', 'X Y', 'OLD1', 'CSE', '3', '9845000000', 'a@b.co', '', '', '', 'FALSE']]);
  assert.equal(reg(rt, { eventId: 's-poem' }).regId, 'KR26-POM-0042');
  assert.equal(reg(rt).regId, 'KR26-ESY-0001');
});
t('duplicate checks cover the registrant and all members, only inside the event tab', () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  // same people in a different event are fine
  assert.equal(rt.post({ ...hunt, eventId: 's-group-dance', teamName: 'Hunters' }).ok, true);
  // ...but not again in the Treasure Hunt
  assert.equal(rt.post({ ...hunt, id: '1BY23CS099' }).code, 'DUPLICATE'); // members 1BY23CS011–13 already in the hunt team
});
t('a coordinator can rename a tab: update the sheet_name cell and registrations follow the renamed tab', () => {
  const rt = createOpenRuntime();
  reg(rt);
  rt.tab('s-essay').setName('Essay – final list');
  rt.setEventField('s-essay', 'sheet_name', 'Essay – final list');
  const r = reg(rt, { id: '1BY23CS002' });
  assert.equal(r.regId, 'KR26-ESY-0002');
  assert.equal(rt.ss.getSheetByName('Essay – final list')?.getLastRow(), 3);
  assert.equal(rt.ss.getSheetByName('ESY – Essay Writing'), null);
  assert.equal(rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845012345' }).ok, true);
  setup(rt); // setupSheet must follow the rename, not re-create "ESY – Essay Writing"
  assert.equal(rt.ss.getSheetByName('ESY – Essay Writing'), null);
});
t('renaming the tab WITHOUT updating sheet_name → SERVER and nothing is written anywhere', () => {
  const rt = createOpenRuntime();
  rt.tab('s-essay').setName('Essay – renamed but cell not updated');
  const before = rt.ss.snapshot();
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_MISSING:s-essay' });
  assert.equal(rt.ss.snapshot(), before);
  assert.equal(rt.lock.held, false);
});

console.log('\nMissing / broken tabs never write to the wrong place');
t('missing event tab → SERVER, a clear log message, and no row anywhere', () => {
  const rt = createOpenRuntime();
  const logs: string[] = [];
  (rt.ctx.console as { error: (m: string) => void }).error = (m: string) => logs.push(String(m));
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-essay')), 1);
  const before = rt.ss.snapshot();
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_MISSING:s-essay' });
  assert.equal(rt.ss.snapshot(), before, 'no cell anywhere changed');
  assert.ok(logs.some((l) => /tab "ESY – Essay Writing" not found/.test(l) && /s-essay/.test(l)), `log: ${logs.join(' | ')}`);
  assert.equal(rt.lock.held, false);
  // the other events keep working
  assert.equal(reg(rt, { eventId: 's-poem' }).ok, true);
});
t('a missing tab shows as closed in the status (so the site does not offer a broken Register button)', () => {
  const rt = createOpenRuntime();
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-essay')), 1);
  const s1 = st(rt);
  assert.equal(s1.events['s-essay']?.isOpen, false);
  assert.equal(s1.events['s-poem']?.isOpen, true);
});
t('empty sheet_name → SERVER, nothing written', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'sheet_name', '');
  const before = rt.ss.snapshot();
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_SHEET_NAME_MISSING:s-essay' });
  assert.equal(rt.ss.snapshot(), before);
});
t('sheet_name pointing at another event\'s tab (or at "Events") → SERVER, nothing written', () => {
  const rt = createOpenRuntime();
  rt.setEventField('s-essay', 'sheet_name', 'POM – Poem');
  const before = rt.ss.snapshot();
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_SHARED:s-essay' });
  // both are ambiguous now
  assert.deepEqual(reg(rt, { eventId: 's-poem', id: '1BY23CS002' }), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_SHARED:s-poem' });
  assert.equal(rt.ss.snapshot(), before);
  rt.setEventField('s-essay', 'sheet_name', 'Events');
  const beforeEvents = rt.ss.snapshot(); // after the cell edit itself
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_RESERVED:s-essay' });
  assert.equal(rt.ss.snapshot(), beforeEvents);
  assert.equal(rt.events().getLastRow(), 13);
});
t('a tab whose header row is not the registration layout is never written to', () => {
  const rt = createOpenRuntime();
  rt.tab('s-essay').getRange(1, 2).setValues([['something_else']]);
  const before = rt.ss.snapshot();
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'EVENT_TAB_COLUMN_MISSING:s-essay:reg_id' });
  assert.equal(rt.ss.snapshot(), before);
});

console.log('\nSERVER reasons (machine-readable, safe, logged)');
type Resp = { ok: boolean; code?: string; reason?: string };
/** Captures console.error output of Code.gs. */
const captureErrors = (rt: GasRuntime) => {
  const logs: string[] = [];
  (rt.ctx.console as { error: (m: string) => void }).error = (m: string) => logs.push(String(m));
  return logs;
};
const lookupBody = { action: 'lookup', id: '1BY23CS001', phone: '9845012345' };
const SAFE_REASON = /^[A-Z_]+(:[A-Za-z0-9_.-]+)*$/;
t('no Events tab → EVENTS_TAB_MISSING on status, register and lookup; nothing is created or written', () => {
  const rt = createGasRuntime(); // setupSheet() never ran
  const logs = captureErrors(rt);
  const want = { ok: false, code: 'SERVER', reason: 'EVENTS_TAB_MISSING' };
  assert.deepEqual(rt.get({ action: 'status' }), want);
  assert.deepEqual(reg(rt), want);
  assert.deepEqual(rt.post(lookupBody), want);
  assert.equal(rt.ss.getSheets().length, 0);
  assert.equal(rt.lock.held, false);
  assert.equal(logs.filter((l) => /reason=EVENTS_TAB_MISSING/.test(l)).length, 3, logs.join(' | '));
});
for (const col of ['id', 'sheet_name', 'deadline_iso', 'is_open']) {
  t(`Events tab without the "${col}" column → EVENTS_COLUMN_MISSING:${col} on status, register and lookup`, () => {
    const rt = createOpenRuntime();
    const headers = rt.events().getRange(1, 1, 1, rt.events().getLastColumn()).getDisplayValues()[0] ?? [];
    rt.events().getRange(1, headers.indexOf(col) + 1).setValues([['renamed_by_mistake']]);
    rt.cache.clear();
    const before = rt.ss.snapshot();
    const want = { ok: false, code: 'SERVER', reason: `EVENTS_COLUMN_MISSING:${col}` };
    assert.deepEqual(rt.get({ action: 'status' }), want);
    assert.deepEqual(reg(rt), want);
    assert.deepEqual(rt.post(lookupBody), want);
    assert.equal(rt.ss.snapshot(), before, 'nothing written anywhere');
  });
}
t('status: one broken event tab is not a SERVER error — that event is closed, the rest stay open (reason only in the log)', () => {
  const rt = createOpenRuntime();
  const logs = captureErrors(rt);
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-essay')), 1);
  const s = st(rt);
  assert.equal(s.ok, true);
  assert.equal(s.events['s-essay']?.isOpen, false);
  assert.equal(s.events['s-poem']?.isOpen, true);
  assert.ok(logs.some((l) => /reason=EVENT_TAB_MISSING:s-essay/.test(l)), logs.join(' | '));
});
t('status: an unexpected exception → SERVER/UNEXPECTED; the real message is logged but never sent', () => {
  const rt = createOpenRuntime();
  const logs = captureErrors(rt);
  rt.events().throwOnAccess = true;
  rt.cache.clear();
  const r = rt.get({ action: 'status' });
  assert.deepEqual(r, { ok: false, code: 'SERVER', reason: 'UNEXPECTED' });
  assert.ok(logs.some((l) => /reason=UNEXPECTED/.test(l) && /Service Spreadsheets failed/.test(l) && /where=status/.test(l)), logs.join(' | '));
  assert.doesNotMatch(JSON.stringify(r), /Spreadsheets|simulated|Error|at /);
});
t('register: an unexpected exception → UNEXPECTED, real message only in the log, no stack or sheet content in the answer', () => {
  const rt = createOpenRuntime();
  reg(rt, { id: '1BY23CS099', name: 'Secret Person' });
  const logs = captureErrors(rt);
  rt.tab('s-essay').throwOnAccess = true;
  const r = reg(rt);
  assert.deepEqual(r, { ok: false, code: 'SERVER', reason: 'UNEXPECTED' });
  assert.deepEqual(Object.keys(r).sort(), ['code', 'ok', 'reason']);
  assert.ok(logs.some((l) => /reason=UNEXPECTED/.test(l) && /where=register/.test(l) && /simulated/.test(l)), logs.join(' | '));
  assert.doesNotMatch(JSON.stringify(r), /Secret|1BY23|simulated|Spreadsheets/);
});
t('lookup: an unexpected exception → SERVER/UNEXPECTED', () => {
  const rt = createOpenRuntime();
  captureErrors(rt);
  rt.events().throwOnAccess = true;
  assert.deepEqual(rt.post(lookupBody), { ok: false, code: 'SERVER', reason: 'UNEXPECTED' });
});
t('lookup: a broken event tab is skipped (logged), not a SERVER error', () => {
  const rt = createOpenRuntime();
  const logs = captureErrors(rt);
  reg(rt, { eventId: 's-poem' });
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-essay')), 1);
  const r = rt.post(lookupBody) as unknown as { ok: boolean; passes: unknown[] };
  assert.equal(r.ok, true);
  assert.equal(r.passes.length, 1);
  assert.ok(logs.some((l) => /reason=EVENT_TAB_MISSING:s-essay/.test(l)));
});
t('LOCK_TIMEOUT is logged with console.error and the lock was never held', () => {
  const rt = createOpenRuntime();
  const logs = captureErrors(rt);
  rt.lock.busy = true;
  assert.deepEqual(reg(rt), { ok: false, code: 'SERVER', reason: 'LOCK_TIMEOUT' });
  assert.ok(logs.some((l) => /reason=LOCK_TIMEOUT/.test(l) && /where=register/.test(l)), logs.join(' | '));
  assert.equal(rt.lock.held, false);
});
t('serverError_ only lets well-formed reason codes out; anything else becomes UNEXPECTED (and is logged)', () => {
  const rt = createOpenRuntime();
  const logs = captureErrors(rt);
  const se = rt.ctx.serverError_ as (e: unknown, where: string) => Resp;
  const fail = rt.ctx.fail_ as (reason: string, detail?: string) => Error;
  // (objects built inside the VM have another realm's prototype — compare as JSON)
  assert.equal(JSON.stringify(se(fail('EVENT_TAB_MISSING:s-essay'), 'x')), '{"ok":false,"code":"SERVER","reason":"EVENT_TAB_MISSING:s-essay"}');
  for (const bad of ['has spaces', 'lower_case', 'TOKEN=abc123 secret!', 'X'.repeat(5) + '\n' + 'stack', '', 'A:b c']) {
    assert.equal(se(fail(bad, 'detail'), 'x').reason, 'UNEXPECTED', JSON.stringify(bad));
  }
  assert.equal(se(new Error('plain'), 'x').reason, 'UNEXPECTED');
  assert.equal(se('a string thrown', 'x').reason, 'UNEXPECTED');
  assert.equal(se(null, 'x').reason, 'UNEXPECTED');
  assert.equal(se({ reason: 42 }, 'x').reason, 'UNEXPECTED');
  assert.ok(logs.length >= 10 && logs.every((l) => /^SERVER reason=/.test(l)), logs.join(' | '));
});
t('every reason a real failure can produce is machine-readable and secret-free', () => {
  const seen = new Set<string>();
  const run = (rt: GasRuntime, fn: () => Resp) => {
    captureErrors(rt);
    const r = fn();
    assert.equal(r.code, 'SERVER');
    assert.match(r.reason ?? '', SAFE_REASON);
    seen.add((r.reason ?? '').split(':')[0] ?? '');
  };
  let rt = createGasRuntime(); // no Events tab
  run(rt, () => rt.get({ action: 'status' }));
  rt = createOpenRuntime();
  rt.setEventField('s-essay', 'sheet_name', '');
  run(rt, () => reg(rt));
  rt = createOpenRuntime();
  rt.lock.busy = true;
  run(rt, () => reg(rt));
  rt = createOpenRuntime();
  rt.tab('s-essay').throwOnAccess = true;
  run(rt, () => reg(rt));
  assert.deepEqual([...seen].sort(), ['EVENTS_TAB_MISSING', 'EVENT_SHEET_NAME_MISSING', 'LOCK_TIMEOUT', 'UNEXPECTED']);
});
t('mapping never changes non-SERVER answers: VALIDATION, CLOSED and DUPLICATE carry no SERVER reason', () => {
  const rt = createOpenRuntime();
  assert.deepEqual(reg(rt, { phone: '1' }), { ok: false, code: 'VALIDATION', field: 'phone' });
  const first = reg(rt);
  assert.deepEqual(reg(rt), { ok: false, code: 'DUPLICATE', regId: first.regId });
  rt.setEventField('s-poem', 'is_open', 'FALSE');
  assert.deepEqual(reg(rt, { eventId: 's-poem' }), { ok: false, code: 'CLOSED', reason: 'NOT_OPEN' });
});

console.log('\nConfig.gs version & setupSheet reporting');
const captureLogs = (rt: GasRuntime) => {
  const logs: string[] = [];
  const c = rt.ctx.console as { log: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
  c.log = (m: string) => logs.push(String(m));
  c.warn = (m: string) => logs.push(`WARN ${m}`);
  c.error = (m: string) => logs.push(`ERR ${m}`);
  return logs;
};
const cfgOf = (rt: GasRuntime) => rt.ctx.CONFIG as { events: Record<string, unknown> };
const sheetCount = (rt: GasRuntime) => rt.ss.getSheets().length;
t('generated Config.gs: CONFIG_SCHEMA matches Code.gs, CONFIG_VERSION is an 8-hex hash of the config, and the file on disk is up to date', () => {
  const onDisk = readFileSync('apps-script/Config.gs', 'utf8');
  assert.equal(onDisk, buildGasConfigSource(), 'run npm run gas:config');
  const code = readFileSync('apps-script/Code.gs', 'utf8');
  assert.equal(Number(/var EXPECTED_CONFIG_SCHEMA = (\d+);/.exec(code)?.[1]), GAS_CONFIG_SCHEMA);
  const rt = createGasRuntime();
  assert.match(String(rt.ctx.CONFIG_VERSION), /^[0-9a-f]{8}$/);
  assert.equal(rt.ctx.CONFIG_SCHEMA, GAS_CONFIG_SCHEMA);
  assert.equal(rt.ctx.CONFIG_VERSION, computeConfigVersion(JSON.parse(JSON.stringify(rt.ctx.CONFIG))));
  assert.equal(Object.keys(cfgOf(rt).events).length, 12);
});
t('CONFIG_VERSION changes when an event, a deadline or a rule changes, and is stable otherwise', () => {
  const rt = createGasRuntime();
  const base = JSON.parse(JSON.stringify(rt.ctx.CONFIG));
  const v = computeConfigVersion(base);
  assert.equal(computeConfigVersion(JSON.parse(JSON.stringify(base))), v);
  const withoutEvent = JSON.parse(JSON.stringify(base));
  delete withoutEvent.events['s-rangoli'];
  const otherDeadline = JSON.parse(JSON.stringify(base));
  otherDeadline.events['s-essay'].deadline = '2026-11-17T23:59:00+05:30';
  const otherRule = JSON.parse(JSON.stringify(base));
  otherRule.rules.phone.pattern = '^[0-9]{10}$';
  for (const changed of [withoutEvent, otherDeadline, otherRule]) assert.notEqual(computeConfigVersion(changed), v);
});
t('status includes configVersion (= CONFIG_VERSION), also when served from the cache', () => {
  const rt = createOpenRuntime();
  const first = st(rt);
  assert.equal((first as unknown as { configVersion: string }).configVersion, rt.ctx.CONFIG_VERSION);
  const cached = rt.get({ action: 'status' }) as unknown as { configVersion: string };
  assert.equal(cached.configVersion, rt.ctx.CONFIG_VERSION);
});
t('setupSheet logs "Config <version> … lists 12 events", then one line per event: Events row ADDED + tab CREATED', () => {
  const rt = createGasRuntime();
  const logs = captureLogs(rt);
  setup(rt);
  assert.match(logs[0] ?? '', new RegExp(`^Config ${rt.ctx.CONFIG_VERSION} \\(schema ${GAS_CONFIG_SCHEMA}\\) lists 12 events: s-essay, s-poem`));
  for (const id of ids(rt)) {
    const line = logs.find((l) => l.startsWith(`${id}: `));
    assert.ok(line && /Events row ADDED/.test(line) && /tab "[^"]+" CREATED/.test(line), `${id}: ${line}`);
  }
  const last = logs[logs.length - 1] ?? '';
  assert.match(last, /^Setup complete\. Config [0-9a-f]{8}: 12 events; 12 Events row\(s\) added; 12 event tab\(s\) created \(.*\), 0 already existed\./);
});
t('setupSheet seeds the Events tab from Config.gs: one row per event with id, code, name_en, sheet_name, deadline_iso, is_open TRUE', () => {
  const rt = createGasRuntime();
  setup(rt);
  assert.equal(rt.events().getLastRow(), 13);
  const cfg = JSON.parse(JSON.stringify(rt.ctx.CONFIG)) as { events: Record<string, { code: string; name: { en: string }; sheetName: string; deadline: string }> };
  for (const [id, e] of Object.entries(cfg.events)) {
    assert.equal(rt.eventField(id, 'code'), e.code);
    assert.equal(rt.eventField(id, 'name_en'), e.name.en);
    assert.equal(rt.eventField(id, 'sheet_name'), e.sheetName);
    assert.equal(rt.eventField(id, 'deadline_iso'), e.deadline);
    assert.equal(rt.eventField(id, 'is_open'), 'TRUE');
    assert.equal(rt.tab(id).getRange(1, 1, 1, 13).getDisplayValues()[0]?.join('|'), TAB_HEADERS);
  }
});
t('re-running setupSheet reports "already there / already existed" for every event and changes nothing', () => {
  const rt = createGasRuntime();
  setup(rt);
  reg(rt);
  const before = rt.ss.snapshot();
  const logs = captureLogs(rt);
  setup(rt);
  assert.equal(rt.ss.snapshot(), before);
  for (const id of ids(rt)) {
    const line = logs.find((l) => l.startsWith(`${id}: `));
    assert.ok(line && /Events row already there/.test(line) && /already existed/.test(line), `${id}: ${line}`);
  }
  assert.match(logs[logs.length - 1] ?? '', /0 Events row\(s\) added; 0 event tab\(s\) created, 12 already existed\./);
});
t('a partly set-up spreadsheet: only the missing tab is added, and it is reported as such', () => {
  const rt = createGasRuntime();
  setup(rt);
  rt.ss.sheets.splice(rt.ss.sheets.indexOf(rt.tab('s-poem')), 1);
  const logs = captureLogs(rt);
  setup(rt);
  assert.ok(logs.some((l) => /^s-poem: .*CREATED/.test(l)));
  assert.ok(logs.some((l) => /^s-essay: .*already existed/.test(l)));
  assert.match(logs[logs.length - 1] ?? '', /1 event tab\(s\) created \(POM – Poem\), 11 already existed/);
});
t('setupSheet with an EMPTY Config.gs events list throws "Config.gs has no events — paste the latest Config.gs" and touches nothing', () => {
  const rt = createGasRuntime();
  cfgOf(rt).events = {};
  assert.throws(() => setup(rt), /Config\.gs has no events — paste the latest Config\.gs/);
  assert.equal(sheetCount(rt), 0, 'not even the Events tab is created');
  const logs = captureLogs(rt);
  assert.throws(() => setup(rt), /no events/);
  assert.ok(!logs.some((l) => /Setup complete/.test(l)));
});
t('setupSheet on an existing spreadsheet with empty Config: nothing is changed or deleted', () => {
  const rt = createOpenRuntime();
  reg(rt);
  const before = rt.ss.snapshot();
  cfgOf(rt).events = {};
  assert.throws(() => setup(rt), /no events/);
  assert.equal(rt.ss.snapshot(), before);
});
t('setupSheet throws instead of "Setup complete" when the Events tab ends up without event rows', () => {
  const rt = createGasRuntime();
  const logs = captureLogs(rt);
  rt.ctx.appendByHeader_ = () => undefined; // simulate writes that silently do nothing
  assert.throws(() => setup(rt), /has no sheet_name in the Events tab|Setup failed/);
  assert.ok(!logs.some((l) => /Setup complete/.test(l)));
});
t('setupSheet with a stale schema (Config.gs from another version) → CONFIG_MISMATCH error, nothing created', () => {
  const rt = createGasRuntime();
  rt.ctx.CONFIG_SCHEMA = GAS_CONFIG_SCHEMA - 1;
  assert.throws(() => setup(rt), new Error(`Config.gs is schema ${GAS_CONFIG_SCHEMA - 1} but Code.gs expects schema ${GAS_CONFIG_SCHEMA} — paste the latest Code.gs AND Config.gs together.`));
  assert.equal(sheetCount(rt), 0);
});
t('checkConfig() logs version, schema and event count — and fails on an empty Config', () => {
  const rt = createGasRuntime();
  const logs = captureLogs(rt);
  (rt.ctx.checkConfig as () => void)();
  assert.match(logs[0] ?? '', new RegExp(`^Config\\.gs OK — version [0-9a-f]{8}, schema ${GAS_CONFIG_SCHEMA}, 12 events: s-essay`));
  cfgOf(rt).events = {};
  assert.throws(() => (rt.ctx.checkConfig as () => void)(), /no events/);
});

console.log('\nSERVER reasons CONFIG_MISMATCH / CONFIG_EMPTY');
const breakers: [string, string, (rt: GasRuntime) => void][] = [
  ['Code.gs and Config.gs disagree on the schema', 'CONFIG_MISMATCH', (rt) => void (rt.ctx.CONFIG_SCHEMA = 1)],
  ['an old Config.gs without CONFIG_SCHEMA', 'CONFIG_MISMATCH', (rt) => void (rt.ctx.CONFIG_SCHEMA = undefined)],
  ['an old Config.gs without CONFIG_VERSION', 'CONFIG_MISMATCH', (rt) => void (rt.ctx.CONFIG_VERSION = undefined)],
  ['no CONFIG at all', 'CONFIG_MISMATCH', (rt) => void (rt.ctx.CONFIG = undefined)],
  ['Config.gs with zero events', 'CONFIG_EMPTY', (rt) => void (cfgOf(rt).events = {})],
];
for (const [what, reason, breakIt] of breakers) {
  t(`${what} → status, register and lookup answer SERVER/${reason}; nothing written, no lock taken`, () => {
    const rt = createOpenRuntime();
    reg(rt, { id: '1BY23CS500' }); // one real registration to prove nothing else changes
    const logs = captureLogs(rt);
    const before = rt.ss.snapshot();
    const acquired = rt.lock.acquired;
    breakIt(rt);
    rt.cache.clear();
    const want = { ok: false, code: 'SERVER', reason };
    assert.deepEqual(rt.get({ action: 'status' }), want);
    assert.deepEqual(reg(rt), want);
    assert.deepEqual(rt.post(lookupBody), want);
    assert.equal(rt.ss.snapshot(), before);
    assert.equal(rt.lock.acquired, acquired, 'rejected before taking the lock');
    assert.equal(logs.filter((l) => new RegExp(`reason=${reason}`).test(l)).length, 3, logs.join(' | '));
  });
}
t('a stale status cache cannot hide a broken Config.gs', () => {
  const rt = createOpenRuntime();
  st(rt); // fills the cache
  rt.ctx.CONFIG_SCHEMA = 1;
  assert.deepEqual(rt.get({ action: 'status' }), { ok: false, code: 'SERVER', reason: 'CONFIG_MISMATCH' });
});

console.log('\nWhatsApp group links (Events tab → whatsapp_url)');
const WA = 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv';
const WA2 = 'https://chat.whatsapp.com/ZyXwVuTsRqPoNmLkJiHgFe';
const WA_CHANNEL = 'https://whatsapp.com/channel/0029VaAbCdEfGhIjKlMnOpQr';
const setWa = (rt: GasRuntime, id: string, v: string) => rt.setEventField(id, 'whatsapp_url', v);
type RegOk = { ok: true; regId: string; event: string; name: string; whatsappUrl?: string };
type LookupOk = { ok: true; passes: { regId: string; event: string; name: string; whatsappUrl?: string }[] };

t('a new Events tab has the whatsapp_url column (last), empty for all 12 events and plain text', () => {
  const rt = createGasRuntime();
  setup(rt);
  const headers = rt.events().getRange(1, 1, 1, rt.events().getLastColumn()).getDisplayValues()[0] ?? [];
  assert.equal(headers[headers.length - 1], 'whatsapp_url');
  for (const id of ids(rt)) assert.equal(rt.eventField(id, 'whatsapp_url'), '', id);
  const col = headers.indexOf('whatsapp_url') + 1;
  for (const row of [2, 13, 50]) assert.equal(rt.events().formats[row - 1]?.[col - 1], '@', `row ${row} is plain text`);
});
t('setupSheet adds a missing whatsapp_url column to an existing Events tab without touching any value, and a re-run changes nothing', () => {
  const rt = createGasRuntime();
  const evs = rt.ss.insertSheet('Events');
  evs.getRange(1, 1, 1, 6).setValues([['id', 'code', 'name_en', 'sheet_name', 'deadline_iso', 'is_open']]);
  evs.getRange(2, 1, 1, 6).setValues([['s-essay', 'ESY', 'Essay Writing', 'ESY – Essay Writing', '2026-11-18T23:59:00+05:30', 'FALSE']]);
  evs.getRange(3, 1, 1, 6).setValues([['s-poem', 'POM', 'Poem', 'My renamed poem tab', '2026-11-17T10:00:00+05:30', 'TRUE']]);
  const logs = captureLogs(rt);
  setup(rt);
  const headers = rt.events().getRange(1, 1, 1, rt.events().getLastColumn()).getDisplayValues()[0] ?? [];
  assert.deepEqual(headers, ['id', 'code', 'name_en', 'sheet_name', 'deadline_iso', 'is_open', 'whatsapp_url']);
  assert.equal(rt.eventField('s-essay', 'is_open'), 'FALSE', 'coordinator close kept');
  assert.equal(rt.eventField('s-poem', 'sheet_name'), 'My renamed poem tab');
  assert.equal(rt.eventField('s-poem', 'deadline_iso'), '2026-11-17T10:00:00+05:30');
  assert.equal(rt.eventField('s-essay', 'whatsapp_url'), '');
  assert.ok(logs.some((l) => /Setup complete/.test(l)));
  const before = rt.ss.snapshot();
  setup(rt);
  assert.equal(rt.ss.snapshot(), before);
});
t('setupSheet never fills in or overwrites a whatsapp_url a coordinator pasted', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  setup(rt);
  setup(rt);
  assert.equal(rt.eventField('s-essay', 'whatsapp_url'), WA);
  assert.equal(rt.eventField('s-poem', 'whatsapp_url'), '');
});
t('an Events tab without the (optional) whatsapp_url column still works: register and lookup answer without a link', () => {
  const rt = createOpenRuntime();
  const evs = rt.events();
  const col = (evs.getRange(1, 1, 1, evs.getLastColumn()).getDisplayValues()[0] ?? []).indexOf('whatsapp_url') + 1;
  evs.getRange(1, col).setValues([['notes']]); // column renamed: now there is no whatsapp_url
  const r = reg(rt);
  assert.deepEqual(r, { ok: true, regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao' });
  assert.equal((rt.post(lookupBody) as unknown as LookupOk).passes[0]?.whatsappUrl, undefined);
});

console.log('\nWhatsApp link validation (server = site)');
const VALID: [string, string][] = [
  [WA, WA],
  [`  ${WA}  `, WA],
  [`${WA}?mode=ems_copy_t`, WA],
  [`${WA}/`, WA],
  [`${WA}#join`, WA],
  [WA_CHANNEL, WA_CHANNEL],
  [`${WA_CHANNEL}?mode=r_c`, WA_CHANNEL],
];
const INVALID = [
  '',
  '   ',
  'http://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
  'https://chat.whatsapp.com/',
  'https://chat.whatsapp.com/short',
  'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv/extra',
  'https://chat.whatsapp.com/AbCdEfGhIjKl MnOpQrStUv',
  'https://chat.whatsapp.com/AbCdEfGhIjKlMn../x',
  'https://chat.whatsapp.com.evil.example/AbCdEfGhIjKlMnOpQrStUv',
  'https://evil.example/https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
  'https://user@chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
  'https://chat.whatsapp.com:8080/AbCdEfGhIjKlMnOpQrStUv',
  'https://www.chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
  'https://wa.me/919845012345',
  'https://api.whatsapp.com/send?phone=919845012345',
  'https://whatsapp.com/channel/',
  'https://whatsapp.com/channel/short',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  `${WA} ${WA2}`,
  `https://chat.whatsapp.com/<script>alert(1)</script>`,
  'chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
  'HTTPS://CHAT.WHATSAPP.COM/AbCdEfGhIjKlMnOpQrStUv',
  '12345',
];
t('valid links are accepted and cleaned (trim, ?query, #fragment, trailing slash removed) — Code.gs and the site agree', () => {
  const server = createOpenRuntime().ctx.cleanWhatsappUrl_ as (v: unknown) => string;
  for (const [raw, want] of VALID) {
    assert.equal(server(raw), want, `server ${JSON.stringify(raw)}`);
    assert.equal(cleanWhatsappUrl(raw), want, `client ${JSON.stringify(raw)}`);
  }
});
t('anything else is rejected — Code.gs and the site agree', () => {
  const server = createOpenRuntime().ctx.cleanWhatsappUrl_ as (v: unknown) => string;
  for (const raw of INVALID) {
    assert.equal(server(raw), '', `server ${JSON.stringify(raw)}`);
    assert.equal(cleanWhatsappUrl(raw), null, `client ${JSON.stringify(raw)}`);
  }
  for (const odd of [null, undefined, 42, {}, []]) assert.equal(cleanWhatsappUrl(odd), null);
});

console.log('\nWhatsApp link — who gets to see it');
t('status NEVER contains the link (valid, invalid, or channel), not even as a key — also from the cache', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  setWa(rt, 's-poem', 'https://example.org/not-whatsapp');
  setWa(rt, 's-treasure-hunt', WA_CHANNEL);
  const fresh = st(rt);
  const cached = rt.get({ action: 'status' }) as unknown as typeof fresh;
  for (const s of [fresh, cached]) {
    assert.doesNotMatch(JSON.stringify(s), /whatsapp|AbCdEf|0029Va|example\.org/i);
    assert.deepEqual(Object.keys(s.events['s-essay'] ?? {}).sort(), ['deadline', 'isOpen', 'registeredCount']);
  }
});
t('a successful register answer carries the link of THAT event only', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  setWa(rt, 's-poem', WA2);
  const r = reg(rt) as unknown as RegOk;
  assert.deepEqual(r, { ok: true, regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao', whatsappUrl: WA });
  const p = reg(rt, { eventId: 's-poem' }) as unknown as RegOk;
  assert.equal(p.whatsappUrl, WA2);
  const none = reg(rt, { eventId: 's-painting' }) as unknown as RegOk;
  assert.equal(none.ok, true);
  assert.ok(!('whatsappUrl' in none), 'no link set → no key at all');
});
t('a link pasted with a ?mode=… suffix is returned cleaned; a channel link is accepted', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', `${WA}?mode=ems_copy_t`);
  setWa(rt, 's-poem', WA_CHANNEL);
  assert.equal((reg(rt) as unknown as RegOk).whatsappUrl, WA);
  assert.equal((reg(rt, { eventId: 's-poem' }) as unknown as RegOk).whatsappUrl, WA_CHANNEL);
});
t('errors never carry the link: DUPLICATE, CLOSED (switched off and deadline), VALIDATION', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  const dup = reg(rt);
  assert.deepEqual(dup, { ok: false, code: 'DUPLICATE', regId: 'KR26-ESY-0001' });
  setWa(rt, 's-poem', WA2);
  rt.setEventField('s-poem', 'is_open', 'FALSE');
  const closed = reg(rt, { eventId: 's-poem' });
  assert.deepEqual(closed, { ok: false, code: 'CLOSED', reason: 'NOT_OPEN' });
  rt.setEventField('s-poem', 'is_open', 'TRUE');
  rt.setEventField('s-poem', 'deadline_iso', '2020-01-01T00:00:00+05:30');
  assert.deepEqual(reg(rt, { eventId: 's-poem' }), { ok: false, code: 'CLOSED', reason: 'DEADLINE' });
  assert.doesNotMatch(JSON.stringify(reg(rt, { phone: '1' })), /whatsapp/i);
});
t('an invalid cell is ignored: registration still works, no link key, and the warning names the event but not the value', () => {
  const rt = createOpenRuntime();
  const logs = captureLogs(rt);
  setWa(rt, 's-essay', 'https://evil.example/join-me-secret-token');
  const r = reg(rt) as unknown as RegOk;
  assert.equal(r.ok, true);
  assert.ok(!('whatsappUrl' in r));
  assert.ok(logs.some((l) => /^WARN Ignoring the whatsapp_url of event "s-essay"/.test(l)), logs.join(' | '));
  assert.ok(!logs.some((l) => /evil\.example|secret-token/.test(l)), 'the pasted value is not logged');
  assert.equal(rt.mail.sent.length, 1, 'the confirmation email still goes out');
  assert.doesNotMatch(`${rt.mail.sent[0]?.body}${rt.mail.sent[0]?.htmlBody}`, /whatsapp|evil/i);
});
t('an empty or whitespace-only cell is "no link": no key, no warning', () => {
  const rt = createOpenRuntime();
  const logs = captureLogs(rt);
  setWa(rt, 's-essay', '   ');
  assert.ok(!('whatsappUrl' in reg(rt)));
  assert.ok(!logs.some((l) => /whatsapp_url/.test(l)));
});
t('lookup returns the link together with each pass (individual and team member), only for events that have one', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  setWa(rt, 's-treasure-hunt', WA_CHANNEL);
  reg(rt);
  reg(rt, { eventId: 's-poem' });
  rt.post(hunt); // Ravi K (1BY23CS011 / 9845011111) is a team member
  const mine = rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845012345' }) as unknown as LookupOk;
  assert.deepEqual(mine.passes.map((p) => [p.event, p.whatsappUrl ?? null]), [['s-essay', WA], ['s-poem', null]]);
  const ravi = rt.post({ action: 'lookup', id: '1BY23CS011', phone: '9845011111' }) as unknown as LookupOk;
  assert.deepEqual(ravi.passes, [{ regId: 'KR26-TRH-0001', event: 's-treasure-hunt', name: 'Ravi K', whatsappUrl: WA_CHANNEL }]);
});
t('lookup with the wrong phone leaks nothing: NOT_FOUND only', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  const r = rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845099999' });
  assert.deepEqual(r, { ok: false, code: 'NOT_FOUND' });
  assert.doesNotMatch(JSON.stringify(r), /whatsapp/i);
});
t('lookup only looks at (and warns about) the link of an event where the person really has a pass', () => {
  const rt = createOpenRuntime();
  reg(rt);
  setWa(rt, 's-essay', WA);
  setWa(rt, 's-debate', 'not a link'); // someone else\'s event
  const logs = captureLogs(rt);
  rt.post(lookupBody);
  assert.ok(!logs.some((l) => /whatsapp_url/.test(l)), logs.join(' | '));
});
t('the link is never written to a registration tab, and no repo data file or Config.gs contains one', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  for (const id of ids(rt)) assert.doesNotMatch(JSON.stringify(rt.tab(id).cells), /whatsapp/i, id);
  const files = ['apps-script/Config.gs', ...readdirSync('src/data').filter((f) => f.endsWith('.json')).map((f) => `src/data/${f}`)];
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /chat\.whatsapp\.com|whatsapp\.com\/channel/, f);
});

console.log('\nConfirmation email: WhatsApp button, HTML body, reply-to');
const mailOf = (rt: GasRuntime) => rt.mail.sent[rt.mail.sent.length - 1]!;
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
t('with a link: both language blocks of the plain text carry "Join the WhatsApp group" and the link', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  const m = mailOf(rt);
  const [knBlock = '', enBlock = ''] = m.body.split('\n---\n');
  assert.ok(knBlock.includes(`ವಾಟ್ಸಾಪ್ ಗುಂಪಿಗೆ ಸೇರಿ: ${WA}`), 'Kannada line');
  assert.ok(enBlock.includes(`Join the WhatsApp group: ${WA}`), 'English line');
  assert.equal(count(m.body, WA), 2);
  assert.match(m.body, /KR26-ESY-0001/);
});
t('with a link: the HTML body has a real button (<a> with the link) in both blocks, and is sent next to the text body', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  const m = mailOf(rt);
  assert.ok(m.htmlBody && m.body, 'both bodies');
  assert.equal(count(m.htmlBody ?? '', `<a href="${WA}"`), 2, 'one button per language');
  assert.ok((m.htmlBody ?? '').includes('>Join the WhatsApp group</a>') && (m.htmlBody ?? '').includes('>ವಾಟ್ಸಾಪ್ ಗುಂಪಿಗೆ ಸೇರಿ</a>'));
  assert.match(m.htmlBody ?? '', /KR26-ESY-0001/);
  assert.equal(m.to, 'ananya@example.com');
  assert.equal(m.name, 'Honnudi Kannada Sangha');
});
t('without a link the email is as before (no WhatsApp wording anywhere) and still has an HTML body', () => {
  const rt = createOpenRuntime();
  reg(rt);
  const m = mailOf(rt);
  assert.doesNotMatch(`${m.body}${m.htmlBody}`, /whatsapp|ವಾಟ್ಸಾಪ್/i);
  assert.match(m.body, /ನೋಂದಣಿ ಐಡಿ: KR26-ESY-0001/);
  assert.match(m.htmlBody ?? '', /KR26-ESY-0001/);
});
t('HTML body escapes what the registrant typed (team name "Tom & Co"), the text body keeps it as typed', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-treasure-hunt', WA);
  rt.post({ ...hunt, teamName: 'Tom & Co' });
  const m = mailOf(rt);
  assert.ok(m.body.includes('Tom & Co'));
  assert.ok((m.htmlBody ?? '').includes('Tom &amp; Co'));
  assert.ok(!(m.htmlBody ?? '').includes('Tom & Co'));
  assert.equal(count(m.htmlBody ?? '', `<a href="${WA}"`), 2);
});
t('replyTo is set only when site.json has a contact email (empty today → none); a bad value is ignored', () => {
  const rt = createOpenRuntime();
  assert.equal((rt.ctx.CONFIG as { contactEmail: string }).contactEmail, '', 'site.json has no contact email — none is invented');
  reg(rt);
  assert.ok(!('replyTo' in mailOf(rt)));
  (rt.ctx.CONFIG as { contactEmail: string }).contactEmail = 'kannada.sangha@example.org';
  reg(rt, { id: '1BY23CS002' });
  assert.equal(mailOf(rt).replyTo, 'kannada.sangha@example.org');
  (rt.ctx.CONFIG as { contactEmail: string }).contactEmail = 'not an email';
  reg(rt, { id: '1BY23CS003' });
  assert.ok(!('replyTo' in mailOf(rt)));
});
t('a mail failure (quota/outage) with a link set still registers and still returns the link', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  rt.mail.fail = true;
  const r = reg(rt) as unknown as RegOk;
  assert.equal(r.ok, true);
  assert.equal(r.whatsappUrl, WA);
});

console.log('\nConfirmation email: "View your pass" button and lookup by registration ID');
const PASS_URL = 'https://kr2k26-bmsit.netlify.app/register/success?id=KR26-ESY-0001';
t('every confirmation carries a "View your pass" link with the registration ID, in both languages, text and HTML', () => {
  const rt = createOpenRuntime();
  assert.equal((rt.ctx.CONFIG as { siteUrl: string }).siteUrl, 'https://kr2k26-bmsit.netlify.app', 'siteUrl comes from site.json via Config.gs');
  reg(rt);
  const m = mailOf(rt);
  const [knBlock = '', enBlock = ''] = m.body.split('\n---\n');
  assert.ok(knBlock.includes(`ನಿಮ್ಮ ಪಾಸ್ ವೀಕ್ಷಿಸಿ: ${PASS_URL}`), 'Kannada line');
  assert.ok(enBlock.includes(`View your pass: ${PASS_URL}`), 'English line');
  assert.equal(count(m.body, PASS_URL), 2);
  assert.equal(count(m.htmlBody ?? '', `<a href="${PASS_URL}"`), 2, 'one button per language');
  assert.ok((m.htmlBody ?? '').includes('>View your pass</a>') && (m.htmlBody ?? '').includes('>ನಿಮ್ಮ ಪಾಸ್ ವೀಕ್ಷಿಸಿ</a>'));
  assert.doesNotMatch(`${m.body}${m.htmlBody}`, /9845012345|98450 12345/, 'the phone number is never in the link or the mail');
});
t('the pass link never carries the phone or the USN — only the registration ID', () => {
  const rt = createOpenRuntime();
  reg(rt);
  const urls = mailOf(rt).body.match(/https:\/\/\S+/g) ?? [];
  assert.deepEqual([...new Set(urls)], [PASS_URL]);
});
t('with a WhatsApp link too: both buttons, the pass one first', () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  const h = mailOf(rt).htmlBody ?? '';
  assert.equal(count(h, '<a href='), 4);
  assert.ok(h.indexOf(PASS_URL) < h.indexOf(WA));
});
t('a Config without siteUrl simply leaves the pass link out (the email still goes out)', () => {
  const rt = createOpenRuntime();
  (rt.ctx.CONFIG as { siteUrl: string }).siteUrl = '';
  reg(rt);
  assert.equal(rt.mail.sent.length, 1);
  assert.doesNotMatch(`${mailOf(rt).body}${mailOf(rt).htmlBody}`, /register\/success|View your pass/);
});
t("lookup by registration ID + the registrant's phone returns that pass (and the event's WhatsApp link)", () => {
  const rt = createOpenRuntime();
  setWa(rt, 's-essay', WA);
  reg(rt);
  assert.deepEqual(rt.post({ action: 'lookup', id: 'kr26-esy-0001', phone: '+91 98450 12345' }), {
    ok: true,
    passes: [{ regId: 'KR26-ESY-0001', event: 's-essay', name: 'Ananya Rao', whatsappUrl: WA }],
  });
});
t("lookup by registration ID also accepts a team member's own phone (their own name on the pass)", () => {
  const rt = createOpenRuntime();
  rt.post(hunt);
  const r = rt.post({ action: 'lookup', id: 'KR26-TRH-0001', phone: '9845011111' }) as unknown as LookupOk;
  assert.deepEqual(r.passes, [{ regId: 'KR26-TRH-0001', event: 's-treasure-hunt', name: 'Ravi K' }]);
});
t('lookup by registration ID: wrong phone, unknown number or wrong event code → NOT_FOUND, nothing leaked', () => {
  const rt = createOpenRuntime();
  reg(rt);
  assert.deepEqual(rt.post({ action: 'lookup', id: 'KR26-ESY-0001', phone: '9845099999' }), { ok: false, code: 'NOT_FOUND' });
  assert.deepEqual(rt.post({ action: 'lookup', id: 'KR26-ESY-0002', phone: '9845012345' }), { ok: false, code: 'NOT_FOUND' });
  assert.deepEqual(rt.post({ action: 'lookup', id: 'KR26-POM-0001', phone: '9845012345' }), { ok: false, code: 'NOT_FOUND' });
});
t('lookup by registration ID shares the 5-failures rate limit, and a USN lookup still works as before', () => {
  const rt = createOpenRuntime();
  reg(rt);
  for (let i = 0; i < 5; i++) rt.post({ action: 'lookup', id: 'KR26-ESY-0001', phone: `98450000${10 + i}` });
  assert.deepEqual(rt.post({ action: 'lookup', id: 'KR26-ESY-0001', phone: '9845012345' }), { ok: false, code: 'RATE_LIMITED' });
  assert.equal(rt.post({ action: 'lookup', id: '1BY23CS001', phone: '9845012345' }).ok, true, 'a different key (the USN) is not rate-limited');
});

console.log('\nClient/server parity');
t('normalisers in validation.ts and Code.gs give identical results', () => {
  const rt = createOpenRuntime();
  const inputs = ['  1by 23cs001 ', ' 1td24cs001', 'abc-123', 'abc - 123', '+91 98450-12345', '919845012345', '09845012345', ' A.  B   ', 'ಶ್ರೀ  ನಿವಾಸ್', ' X@Y.CO ', '', '\t', 'emp 10 42'];
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
