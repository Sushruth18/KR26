/**
 * Karnataka Rajyotsava 2026 — registration backend (Google Apps Script web app).
 *
 * The Apps Script project needs TWO files: this Code.gs and Config.gs (generated from the
 * website's data — never edit Config.gs by hand). Setup steps: apps-script/README.md.
 *
 * Layout of the spreadsheet
 *   Events tab        one row per competition: id | code | name_en | sheet_name | deadline_iso | is_open | whatsapp_url | max_teams
 *                     (whatsapp_url is optional and private: it is only ever returned to someone who just registered
 *                     for that event, or who looked their pass up — never by ?action=status.)
 *   one tab per event named by that row's sheet_name (e.g. "ESY – Essay Writing"), holding only that
 *                     event's registrations. There is no shared "Registrations" tab.
 *
 * Endpoints
 *   GET  ?action=status                         -> { ok, events: { [id]: { isOpen, deadline, registeredCount, seatsLeft? } }, serverTime, configVersion }
 *                                                  (seatsLeft only for events with a max_teams number)
 *   POST { action: "register", ...fields }      -> { ok:true, regId, event, name, whatsappUrl? } | { ok:false, code, reason?, field?, regId? }
 *   POST { action: "lookup", id, phone }        -> (id = USN / employee ID, or a registration ID like KR26-ESY-0042) { ok:true, passes:[{ regId, event, name, whatsappUrl? }] } | { ok:false, code }
 * whatsappUrl is present only when the event's whatsapp_url cell holds a valid https://chat.whatsapp.com/<code> (or
 * https://whatsapp.com/channel/<code>) link; any other value is ignored and logged (never returned).
 * The browser sends POST bodies as Content-Type text/plain so no CORS preflight is needed.
 *
 * Registration is open unless the event's is_open cell is not TRUE or its deadline has passed. An event whose
 * max_teams cell holds a number takes at most that many non-withdrawn registrations (FULL after that; blank = no
 * limit -- only Treasure Hunt is capped, at 30). Error codes: VALIDATION, CLOSED (reason NOT_OPEN = closed by a
 * coordinator | DEADLINE), FULL, DUPLICATE, SERVER, NOT_FOUND and RATE_LIMITED (lookup only).
 *
 * Every SERVER answer carries a short machine-readable "reason" (never a secret, stack trace or sheet content):
 *   EVENTS_TAB_MISSING                  the Events tab does not exist
 *   EVENTS_COLUMN_MISSING:<column>      the Events tab lacks id / sheet_name / deadline_iso / is_open
 *   EVENT_SHEET_NAME_MISSING:<eventId>  the event's sheet_name cell is empty
 *   EVENT_TAB_RESERVED:<eventId>        sheet_name points at the Events tab itself
 *   EVENT_TAB_SHARED:<eventId>          two events use the same tab
 *   EVENT_TAB_MISSING:<eventId>         no tab with that sheet_name exists
 *   EVENT_TAB_COLUMN_MISSING:<eventId>:<column>   the event tab's header row is not the layout
 *   CONFIG_MISMATCH                     Config.gs is missing, from another version of the site, or not the one this
 *                                       Code.gs expects (CONFIG_SCHEMA / CONFIG_VERSION) — paste the latest Config.gs
 *   CONFIG_EMPTY                        Config.gs defines no events — paste the latest Config.gs
 *   LOCK_TIMEOUT                        could not get the script lock within 20 s (website: "try again")
 *   UNEXPECTED                          anything else — the real message is only in the Apps Script log
 * Each one is also written to the log with console.error (Apps Script editor > Executions).
 */

var SHEET_EVENTS = 'Events';
var SHEET_OLD_REGS = 'Registrations'; // retired shared tab — never read or written; setupSheet only mentions it in the log
// whatsapp_url is optional: coordinators paste a group/channel invite link there (setupSheet adds the empty column).
// max_teams: blank = no limit; a whole number = at most that many registrations (teams, or people for individual
// events) that are not WITHDRAWN. When setupSheet first adds the column it seeds it once from Config.gs (Treasure Hunt
// 30); after that it is the coordinators' cell and is never overwritten.
var EVENT_HEADERS = ['id', 'code', 'name_en', 'sheet_name', 'deadline_iso', 'is_open', 'whatsapp_url', 'max_teams'];
// Columns of every event tab (no event_id: the tab is the event). These 13 are always the first 13, in this order.
var REG_HEADERS = [
  'timestamp', 'reg_id', 'category', 'name', 'usn_or_empid', 'department', 'semester',
  'phone', 'email', 'team_name', 'members_json', 'member_ids', 'consent_photo'
];
// Columns added later. setupSheet APPENDS any that are missing at the END of an existing tab (after whatever is there,
// even a coordinator's own extra column) and never moves, renames or clears anything. Found by header name.
//   eligibility_confirmed  TRUE when the registrant confirmed Kannada is not their mother tongue (eligibility events)
var REG_EXTRA_HEADERS = ['eligibility_confirmed'];
var LOCK_WAIT_MS = 20000;
// Config.gs (generated) must declare CONFIG_SCHEMA with this exact number, or every request answers CONFIG_MISMATCH.
// Keep equal to GAS_CONFIG_SCHEMA in scripts/gas-config.ts (npm run gas:config fails if they differ).
var EXPECTED_CONFIG_SCHEMA = 6;

