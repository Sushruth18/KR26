/**
 * Tests the real apps-script/Code.gs (run in a Node VM against fake Google services).
 *   npm run test:server
 */
import assert from 'node:assert/strict';
import { createGasRuntime, createOpenRuntime, type GasRuntime } from '../mock/gas-runtime';
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
const quiz = {
  ...base,
  eventId: 's-quiz',
  id: '1BY23CS010',
  teamName: 'Kannada Kalpa',
  members: [{ name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' }],
};
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
  assert.equal(rt.events().getRange(1, 1, 1, 6).getDisplayValues()[0]?.join('|'), 'id|code|name_en|sheet_name|deadline_iso|is_open');
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
  rt.post(quiz);
  const s0 = st(rt);
  assert.equal(s0.ok, true);
  assert.deepEqual(s0.events['s-essay'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 2 });
  assert.deepEqual(s0.events['s-quiz'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 1 });
  assert.deepEqual(s0.events['s-poem'], { isOpen: true, deadline: '2026-11-18T18:29:00.000Z', registeredCount: 0 });
  assert.ok(!Number.isNaN(Date.parse(s0.serverTime)));
  assert.doesNotMatch(JSON.stringify(s0), /seat/i);
});
t('setupSheet is safe to run again: a second run changes nothing', () => {
  const rt = createOpenRuntime();
  reg(rt);
  rt.post(quiz);
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
  assert.deepEqual(headers, ['id', 'code', 'name_en', 'seats', 'deadline_iso', 'is_open', 'sheet_name']);
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
  assert.equal(rt.post(quiz).ok, true);
  const row = regRow(rt, 2, 's-quiz');
  assert.equal(row[9], 'Kannada Kalpa');
  assert.deepEqual(JSON.parse(row[10] ?? ''), [{ name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' }]);
  assert.equal(row[11], '1BY23CS011');
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
  assert.equal(rt.post({ ...quiz, id: '1TD24CS001', members: [{ name: 'Ravi K', id: 'abc-123', phone: '9845011111' }] }).ok, true);
  assert.equal(regRow(rt, 2, 's-quiz')[11], 'ABC-123');
  const r = rt.post({ ...quiz, id: 'xyz 9', members: [{ name: 'Meera S', id: 'ABC-123', phone: '9845022222' }] });
  assert.deepEqual(r, { ok: false, code: 'DUPLICATE', regId: 'KR26-QIZ-0001' });
  assert.equal(rt.post({ ...quiz, id: 'xyz 9', members: [{ name: 'Meera S', id: '1td24cs001', phone: '9845022222' }] }).code, 'DUPLICATE');
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
t('team: member USN longer than 20 characters → members.0.id', () => {
  const r = createOpenRuntime().post({ ...quiz, members: [{ name: 'Ravi K', id: 'X'.repeat(21), phone: '9845011111' }] });
  assert.equal(r.field, 'members.0.id');
});
t('team: empty member USN → members.0.id', () => {
  const r = createOpenRuntime().post({ ...quiz, members: [{ name: 'Ravi K', id: ' ', phone: '9845011111' }] });
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
  rt.post({ ...quiz, id: '1BY23CS001', phone: '9845012345', members: [{ name: 'Ravi K', id: '1BY23CS011', phone: '9845011111' }] });
  rt.post({ ...base, eventId: 's-painting', id: '1BY23CS077', phone: '9845077777' });
  const r = rt.post({ action: 'lookup', id: '1by23cs001', phone: '9845012345' }) as unknown as { ok: boolean; passes: { regId: string; event: string; name: string }[] };
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.passes.map((p) => `${p.event}:${p.regId}`),
    ['s-essay:KR26-ESY-0001', 's-poem:KR26-POM-0001', 's-quiz:KR26-QIZ-0001'],
  );
  assert.ok(r.passes.every((p) => Object.keys(p).sort().join() === 'event,name,regId'), 'only regId, event, name');
  // a team member found in the Quiz tab with their own phone
  assert.deepEqual(rt.post({ action: 'lookup', id: '1BY23CS011', phone: '9845011111' }), {
    ok: true,
    passes: [{ regId: 'KR26-QIZ-0001', event: 's-quiz', name: 'Ravi K' }],
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
  assert.equal(rt.post(quiz).ok, true);
  assert.equal(reg(rt, { id: '1BY23CS011', name: 'Ravi K' }).ok, true); // Ravi is in a Quiz team and registers for Essay
});
t('reg ID numbering is per tab: busy events do not advance the others', () => {
  const rt = createOpenRuntime();
  for (let i = 1; i <= 5; i++) assert.equal(reg(rt, { id: `1BY23CS00${i}` }).regId, `KR26-ESY-000${i}`);
  assert.equal(reg(rt, { eventId: 's-poem' }).regId, 'KR26-POM-0001');
  assert.equal(rt.post(quiz).regId, 'KR26-QIZ-0001');
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
  rt.post(quiz);
  // same people in a different event are fine
  assert.equal(rt.post({ ...quiz, eventId: 's-treasure-hunt', teamName: 'Hunters', members: [...quiz.members, { name: 'Meera S', id: '1BY23CS012', phone: '9845022222' }] }).ok, true);
  // ...but not again in the Quiz
  assert.equal(rt.post({ ...quiz, id: '1BY23CS099' }).code, 'DUPLICATE'); // member 1BY23CS011 already in the quiz team
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