// Registration ID format: KR26-<event code>-<4 digits> (the same shape the website shows on the pass).
var REG_ID_RE = /^KR26-([A-Z]{3})-(\d{4})$/;
var STATUS_CACHE_KEY = 'status_v4';
var STATUS_CACHE_S = 10;
var LOOKUP_MAX_FAILS = 5;
var LOOKUP_WINDOW_S = 600;

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';
    if (action === 'status') return json_(getStatus_());
    return json_({ ok: false, code: 'VALIDATION', field: 'action' });
  } catch (err) {
    return json_(serverError_(err, 'status'));
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return json_({ ok: false, code: 'VALIDATION', field: 'body' });
  }
  var action = body && typeof body.action === 'string' ? body.action : '';
  try {
    if (action === 'register') return json_(register_(body));
    if (action === 'lookup') return json_(lookup_(body));
    return json_({ ok: false, code: 'VALIDATION', field: 'action' });
  } catch (err) {
    return json_(serverError_(err, action));
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// SERVER errors: every exception becomes { ok:false, code:'SERVER', reason } — see the list at the top.
// ---------------------------------------------------------------------------

var REASON_PATTERN = /^[A-Z_]+(:[A-Za-z0-9_.\-]+)*$/;

/** An Error that carries a known, safe reason code. detail is for the log only and is never sent to the browser. */
function fail_(reason, detail) {
  var err = new Error(detail || reason);
  err.reason = reason;
  return err;
}

/**
 * Config.gs sanity check, run first by status, register, lookup and setupSheet. A stale, missing or empty Config.gs
 * is the usual reason for "0 tabs created" and for unknown-event errors, so it is reported by name, not guessed at.
 */
function assertConfig_() {
  if (typeof CONFIG === 'undefined' || typeof CONFIG_SCHEMA === 'undefined' || typeof CONFIG_VERSION === 'undefined') {
    throw fail_('CONFIG_MISMATCH', 'Config.gs is missing or out of date (no CONFIG_SCHEMA / CONFIG_VERSION) — paste the latest Config.gs.');
  }
  if (CONFIG_SCHEMA !== EXPECTED_CONFIG_SCHEMA) {
    throw fail_('CONFIG_MISMATCH', 'Config.gs is schema ' + CONFIG_SCHEMA + ' but Code.gs expects schema ' + EXPECTED_CONFIG_SCHEMA +
      ' — paste the latest Code.gs AND Config.gs together.');
  }
  if (!CONFIG || !CONFIG.events || typeof CONFIG.events !== 'object' || Object.keys(CONFIG.events).length === 0) {
    throw fail_('CONFIG_EMPTY', 'Config.gs has no events — paste the latest Config.gs.');
  }
}

/**
 * Maps any exception to the SERVER answer. Only a reason raised by fail_ (and well-formed) goes out; everything
 * else is "UNEXPECTED". The real message goes to the Apps Script log only — never into the response.
 */
function serverError_(err, where) {
  var reason = err && typeof err.reason === 'string' && REASON_PATTERN.test(err.reason) ? err.reason : 'UNEXPECTED';
  var message = err && err.message ? String(err.message) : String(err);
  console.error('SERVER reason=' + reason + ' where=' + (where || '?') + ' — ' + message);
  return { ok: false, code: 'SERVER', reason: reason };
}

// ---------------------------------------------------------------------------
// Normalisers — must stay identical to src/lib/validation.ts (checked by npm run test:server)
// ---------------------------------------------------------------------------

function normText_(v) {
  return String(v == null ? '' : v).normalize('NFC').replace(/\s+/g, ' ').trim();
}
function normId_(v) {
  return normText_(v).replace(/\s+/g, '').toUpperCase();
}
function normPhone_(v) {
  var s = String(v == null ? '' : v).replace(/[^\d+]/g, '');
  if (s.indexOf('+91') === 0) s = s.slice(3);
  else if (s.length === 12 && s.indexOf('91') === 0) s = s.slice(2);
  else if (s.length === 11 && s.charAt(0) === '0') s = s.slice(1);
  return s;
}
function normEmail_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, '').toLowerCase();
}

// ---------------------------------------------------------------------------
// Validation — mirrors src/lib/validation.ts; rules/lists come from Config.gs
// ---------------------------------------------------------------------------

function matches_(pattern, s) {
  return new RegExp(pattern).test(s);
}
function validName_(s) {
  var r = CONFIG.rules.name;
  return s.length >= r.min && s.length <= r.max && matches_(r.pattern, s);
}
function validId_(s, category) {
  if (category === 'students') return s.length >= 1 && s.length <= CONFIG.rules.usn.max;
  return s.length >= 1 && s.length <= CONFIG.rules.empId.max && matches_(CONFIG.rules.empId.pattern, s);
}
function validPhone_(s) {
  return matches_(CONFIG.rules.phone.pattern, s);
}
function semestersFor_(department) {
  var by = CONFIG.semesters.byDepartment;
  return Object.prototype.hasOwnProperty.call(by, department) ? by[department] : CONFIG.semesters['default'];
}
function getEventConfig_(id) {
  return Object.prototype.hasOwnProperty.call(CONFIG.events, id) ? CONFIG.events[id] : null;
}

function validate_(b) {
  function fail(field) {
    return { ok: false, code: 'VALIDATION', field: field };
  }
  // Spam guards: hidden honeypot must be empty; a human needs more than minFormMs to fill the form.
  if (normText_(b.website) !== '') return fail('form');
  var elapsed = Number(b.elapsedMs);
  if (!isFinite(elapsed) || elapsed < CONFIG.minFormMs) return fail('form');

  var eventId = String(b.eventId || '');
  var ev = getEventConfig_(eventId);
  if (!ev) return fail('eventId');

  var p = {
    eventId: eventId,
    category: ev.category, // derived from the event, never trusted from the client
    name: normText_(b.name),
    id: normId_(b.id),
    department: normText_(b.department),
    departmentOther: '',
    semester: '',
    phone: normPhone_(b.phone),
    email: normEmail_(b.email),
    teamName: '',
    members: [],
    consentPhoto: b.consentPhoto === true,
    eligibilityConfirmed: false
  };

  if (!validName_(p.name)) return fail('name');
  if (!validId_(p.id, ev.category)) return fail('id');
  if (p.department === 'Other') {
    p.departmentOther = normText_(b.departmentOther);
    var o = CONFIG.rules.departmentOther;
    if (p.departmentOther.length < o.min || p.departmentOther.length > o.max ||
        !matches_(CONFIG.rules.name.pattern, p.departmentOther)) return fail('departmentOther');
  } else if (CONFIG.departments.indexOf(p.department) === -1) {
    return fail('department');
  }
  if (ev.category === 'students') {
    var sem = Number(b.semester);
    if (semestersFor_(p.department).indexOf(sem) === -1) return fail('semester');
    p.semester = String(sem);
  }
  if (!validPhone_(p.phone)) return fail('phone');
  if (p.email.length > CONFIG.rules.email.max || !matches_(CONFIG.rules.email.pattern, p.email)) return fail('email');
  if (b.consentRules !== true) return fail('consentRules');
  // Events only for non-Kannadigas: the registrant must confirm Kannada is not their mother tongue.
  if (ev.eligibility) {
    if (b.eligibilityConfirmed !== true) return fail('eligibilityConfirmed');
    p.eligibilityConfirmed = true;
  }

  var members = Array.isArray(b.members) ? b.members : [];
  if (ev.teamSize.max > 1) {
    p.teamName = normText_(b.teamName);
    var tn = CONFIG.rules.teamName;
    if (p.teamName.length < tn.min || p.teamName.length > tn.max || !matches_(tn.pattern, p.teamName)) return fail('teamName');
    var total = members.length + 1; // team size counts the registrant
    if (total < ev.teamSize.min || total > ev.teamSize.max) return fail('members');
    var seen = {};
    seen[p.id] = true;
    for (var i = 0; i < members.length; i++) {
      var m = members[i] || {};
      var mm = { name: normText_(m.name), id: normId_(m.id), phone: normPhone_(m.phone) };
      if (!validName_(mm.name)) return fail('members.' + i + '.name');
      if (!validId_(mm.id, ev.category)) return fail('members.' + i + '.id');
      if (!validPhone_(mm.phone)) return fail('members.' + i + '.phone');
      if (seen[mm.id]) return fail('members.' + i + '.id');
      seen[mm.id] = true;
      p.members.push(mm);
    }
  } else if (members.length > 0) {
    return fail('members');
  }
  return { ok: true, data: p, event: ev };
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Rows of a tab as objects keyed by header. Display values, so phone/USN cells are always strings. */
function readTable_(sh) {
  var values = sh.getDataRange().getDisplayValues();
  var headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;
    var o = { _row: r + 1 };
    for (var c = 0; c < headers.length; c++) o[headers[c]] = String(row[c] == null ? '' : row[c]);
    rows.push(o);
  }
  return rows;
}

/** The Events tab as { [eventId]: { sheetName, deadline, isOpen } }. Read by header name, so extra columns are harmless. */
function readEvents_() {
  var evSheet = ss_().getSheetByName(SHEET_EVENTS);
  if (!evSheet) throw fail_('EVENTS_TAB_MISSING', 'Missing tab "' + SHEET_EVENTS + '" — run setupSheet() once (README step 4).');
  var evHeaders = evSheet.getRange(1, 1, 1, Math.max(1, evSheet.getLastColumn())).getDisplayValues()[0]
    .map(function (h) { return String(h).trim(); });
  ['id', 'sheet_name', 'deadline_iso', 'is_open'].forEach(function (h) {
    if (evHeaders.indexOf(h) === -1) {
      throw fail_('EVENTS_COLUMN_MISSING:' + h, 'The ' + SHEET_EVENTS + ' tab has no "' + h + '" column in row 1 — run setupSheet().');
    }
  });
  var out = {};
  readTable_(evSheet).forEach(function (r) {
    var id = String(r.id).trim();
    if (!id) return;
    out[id] = {
      sheetName: String(r.sheet_name || '').trim(),
      deadline: Date.parse(String(r.deadline_iso).trim()), // NaN if a coordinator broke the format
      isOpen: String(r.is_open).trim().toUpperCase() === 'TRUE',
      whatsappRaw: String(r.whatsapp_url || '').trim(), // private: only read through whatsappFor_(), never put in a response as is
      maxTeams: parseMaxTeams_(r.max_teams, id)
    };
  });
  return out;
}

/** max_teams cell -> a limit (0, 1, 2 ...) or null for "no limit". Anything that is not a whole number is ignored (logged). */
function parseMaxTeams_(v, eventId) {
  var s = String(v == null ? '' : v).trim();
  if (s === '') return null;
  if (!/^\d{1,5}$/.test(s)) {
    console.warn('Ignoring max_teams "' + s + '" of event "' + eventId + '": it must be a whole number (or empty for no limit).');
    return null;
  }
  return Number(s);
}

/** A row a coordinator marked as withdrawn (status column). It no longer counts anywhere. */
function isWithdrawn_(row) {
  return String(row.status || '').trim().toUpperCase() === 'WITHDRAWN';
}

/** Registrations that count: have a reg_id and are not withdrawn. */
function activeRows_(rows) {
  return rows.filter(function (r) { return String(r.reg_id || '').trim() !== '' && !isWithdrawn_(r); });
}

/**
 * A pasted WhatsApp link, cleaned: trimmed, ?query / #fragment / trailing "/" removed, and accepted only if it is
 * https://chat.whatsapp.com/<code> or https://whatsapp.com/channel/<code> (rules in Config.gs, shared with the site).
 * Returns '' for anything else.
 */
function cleanWhatsappUrl_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  s = s.split(/[?#]/)[0].replace(/\/$/, '');
  return matches_(CONFIG.rules.whatsapp.group, s) || matches_(CONFIG.rules.whatsapp.channel, s) ? s : '';
}

/**
 * The valid WhatsApp link of an event, or ''. A cell with something else in it is ignored and logged (event id only,
 * not the value); the link never goes anywhere except register / lookup answers and confirmation emails.
 */
function whatsappFor_(events, eventId) {
  var raw = events[eventId] ? events[eventId].whatsappRaw : '';
  if (!raw) return '';
  var clean = cleanWhatsappUrl_(raw);
  if (!clean) {
    console.warn('Ignoring the whatsapp_url of event "' + eventId + '": it must look like https://chat.whatsapp.com/<code> ' +
      '(or https://whatsapp.com/channel/<code>). Fix the cell in the Events tab.');
  }
  return clean;
}

/**
 * The tab that holds one event's registrations, found through the Events tab's sheet_name cell (so a
 * coordinator can rename a tab as long as they update that cell). Throws — and the caller answers SERVER —
 * when the cell is empty, the tab does not exist, two events share a tab or the tab has the wrong header row.
 * It never falls back to another tab, so a registration can never land in the wrong place.
 */
function eventTab_(eventId, events) {
  var ev = events[eventId];
  var name = ev ? ev.sheetName : '';
  if (!name) throw fail_('EVENT_SHEET_NAME_MISSING:' + eventId, 'Event "' + eventId + '" has no sheet_name in the ' + SHEET_EVENTS + ' tab — run setupSheet().');
  if (name === SHEET_EVENTS) throw fail_('EVENT_TAB_RESERVED:' + eventId, 'Event "' + eventId + '": sheet_name must not be "' + SHEET_EVENTS + '".');
  Object.keys(events).forEach(function (other) {
    if (other !== eventId && events[other].sheetName === name) {
      throw fail_('EVENT_TAB_SHARED:' + eventId,
        'Events "' + eventId + '" and "' + other + '" both use the tab "' + name + '" — every event needs its own tab.');
    }
  });
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    throw fail_('EVENT_TAB_MISSING:' + eventId, 'Event "' + eventId + '": tab "' + name + '" not found. Fix its sheet_name cell in the ' +
      SHEET_EVENTS + ' tab, or run setupSheet() to recreate the tab.');
  }
  var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var required = REG_HEADERS.concat(CONFIG.events[eventId] && CONFIG.events[eventId].eligibility ? ['eligibility_confirmed'] : []);
  required.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      throw fail_('EVENT_TAB_COLUMN_MISSING:' + eventId + ':' + h,
        'Tab "' + name + '" has no "' + h + '" column in row 1 — refusing to write to it.');
    }
  });
  return sh;
}

/** Same as eventTab_ but answers null instead of throwing (status and lookup must not fail because one tab is broken). */
function eventTabOrNull_(eventId, events) {
  try {
    return eventTab_(eventId, events);
  } catch (err) {
    serverError_(err, 'tab:' + eventId); // logs reason + message; the caller just treats the event as closed / skips it
    return null;
  }
}

/**
 * Formula-injection guard: Sheets treats a value starting with = (and in some clients + - @) as a formula.
 * A leading apostrophe forces plain text and is not shown in the cell.
 */
function safeCell_(v) {
  var s = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Appends one row as plain text, placing values by header name (column order in the Sheet can change). */
function appendByHeader_(sh, record) {
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var row = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(record, h) ? safeCell_(record[h]) : '';
  });
  var r = sh.getLastRow() + 1;
  var range = sh.getRange(r, 1, 1, row.length);
  range.setNumberFormat('@'); // plain text: keeps phone numbers, USNs and leading zeros intact
  range.setValues([row]);
}

function idsOfRow_(row) {
  var ids = [normId_(row.usn_or_empid)];
  String(row.member_ids || '').split(',').forEach(function (x) {
    var id = normId_(x);
    if (id) ids.push(id);
  });
  return ids;
}

/** Same USN/employee ID — registrant or any team member, on either side — already in this event. */
function findDuplicate_(rows, ids) {
  for (var i = 0; i < rows.length; i++) {
    var existing = idsOfRow_(rows[i]);
    for (var j = 0; j < ids.length; j++) {
      if (existing.indexOf(ids[j]) !== -1) return rows[i].reg_id;
    }
  }
  return null;
}

/** KR26-<CODE>-NNNN with NNNN = highest existing number for the event + 1 (safe if a row is deleted). */
function nextRegId_(code, rows) {
  var max = 0;
  rows.forEach(function (r) {
    var n = parseInt(String(r.reg_id).split('-').pop(), 10);
    if (n > max) max = n;
  });
  var num = String(max + 1);
  while (num.length < 4) num = '0' + num;
  return 'KR26-' + code + '-' + num;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function getStatus_() {
  assertConfig_();
  var cache = CacheService.getScriptCache();
  var hit = cache.get(STATUS_CACHE_KEY);
  if (hit) {
    var cached = JSON.parse(hit);
    cached.serverTime = new Date().toISOString();
    return cached;
  }
  var sheetEvents = readEvents_();
  var now = Date.now();
  var events = {};
  Object.keys(CONFIG.events).forEach(function (id) {
    var e = sheetEvents[id];
    if (!e) {
      events[id] = { isOpen: false, deadline: null, registeredCount: 0 };
      return;
    }
    var validDeadline = !isNaN(e.deadline);
    var tab = eventTabOrNull_(id, sheetEvents);
    var count = tab ? activeRows_(readTable_(tab)).length : 0;
    events[id] = {
      // Open = switched on in the Sheet, deadline not passed, and a tab exists to take the registration.
      isOpen: e.isOpen && validDeadline && now < e.deadline && tab !== null,
      deadline: validDeadline ? new Date(e.deadline).toISOString() : null,
      registeredCount: count // non-withdrawn registrations
    };
    // Capped events only (max_teams set): places left, never negative. The website shows "Few seats left" / "Full".
    if (e.maxTeams !== null) events[id].seatsLeft = Math.max(0, e.maxTeams - count);
  });
  var out = { ok: true, events: events, serverTime: new Date(now).toISOString(), configVersion: CONFIG_VERSION };
  cache.put(STATUS_CACHE_KEY, JSON.stringify(out), STATUS_CACHE_S);
  return out;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

function register_(b) {
  assertConfig_();
  var v = validate_(b);
  if (!v.ok) return v;
  var p = v.data;
  var ev = v.event;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_WAIT_MS);
  } catch (err) {
    return serverError_(fail_('LOCK_TIMEOUT', 'Could not get the script lock within ' + LOCK_WAIT_MS + ' ms: ' + err), 'register');
  }

  var result;
  var whatsappUrl = '';
  try {
    // Everything from reading the event's rows to writing the new row happens while holding the lock,
    // so two simultaneous registrations can never get the same reg_id or both pass the duplicate check.
    var events = readEvents_();
    var live = events[p.eventId];
    if (!live || !live.isOpen) return { ok: false, code: 'CLOSED', reason: 'NOT_OPEN' };
    if (isNaN(live.deadline)) return { ok: false, code: 'CLOSED', reason: 'NOT_OPEN' };
    if (Date.now() >= live.deadline) return { ok: false, code: 'CLOSED', reason: 'DEADLINE' };

    var tab = eventTab_(p.eventId, events); // throws -> SERVER; nothing has been written
    var rows = readTable_(tab);
    var ids = [p.id].concat(p.members.map(function (m) { return m.id; }));
    var dup = findDuplicate_(rows, ids);
    if (dup) return { ok: false, code: 'DUPLICATE', regId: dup };
    // Cap (max_teams), counted inside the lock: two people can never both take the last place.
    if (live.maxTeams !== null && activeRows_(rows).length >= live.maxTeams) return { ok: false, code: 'FULL' };

    var regId = nextRegId_(ev.code, rows);
    appendByHeader_(tab, {
      timestamp: new Date().toISOString(),
      reg_id: regId,
      category: p.category,
      name: p.name,
      usn_or_empid: p.id,
      department: p.department === 'Other' ? 'Other: ' + p.departmentOther : p.department,
      semester: p.semester,
      phone: p.phone,
      email: p.email,
      team_name: p.teamName,
      members_json: p.members.length ? JSON.stringify(p.members) : '',
      member_ids: p.members.map(function (m) { return m.id; }).join(','),
      consent_photo: p.consentPhoto ? 'TRUE' : 'FALSE',
      eligibility_confirmed: p.eligibilityConfirmed ? 'TRUE' : ''
    });
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(STATUS_CACHE_KEY);
    result = { ok: true, regId: regId, event: p.eventId, name: p.name };
    whatsappUrl = whatsappFor_(events, p.eventId);
    if (whatsappUrl) result.whatsappUrl = whatsappUrl; // the registrant's own event only
  } finally {
    lock.releaseLock();
  }

  sendConfirmation_(p, ev, result.regId, whatsappUrl); // outside the lock; never fails the registration
  return result;
}

// ---------------------------------------------------------------------------
// Lookup (pass recovery): ID AND full phone must match; returns only regId, event, name
// ---------------------------------------------------------------------------

function lookup_(b) {
  assertConfig_();
  var id = normId_(b.id);
  var phone = normPhone_(b.phone);
  if (!id || id.length > 20 || !validPhone_(phone)) return { ok: false, code: 'VALIDATION', field: 'lookup' };

  var cache = CacheService.getScriptCache();
  var key = 'lookup_fail_' + id;
  var fails = Number(cache.get(key) || 0);
  if (fails >= LOOKUP_MAX_FAILS) return { ok: false, code: 'RATE_LIMITED' };

  var passes = [];
  var events = readEvents_();

  // A registration ID (KR26-ESY-0042, as in the confirmation email's "View your pass" link) + the phone of the
  // registrant or of a team member: only that one registration's own tab is read. Same rate limit as below.
  var regIdMatch = REG_ID_RE.exec(id);
  if (regIdMatch) {
    Object.keys(CONFIG.events).forEach(function (eventId) {
      if (CONFIG.events[eventId].code !== regIdMatch[1]) return;
      var tab = eventTabOrNull_(eventId, events);
      if (!tab) return;
      var link = null;
      var passFor = function (name) {
        if (link === null) link = whatsappFor_(events, eventId);
        var pass = { regId: id, event: eventId, name: name };
        if (link) pass.whatsappUrl = link;
        return pass;
      };
      readTable_(tab).forEach(function (r) {
        if (String(r.reg_id) !== id) return;
        if (normPhone_(r.phone) === phone) {
          passes.push(passFor(r.name));
          return;
        }
        var members;
        try {
          members = r.members_json ? JSON.parse(r.members_json) : [];
        } catch (err) {
          return;
        }
        for (var i = 0; i < members.length; i++) {
          if (normPhone_(members[i].phone) === phone) {
            passes.push(passFor(members[i].name));
            return;
          }
        }
      });
    });
    if (!passes.length) {
      cache.put(key, String(fails + 1), LOOKUP_WINDOW_S);
      return { ok: false, code: 'NOT_FOUND' };
    }
    return { ok: true, passes: passes };
  }

  // Every event tab is searched; a person registered for several events gets all their passes.
  Object.keys(CONFIG.events).forEach(function (eventId) {
    var tab = eventTabOrNull_(eventId, events);
    if (!tab) return;
    var link = null; // looked up (and a bad cell logged) only if this event actually has a pass for this person
    var passFor = function (regId, name) {
      if (link === null) link = whatsappFor_(events, eventId);
      var pass = { regId: regId, event: eventId, name: name };
      if (link) pass.whatsappUrl = link; // only to someone who proved ID + phone
      return pass;
    };
    readTable_(tab).forEach(function (r) {
      if (normId_(r.usn_or_empid) === id && normPhone_(r.phone) === phone) {
        passes.push(passFor(r.reg_id, r.name));
        return;
      }
      if (!r.members_json) return;
      var members;
      try {
        members = JSON.parse(r.members_json);
      } catch (err) {
        return;
      }
      for (var i = 0; i < members.length; i++) {
        if (normId_(members[i].id) === id && normPhone_(members[i].phone) === phone) {
          passes.push(passFor(r.reg_id, members[i].name));
          return;
        }
      }
    });
  });

  if (!passes.length) {
    cache.put(key, String(fails + 1), LOOKUP_WINDOW_S);
    return { ok: false, code: 'NOT_FOUND' };
  }
  return { ok: true, passes: passes };
}

// ---------------------------------------------------------------------------
// Confirmation email (consumer Gmail accounts: ~100 emails/day quota)
// ---------------------------------------------------------------------------

function knDigits_(s) {
  var d = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'];
  return String(s).replace(/\d/g, function (x) { return d[Number(x)]; });
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * The confirmation email: { subject, text, html }. Kannada block, then English block, same content in both bodies.
 * The "Join the WhatsApp group" line / button appears only when whatsappUrl is a valid link (the caller passes ''
 * otherwise), so a missing link never breaks or changes anything else. Everything dynamic is HTML-escaped; the link
 * has already been validated by cleanWhatsappUrl_.
 */
function buildEmail_(p, ev, regId, whatsappUrl) {
  var tba = 'TODO-CONFIRM';
  var day = Number(CONFIG.day1Date.slice(8, 10));
  var day2 = Number(CONFIG.day2Date.slice(8, 10));
  var range = ev.time + (ev.endTime ? '–' + ev.endTime : ''); // 24 h, e.g. 12:30–16:30
  var timeEn = ev.time === tba ? 'Time to be announced' : range + ' IST';
  var timeKn = ev.time === tba ? 'ಸಮಯ ಶೀಘ್ರದಲ್ಲೇ' : knDigits_(range);
  var venueEn = ev.venue.en === tba ? 'Venue to be announced' : ev.venue.en;
  var venueKn = ev.venue.kn === tba ? 'ಸ್ಥಳ ಶೀಘ್ರದಲ್ಲೇ' : ev.venue.kn;

  var knLines = [
    'ನಮಸ್ಕಾರ ' + p.name + ',',
    'ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ' + knDigits_(2026) + ' — "' + ev.name.kn + '" ಸ್ಪರ್ಧೆಗೆ ನಿಮ್ಮ ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ.',
    'ನೋಂದಣಿ ಐಡಿ: ' + regId,
    'ದಿನ ೧ · ' + knDigits_(day) + ' ನವೆಂಬರ್ · ' + timeKn + ' · ' + venueKn,
    'ಸ್ಥಳದಲ್ಲಿ ಈ ಐಡಿ / ಪಾಸ್ ತೋರಿಸಿ. ' + knDigits_(day2) + ' ನವೆಂಬರ್‌ನ ದಸರಾ ಮೆರವಣಿಗೆಗೂ ಬನ್ನಿ!'
  ];
  var enLines = [
    'Hello ' + p.name + ',',
    'Your registration for "' + ev.name.en + '" at Karnataka Rajyotsava 2026 is confirmed.',
    'Registration ID: ' + regId,
    'Day 1 · ' + day + ' November 2026 · ' + timeEn + ' · ' + venueEn
  ];
  if (p.members.length) {
    enLines.push('Team / ತಂಡ: ' + p.teamName + ' — ' + [p.name].concat(p.members.map(function (m) { return m.name; })).join(', '));
  }
  enLines.push('Show this ID / your pass at the venue. Join us for the Dasara procession on ' + day2 + ' November too!');

  var knJoin = 'ವಾಟ್ಸಾಪ್ ಗುಂಪಿಗೆ ಸೇರಿ';
  var enJoin = 'Join the WhatsApp group';
  var knPass = 'ನಿಮ್ಮ ಪಾಸ್ ವೀಕ್ಷಿಸಿ';
  var enPass = 'View your pass';
  var knPassNote = 'ನೋಂದಣಿಯಲ್ಲಿ ನೀಡಿದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ — ಐಡಿ ಮೊದಲೇ ತುಂಬಿರುತ್ತದೆ.';
  var enPassNote = 'Enter the mobile number you registered with — your ID is already filled in.';
  var signoff = '— Honnudi Kannada Sangha, BMSIT&M';

  // "View your pass": opens the website's pass page with the registration ID filled in; the person types their phone.
  var siteUrl = typeof CONFIG.siteUrl === 'string' ? CONFIG.siteUrl.replace(/\/+$/, '') : '';
  var passUrl = siteUrl ? siteUrl + '/register/success?id=' + encodeURIComponent(regId) : '';

  var text = knLines.concat(passUrl ? [knPass + ': ' + passUrl, knPassNote] : [], whatsappUrl ? [knJoin + ': ' + whatsappUrl] : [],
    ['', '---', ''], enLines, passUrl ? [enPass + ': ' + passUrl, enPassNote] : [],
    whatsappUrl ? [enJoin + ': ' + whatsappUrl] : [], ['', signoff]).join('\n');

  function paras(lines) {
    return lines.map(function (l) { return '<p style="margin:0 0 10px">' + esc_(l) + '</p>'; }).join('');
  }
  function button(url, label, bg) {
    if (!url) return '';
    return '<p style="margin:16px 0 6px"><a href="' + esc_(url) + '" style="display:inline-block;background:' + bg + ';' +
      'color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">' + esc_(label) + '</a></p>' +
      '<p style="margin:0 0 10px;font-size:12px;color:#555555">' + esc_(url) + '</p>';
  }
  function passBlock(label, note) {
    return button(passUrl, label, '#8B1E2D') + (passUrl ? '<p style="margin:0 0 10px;font-size:13px;color:#555555">' + esc_(note) + '</p>' : '');
  }
  var html = '<div style="font-family:Arial,\'Noto Sans Kannada\',sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px">' +
    paras(knLines) + passBlock(knPass, knPassNote) + button(whatsappUrl, knJoin, '#0E6B4D') +
    '<hr style="border:none;border-top:1px solid #dddddd;margin:18px 0">' +
    paras(enLines) + passBlock(enPass, enPassNote) + button(whatsappUrl, enJoin, '#0E6B4D') +
    '<p style="margin:16px 0 0;color:#555555">' + esc_(signoff) + '</p></div>';

  return { subject: 'KR 2026 · ' + ev.name.en + ' · ' + regId, text: text, html: html };
}

function sendConfirmation_(p, ev, regId, whatsappUrl) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.warn('Mail quota exhausted; no confirmation for ' + regId);
      return;
    }
    var mail = buildEmail_(p, ev, regId, whatsappUrl || '');
    var msg = {
      to: p.email,
      subject: mail.subject,
      body: mail.text, // plain-text fallback
      htmlBody: mail.html,
      name: 'Honnudi Kannada Sangha'
    };
    // Replies go to the organisers' contact address from site.json, if one has been set (never invented).
    var contact = typeof CONFIG.contactEmail === 'string' ? CONFIG.contactEmail.trim() : '';
    if (contact && matches_(CONFIG.rules.email.pattern, contact)) msg.replyTo = contact;
    MailApp.sendEmail(msg);
  } catch (err) {
    console.error('Confirmation email failed for ' + regId + ': ' + err);
  }
}

/** Run from the editor to see how many confirmation emails can still be sent today (README §8). */
function checkEmailQuota() {
  console.log('Confirmation emails left today: ' + MailApp.getRemainingDailyQuota());
}

// ---------------------------------------------------------------------------
// One-time setup — run from the Apps Script editor (README step 4). Safe to run again, any time:
// it only ADDS what is missing (the Events tab, an event row, an event tab, a header) and never
// deletes, clears or overwrites a registration or a coordinator's edit.
// ---------------------------------------------------------------------------

function setupSheet() {
  // The event list comes from CONFIG.events in Config.gs — NOT from the Events tab. If Config.gs is stale or empty
  // there is nothing to seed, so stop loudly before touching the spreadsheet.
  assertConfig_();
  var ids = Object.keys(CONFIG.events);
  console.log('Config ' + CONFIG_VERSION + ' (schema ' + CONFIG_SCHEMA + ') lists ' + ids.length + ' events: ' + ids.join(', '));

  var ss = ss_();
  var evSheet = ss.getSheetByName(SHEET_EVENTS) || ss.insertSheet(SHEET_EVENTS);
  var newColumns = ensureEventsHeaders_(evSheet);

  // 1. One row per competition. New rows start OPEN (is_open TRUE); existing rows keep whatever the coordinators set.
  var existing = {};
  readTable_(evSheet).forEach(function (r) { existing[String(r.id).trim()] = r; });
  var report = {};
  ids.forEach(function (id) {
    var e = CONFIG.events[id];
    var row = existing[id];
    report[id] = { row: 'already there', tab: '' };
    if (!row) {
      appendByHeader_(evSheet, {
        id: id, code: e.code, name_en: e.name.en, sheet_name: e.sheetName, deadline_iso: e.deadline, is_open: 'TRUE',
        max_teams: e.maxTeams ? String(e.maxTeams) : ''
      });
      report[id].row = 'ADDED';
    } else if (!String(row.sheet_name || '').trim()) {
      setCellByHeader_(evSheet, row._row, 'sheet_name', e.sheetName); // e.g. a pre-tab-per-event Events tab
      report[id].row = 'sheet_name filled in';
    }
    // max_teams is seeded ONCE, in the run that creates the column (so the cell was just created empty); later runs
    // never touch it, so a coordinator's change (or blank = no limit) stays.
    if (row && newColumns.indexOf('max_teams') !== -1 && e.maxTeams) {
      setCellByHeader_(evSheet, row._row, 'max_teams', String(e.maxTeams));
      report[id].row += '; max_teams set to ' + e.maxTeams;
    }
  });
  evSheet.setFrozenRows(1);

  // 2. One tab per event, named by the Events tab's sheet_name cell (renamed tabs are found again, not duplicated).
  var events = readEvents_();
  var used = {};
  var created = [];
  var existed = [];
  ids.forEach(function (id) {
    var name = events[id] ? events[id].sheetName : '';
    if (!name) throw new Error('Event "' + id + '" has no sheet_name in the ' + SHEET_EVENTS + ' tab — the row could not be written.');
    if (name === SHEET_EVENTS) throw new Error('Event "' + id + '": sheet_name must not be "' + SHEET_EVENTS + '".');
    if (used[name]) throw new Error('Events "' + used[name] + '" and "' + id + '" use the same sheet_name "' + name + '".');
    used[name] = id;
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      created.push(name);
      report[id].tab = 'tab "' + name + '" CREATED';
    } else {
      existed.push(name);
      report[id].tab = 'tab "' + name + '" already existed';
    }
    var added = ensureHeaders_(sh, REG_HEADERS, REG_EXTRA_HEADERS);
    if (added.length) report[id].tab += '; column(s) ' + added.join(', ') + ' appended at the end';
    // Plain text for every data column (phone numbers, USNs, leading zeros) — also for rows typed in by hand.
    // Format only: no cell value is read or written here.
    if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, sh.getLastColumn()).setNumberFormat('@');
    sh.setFrozenRows(1);
    console.log(id + ': Events row ' + report[id].row + '; ' + report[id].tab);
  });

  // 3. Verify what is really in the spreadsheet now, instead of trusting the loops above.
  var after = readEvents_();
  var missing = ids.filter(function (id) { return !after[id]; });
  if (missing.length) {
    throw new Error('Setup failed: the Events tab has no row for ' + missing.join(', ') + ' (Config lists ' + ids.length + ' events).');
  }
  if (readTable_(ss.getSheetByName(SHEET_EVENTS)).length < 1) {
    throw new Error('Setup failed: the Events tab has no event rows after setup.');
  }

  if (ss.getSheetByName(SHEET_OLD_REGS)) {
    console.warn('An old "' + SHEET_OLD_REGS + '" tab exists. It is no longer used (registrations now go to the per-event tabs) ' +
      'and was left untouched — delete it by hand once you have copied anything you need.');
  }
  console.log('Setup complete. Config ' + CONFIG_VERSION + ': ' + ids.length + ' events; ' +
    ids.filter(function (id) { return report[id].row === 'ADDED'; }).length + ' Events row(s) added; ' +
    created.length + ' event tab(s) created' + (created.length ? ' (' + created.join(', ') + ')' : '') + ', ' +
    existed.length + ' already existed. Nothing was deleted or overwritten.');
}

/** Run from the editor to see which Config.gs this project is using (version, schema, events) without changing anything. */
function checkConfig() {
  assertConfig_();
  console.log('Config.gs OK — version ' + CONFIG_VERSION + ', schema ' + CONFIG_SCHEMA + ', ' + Object.keys(CONFIG.events).length +
    ' events: ' + Object.keys(CONFIG.events).join(', '));
}

/**
 * Events tab: create the header row, or APPEND any column that is missing after the last one. Extra columns are left
 * alone, nothing moves. Returns the names of the columns appended to an existing tab ([] for a brand-new tab).
 */
function ensureEventsHeaders_(sh) {
  if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) {
    sh.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
    sh.getRange(1, 1, 1, EVENT_HEADERS.length).setFontWeight('bold');
    plainTextBelow_(sh, EVENT_HEADERS.indexOf('whatsapp_url') + 1);
    plainTextBelow_(sh, EVENT_HEADERS.indexOf('max_teams') + 1);
    return [];
  }
  var added = [];
  var current = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  EVENT_HEADERS.forEach(function (h) {
    if (current.indexOf(h) !== -1) return;
    var col = current.length + 1;
    sh.getRange(1, col).setValues([[h]]);
    sh.getRange(1, col).setFontWeight('bold');
    plainTextBelow_(sh, col); // format only — existing cells keep their values
    current.push(h);
    added.push(h);
  });
  return added;
}

/** Makes the cells under a header plain text, so a pasted link is stored as typed. Changes the format only, never a value. */
function plainTextBelow_(sh, col) {
  if (sh.getMaxRows() > 1) sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat('@');
}

/**
 * Event tab header row. A brand-new tab gets headers + extras. On an existing tab the first columns must already be
 * `headers` (in order); every extra column that is missing is APPENDED after the last used column — existing columns
 * and rows never move, and no data cell is touched. Returns the names of the columns it appended.
 */
function ensureHeaders_(sh, headers, extras) {
  extras = extras || [];
  var current = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0] : [];
  if (current.join('') === '' && sh.getLastRow() <= 1) {
    var all = headers.concat(extras);
    sh.getRange(1, 1, 1, all.length).setValues([all]);
    sh.getRange(1, 1, 1, all.length).setFontWeight('bold');
    return [];
  }
  for (var i = 0; i < headers.length; i++) {
    if (String(current[i]).trim() !== headers[i]) {
      throw new Error('Tab "' + sh.getName() + '" row 1 must start with: ' + headers.join(' | '));
    }
  }
  var lastCol = sh.getLastColumn();
  var row1 = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var added = [];
  extras.forEach(function (h) {
    if (row1.indexOf(h) !== -1) return;
    lastCol++;
    sh.getRange(1, lastCol).setValues([[h]]);
    row1.push(h);
    added.push(h);
  });
  sh.getRange(1, 1, 1, lastCol).setFontWeight('bold');
  return added;
}

/** Writes one cell, found by header name, as plain text. */
function setCellByHeader_(sh, row, header, value) {
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var col = headers.indexOf(header) + 1;
  if (col < 1) throw new Error('Tab "' + sh.getName() + '" has no "' + header + '" column.');
  var range = sh.getRange(row, col);
  range.setNumberFormat('@');
  range.setValues([[safeCell_(value)]]);
}
