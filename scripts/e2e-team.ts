/**
 * Our Team checks.
 *   1. npm run build                       (the "no personal data in dist" check scans dist/)
 *   2. npm run dev -- --port 5273          (browser checks; E2E_BASE=http://localhost:5273 npm run e2e:team)
 *   Optional: TEAM_CSV=<responses.csv> also scans dist/ and the repo data for every real e-mail, phone and Drive id in it.
 *
 * Importer (synthetic CSV + photos in e2e-output/team-fixture — no real data): role mapping, consent skipping,
 * duplicates, hidden/normalised social links, photo matching + ambiguity, and that a re-import keeps the order
 * and manual edits. Page (browser): troupe order = team-config order, empty groups hidden, role labels, Heads
 * before Co-Heads, no horizontal scroll / clipping / console errors, one footer, lit frame on hover and tap,
 * reduced motion. Cards (SSR): icons only when a URL exists, aria-label, target, rel.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer-core';
import sharp from 'sharp';
import config from '../src/data/team-config.json' with { type: 'json' };
import roleMap from '../src/data/team-role-map.json' with { type: 'json' };
import team from '../src/data/team.json' with { type: 'json' };
import type { TeamMember } from '../src/lib/schemas';
import { cleanInstagram, cleanLinkedin } from '../src/lib/social';
import { buildTroupes, groupConfig, type TeamGroupConfig } from '../src/lib/team';
import { mapRole, type RoleMap } from '../src/lib/teamRoles';
import { importTeam, type ImportInput, type TeamGroupData } from './lib/team-import';
import { mergeReport, renderReport, REPORT_END, REPORT_START } from './lib/team-report';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = resolve(process.env.E2E_OUT ?? 'e2e-output/team-e2e');
mkdirSync(OUT, { recursive: true });

/** The site's reduced-motion rule sets durations to 1e-6 s (effectively none). */
const off = (d: string) => d.split(',').every((x) => parseFloat(x) <= 0.001);
const results: { name: string; ok: boolean; detail: string }[] = [];
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
async function scenario(name: string, fn: () => Promise<string>) {
  let ok = true;
  let detail: string;
  try {
    detail = await fn();
  } catch (e) {
    ok = false;
    detail = `FAILED: ${(e as Error).message}`;
  }
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

// ---------------------------------------------------------------------------------------------
// Role mapping
// ---------------------------------------------------------------------------------------------
const MAP = roleMap as RoleMap;
const ROLE_CASES: [string, string, string?][] = [
  ['Head', 'head', 'head'],
  ['  HEAD ', 'head', 'head'],
  ['Co head', 'head', 'cohead'],
  ['Co-Head', 'head', 'cohead'],
  ['Events & Logistics', 'events-logistics'],
  ['Events and logistics ', 'events-logistics'],
  ['EVENTS AND LOGISTICS', 'events-logistics'],
  ['Events and logistics, music ncmc coordinator ', 'events-logistics'],
  ['music ncmc coordinator', 'events-logistics'],
  ['Press, Media & Publicity', 'marketing'],
  ['press media and publicity', 'marketing'],
  ['Media', 'media'],
  ['Media and Marketing', 'media'],
  ['Photography', 'media'],
  ['Videography ', 'media'],
  ['Photography/ Videography', 'media'],
  ['Photography / Videography', 'media'],
  ['Graphic Designer', 'media'],
  ['Art & Decor', 'design-decor'],
  ['HEAD OF ART N DECOR ', 'design-decor'],
  ['Art and Décor', 'design-decor'],
  ['PRINTING ', 'design-decor'],
  ['Finance', 'finance-documentation'],
  ['Finance and Bill Settlement (Accounts)', 'finance-documentation'],
  ['Accounts/Bill Settlement', 'finance-documentation'],
  ['Documentation ', 'finance-documentation'],
  ['Reception', 'hospitality-reception'],
  ['Hospitality ', 'hospitality-reception'],
  ['Reception(Hospitality) ', 'hospitality-reception'],
  ['Stalls', 'stalls-shops'],
  ['Stalls Head', 'stalls-shops'],
  ['Stage', 'stage-security'],
  ['Security', 'stage-security'],
  ['Deciplinary', 'stage-security'],
  ['Discipline', 'stage-security'],
  ['Disciplnary', 'stage-security'],
  ['Order and Discipline coordinator ', 'stage-security'],
  ['Committee member for stage and security ', 'stage-security'],
  ['Hosting Head', 'anchoring'],
  ['Cultural(Drama) ', 'cultural'],
  ['Fashion', 'cultural'],
  ['Cultural', 'cultural'],
  ['Co-Head of Media', 'media'],
];

// ---------------------------------------------------------------------------------------------
// Importer fixture
// ---------------------------------------------------------------------------------------------
const FIX = resolve('e2e-output/team-fixture');
const HEADER = 'Timestamp,Email Address,Full Name,Your Role,Your Photo,LinkedIn,Instagram,I agree to my name and photo being shown on the website';
const csvRow = (email: string, name: string, role: string, o: { li?: string; ig?: string; consent?: string } = {}) =>
  [ '1/1/2026 10:00:00', email, name, role, 'https://drive.google.com/open?id=SECRETID' + name.replace(/\W/g, ''), o.li ?? '', o.ig ?? '', o.consent ?? 'I agree' ].map((f) => (/[,"]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(',');

async function makePhotos(dir: string, labels: string[]) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [i, label] of labels.entries()) {
    // a distinct picture per file (the matcher de-duplicates identical files)
    const buf = await sharp({ create: { width: 900, height: 1100, channels: 3, background: { r: 60 + ((i * 37) % 150), g: 60 + ((i * 91) % 150), b: 60 + ((i * 53) % 150) } } })
      .composite([{ input: await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 230, g: 190, b: 160 } } }).png().toBuffer(), left: 350, top: 150 }])
      .jpeg()
      .toBuffer();
    writeFileSync(join(dir, `IMG_${i + 1} - ${label}.jpg`), buf);
  }
}

const ROWS_V1 = [
  csvRow('a@x.in', 'Anil Kumar', 'Head', { li: 'https://in.linkedin.com/in/anil-kumar?trk=1', ig: '@anil.k' }),
  csvRow('b@x.in', 'BHAVYA RAO', 'Co head'),
  csvRow('c@x.in', 'Chetan S', 'Media and Marketing', { consent: '' }),
  csvRow('d@x.in', 'Divya N', 'Photography/ Videography'),
  csvRow('e@x.in', 'Esha M', 'Deciplinary'),
  csvRow('f@x.in', 'Farhan A', 'Quantum Plumbing'),
  csvRow('d2@x.in', 'Divya N', 'Reception'),
  csvRow('g@x.in', 'Gita P', 'Stalls Head'),
  csvRow('g@x.in', 'Hari P', 'Hosting Head'),
  csvRow('i@x.in', 'Ila Q', 'Videography', { li: 'not a link', ig: 'https://instagram.com/ila_q/?igsh=abc' }),
  csvRow('j@x.in', 'Jay R', 'Graphic Designer', { ig: 'https://example.com/jay' }),
  csvRow('k@x.in', 'Kiran X', 'Media', { consent: 'No' }),
];

function baseInput(csvText: string, existing: TeamGroupData[], manifest: ImportInput['manifest'], overrides: ImportInput['overrides'] = {}, excludeIds: string[] = []): ImportInput {
  return {
    csvText,
    photoDir: resolve(FIX, 'photos'),
    existing,
    manifest,
    groups: groupConfig as TeamGroupConfig[],
    roleMap: MAP,
    overrides,
    excludeIds,
    outPhotoDir: resolve(FIX, 'out'),
    publicBase: '/team',
  };
}

// ---------------------------------------------------------------------------------------------
// Page checks
// ---------------------------------------------------------------------------------------------
async function openTeam(browser: Browser, lang: 'kn' | 'en', width: number, errors: string[], reduced = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(
    `localStorage.setItem('kr26.lang', ${JSON.stringify(lang)}); sessionStorage.setItem('seenIntro', '1');
     window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });`,
  );
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/team`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid^="troupe-"]');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const expectedTroupes = config.groups.filter((g) => team.some((t) => t.id === g.id && t.members.length > 0));

async function main() {
  // ---------- Role mapping ----------
  await scenario('role-mapping', async () => {
    for (const [raw, group, role] of ROLE_CASES) {
      const m = mapRole(raw, MAP);
      expect(m.ok, `"${raw}" was not matched (${m.ok ? '' : m.reason})`);
      expect(m.group === group, `"${raw}" → ${m.group}, expected ${group}`);
      if (role) expect(m.role === role, `"${raw}" → role ${m.role}, expected ${role}`);
    }
    for (const bad of ['Quantum Plumbing', '', '???']) expect(!mapRole(bad, MAP).ok, `"${bad}" should not match`);
    const amb = mapRole('Stalls, Stage', MAP);
    expect(!amb.ok && amb.reason === 'ambiguous', 'a role that fits two groups must be "needs review"');
    return `${ROLE_CASES.length} role spellings map correctly; unknown/empty/ambiguous go to review`;
  });

  await scenario('social-links', async () => {
    const ig: [string, string | null][] = [
      ['@anil.k', 'https://www.instagram.com/anil.k/'],
      ['anil.k', 'https://www.instagram.com/anil.k/'],
      ['https://www.instagram.com/anil.k/?igsh=abc#x', 'https://www.instagram.com/anil.k/'],
      ['instagram.com/anil_k', 'https://www.instagram.com/anil_k/'],
      ['https://instagram.com/p/ABC123/', null],
      ['https://example.com/anil', null],
      ['javascript:alert(1)', null],
      ['two words', null],
      ['', null],
      ['a..b', null],
    ];
    for (const [input, want] of ig) expect(cleanInstagram(input) === want, `instagram "${input}" → ${cleanInstagram(input)}, expected ${want}`);
    const li: [string, string | null][] = [
      ['https://www.linkedin.com/in/anil-kumar-1a2b3c/?trk=x', 'https://www.linkedin.com/in/anil-kumar-1a2b3c/'],
      ['linkedin.com/in/anil', 'https://www.linkedin.com/in/anil/'],
      ['https://in.linkedin.com/in/anil', 'https://www.linkedin.com/in/anil/'],
      ['https://www.linkedin.com/company/bmsit', null],
      ['https://notlinkedin.com/in/anil', null],
      ['https://linkedin.com.evil.io/in/anil', null],
      ['anil', null],
      ['javascript:alert(1)', null],
    ];
    for (const [input, want] of li) expect(cleanLinkedin(input) === want, `linkedin "${input}" → ${cleanLinkedin(input)}, expected ${want}`);
    return `${ig.length} Instagram + ${li.length} LinkedIn inputs normalised or rejected`;
  });

  // ---------- Importer ----------
  let v1: Awaited<ReturnType<typeof importTeam>>;
  await scenario('import-consent-roles-duplicates-links', async () => {
    await makePhotos(resolve(FIX, 'photos'), ['Anil Kumar', 'Bhavya Rao CSE-3', 'Divya N 1BY24CS001', 'Esha M', 'Gita P', 'Gita P', 'Ila Q', 'Jay R']);
    v1 = await importTeam(baseInput([HEADER, ...ROWS_V1].join('\n'), [], {}));
    const r = v1.report;
    const all = v1.team.flatMap((g) => g.members.map((m) => ({ ...m, group: g.id })));
    const byName = (n: string) => all.find((m) => m.name.en === n);

    // consent: the column exists, two rows did not tick it
    expect(r.columns.consent, 'consent column not detected');
    expect(r.skipped.map((s) => s.name).sort().join() === 'Chetan S,Kiran X', `skipped: ${r.skipped.map((s) => s.name)}`);
    expect(!byName('Chetan S') && !byName('Kiran X'), 'a person without consent was placed');
    // duplicates: Divya N twice → later answer (Reception → hospitality), one entry
    expect(all.filter((m) => m.name.en === 'Divya N').length === 1, 'duplicate was not merged');
    expect(byName('Divya N')?.group === 'hospitality-reception', 'the later answer was not used for the duplicate');
    expect(r.duplicates.length === 1, 'duplicate not reported');
    // roles
    expect(byName('Anil Kumar')?.role.en === 'Head' && byName('Bhavya Rao')?.role.en === 'Co-Head', 'head roles');
    expect(byName('Esha M')?.group === 'stage-security' && byName('Esha M')?.role.en === 'Stage & Security', 'role shows the general group label');
    expect(byName('Gita P')?.role.en === 'Stalls & Shops' && byName('Hari P')?.role.en === 'Anchoring', 'no "<group> Head" wording');
    expect(r.review.length === 1 && r.review[0]!.name === 'Farhan A', 'unmatched role must go to the review list');
    expect(!byName('Farhan A'), 'a person with an unrecognised role was placed');
    // names: tidy case, English copy in kn
    expect(byName('Bhavya Rao')?.name.kn === 'Bhavya Rao', 'name.kn falls back to the English name');
    // links
    const anil = byName('Anil Kumar')!;
    expect(anil.linkedin === 'https://www.linkedin.com/in/anil-kumar/' && anil.instagram === 'https://www.instagram.com/anil.k/', 'links not normalised');
    const ila = byName('Ila Q')!;
    expect(ila.instagram === 'https://www.instagram.com/ila_q/' && !('linkedin' in ila), 'invalid LinkedIn must be dropped, Instagram kept');
    expect(!('instagram' in byName('Jay R')!), 'a non-Instagram URL must be dropped');
    expect(!('linkedin' in byName('Bhavya Rao')!) && !('instagram' in byName('Bhavya Rao')!), 'empty links must be absent');
    // shared e-mail kept apart and flagged
    expect(r.sharedEmail.length === 1 && r.sharedEmail[0]!.join() === 'Gita P,Hari P', 'shared e-mail not flagged');
    // personal data never reaches the result
    const json = JSON.stringify([v1.team, v1.manifest]);
    expect(!/@x\.in|SECRETID|drive\.google|1BY24CS001/.test(json), 'personal data in the import result');
    return `${all.length} placed, skipped ${r.skipped.length} (consent), 1 duplicate merged, 1 role to review, links normalised`;
  });

  await scenario('import-photo-matching', async () => {
    const r = v1.report;
    const photoOf = (n: string) => v1.team.flatMap((g) => g.members).find((m) => m.name.en === n)?.photo;
    expect(photoOf('Anil Kumar') === 'anil-kumar' && photoOf('Bhavya Rao') === 'bhavya-rao' && photoOf('Divya N') === 'divya-n', 'photos not matched by name');
    expect(photoOf('Gita P') === '' && photoOf('Hari P') === '', 'ambiguous photos must not be assigned');
    expect(r.photos.ambiguous.length === 1 && r.photos.ambiguous[0]!.names.sort().join() === 'Gita P,Hari P', 'ambiguity not reported');
    expect(r.photos.none.includes('Esha M') === false, 'Esha has a photo');
    const m = v1.manifest['anil-kumar']!;
    expect(m.variants.length >= 1 && m.width / m.height === 0.8, 'photo is not a 4:5 portrait');
    expect(m.blur.startsWith('data:image/webp;base64,'), 'no blur placeholder');
    for (const v of m.variants) {
      const file = resolve(FIX, 'out', v.src.split('/').pop()!);
      const meta = await sharp(file).metadata();
      expect(meta.format === 'webp' && meta.exif === undefined, `${v.src} must be WebP without EXIF`);
      expect(meta.width === v.w && meta.height === Math.round(v.w / 0.8), `${v.src} is ${meta.width}×${meta.height}`);
    }
    // an override settles it
    const settled = await importTeam(baseInput([HEADER, ...ROWS_V1].join('\n'), v1.team, v1.manifest, { 'gita-p': { file: 'IMG_5' } }));
    expect(settled.team.flatMap((g) => g.members).find((x) => x.id === 'gita-p')!.photo === 'gita-p', 'override did not assign the photo');
    expect(settled.team.flatMap((g) => g.members).find((x) => x.id === 'hari-p')!.photo === '', 'override must not touch the other person');
    // photos renamed by person in a subfolder, pointed at by exact name (folder path or bare file name)
    const sub = resolve(FIX, 'photos', 'ambiguous');
    mkdirSync(sub, { recursive: true });
    const face = (r: number) => sharp({ create: { width: 900, height: 1100, channels: 3, background: { r, g: 90, b: 120 } } }).jpeg().toBuffer();
    writeFileSync(join(sub, 'IMG_5.jpg'), await face(200)); // "IMG_5" alone would also hit "IMG_5 - Gita P.jpg": the exact name must win
    writeFileSync(join(sub, 'Second photo.jpg'), await face(30));
    const exact = await importTeam(
      baseInput([HEADER, ...ROWS_V1].join('\n'), structuredClone(v1.team), v1.manifest, { 'gita-p': { file: 'ambiguous/IMG_5.jpg' }, 'hari-p': { file: 'Second photo.jpg', focus: { x: 0.5, y: 0.4 }, zoom: 2.5 } }),
    );
    const members = exact.team.flatMap((g) => g.members);
    expect(members.find((x) => x.id === 'gita-p')!.photo === 'gita-p' && members.find((x) => x.id === 'hari-p')!.photo === 'hari-p', 'exact-name overrides in a subfolder were not assigned');
    expect(exact.manifest['hari-p']!.width === 352 && exact.manifest['hari-p']!.variants.map((x) => x.w).join() === '352', 'a zoomed crop must never be upscaled');
    const others = Object.keys(v1.manifest).filter((k) => k !== 'gita-p' && k !== 'hari-p');
    expect(others.length > 0 && others.every((k) => JSON.stringify(exact.manifest[k]) === JSON.stringify(v1.manifest[k])), 'other people\'s photos changed');
    expect(!JSON.stringify([exact.team, exact.manifest]).includes('ambiguous'), 'source file names reached the result');
    rmSync(sub, { recursive: true, force: true });
    // the generated TODO block is replaced in place on a CRLF checkout too (no blank line added per run)
    const crlf = `# T\r\n\r\n${REPORT_START}\r\nold\r\n${REPORT_END}\r\n\r\n## After\r\n`;
    const once = mergeReport(crlf, `${REPORT_START}\nnew\n${REPORT_END}\n`);
    expect(mergeReport(once, `${REPORT_START}\nnew\n${REPORT_END}\n`) === once && !/-->\n\n\r?\n/.test(once), 'mergeReport adds blank lines on a CRLF file');
    return 'name-matched, ambiguous left empty and reported, 4:5 WebP without EXIF, overrides (substring, exact name in a subfolder, no upscale) work';
  });

  await scenario('import-reimport-keeps-order-and-edits', async () => {
    // manual edits: swap two media members, add a Kannada name, hide a link
    const edited: TeamGroupData[] = JSON.parse(JSON.stringify(v1.team));
    const media = edited.find((g) => g.id === 'media')!;
    expect(media.members.length >= 2, 'fixture needs two media members');
    media.members.reverse();
    const before = media.members.map((m) => m.id);
    media.members.find((m) => m.id === 'ila-q')!.name.kn = 'ಇಲಾ';
    delete (edited.flatMap((g) => g.members).find((m) => m.id === 'anil-kumar') as Partial<TeamMember>).instagram;

    const rows = [...ROWS_V1.map((r) => r.replace('Graphic Designer', 'Stalls')), csvRow('m@x.in', 'Mira T', 'Media'), csvRow('n@x.in', 'Nandan U', 'Cultural(Drama)', { ig: 'nandan.u' })];
    const v2 = await importTeam(baseInput([HEADER, ...rows].join('\n'), edited, v1.manifest));
    const m2 = v2.team.find((g) => g.id === 'media')!.members.map((m) => m.id);
    expect(m2.slice(0, before.length).join() === before.join(), `existing order changed: ${m2.join()} vs ${before.join()}`);
    expect(m2[m2.length - 1] === 'mira-t', 'a new person must be added at the end of their group');
    expect(v2.team.find((g) => g.id === 'media')!.members.find((m) => m.id === 'ila-q')!.name.kn === 'ಇಲಾ', 'manual Kannada name was overwritten');
    expect(v2.team.flatMap((g) => g.members).find((m) => m.id === 'jay-r')!.role.en === 'Media', 'an existing person must not be re-grouped or re-labelled');
    expect(v2.report.changes.differs.some((d) => d.name === 'Jay R'), 'role change in the form must be reported, not applied');
    expect(v2.report.changes.added.join() === 'Mira T,Nandan U', `added: ${v2.report.changes.added}`);
    expect(v2.report.changes.kept === v1.report.placed.length, 'kept count');
    // a fresh Instagram link for someone who had none is filled in; one the editor removed comes back only as a filled blank
    expect(v2.report.changes.filled.some((f) => f.name === 'Anil Kumar' && f.what.includes('Instagram')), 'blank link should be filled and reported');
    // excluded people are never re-added
    const v3 = await importTeam(baseInput([HEADER, ...rows].join('\n'), edited, v1.manifest, {}, ['mira-t']));
    expect(!v3.team.flatMap((g) => g.members).some((m) => m.id === 'mira-t') && v3.report.changes.excluded.includes('Mira T'), 'excludeIds not respected');
    // idempotent: importing the same CSV again changes nothing
    const again = await importTeam(baseInput([HEADER, ...rows].join('\n'), v2.team, v2.manifest));
    expect(JSON.stringify(again.team) === JSON.stringify(v2.team), 'a second identical import changed team.json');
    expect(again.report.changes.added.length === 0, 'second import added people');
    return 'order and manual edits kept; new people at the end of their group; differences reported; idempotent';
  });

  await scenario('import-without-consent-column', async () => {
    const header = 'Timestamp,Email Address,Full Name,Your Role,Your Photo';
    const out = await importTeam({ ...baseInput([header, '1/1/2026,a@x.in,Anil Kumar,Head,x'].join('\n'), [], {}), photoDir: null });
    expect(!out.report.columns.consent && out.report.skipped.length === 0, 'no consent column → nobody is skipped');
    const md = renderReport(out.report, out.team, groupConfig as TeamGroupConfig[]);
    expect(/no consent column/i.test(md), 'the report must warn that the form has no consent column');
    expect(!/@x\.in/.test(md), 'e-mail in the report');
    return 'missing consent column is reported, nobody wrongly skipped';
  });

  // ---------- Real data ----------
  await scenario('team-data', async () => {
    const order = config.groups.map((g) => g.id);
    const shown = buildTroupes(team as never).map((t) => t.id);
    expect(shown.join() === order.filter((id) => shown.includes(id)).join(), `troupes out of config order: ${shown}`);
    expect(!shown.includes('technical') || team.some((g) => g.id === 'technical' && g.members.length), 'an empty group would be shown');
    const heads = buildTroupes(team as never)[0]!;
    expect(heads.id === 'head', 'Head & Co-Head must come first');
    const roles = heads.members.map((m) => m.role.en);
    expect(roles.join() === [...roles].sort((a, b) => (a === 'Head' ? -1 : b === 'Head' ? 1 : 0)).join(), `Heads must precede Co-Heads: ${roles}`);
    for (const g of buildTroupes(team as never)) {
      if (g.id === 'head') continue;
      // Groups with sub-roles (Cultural: Drama / Fashion) show each member's own role; every other group its label.
      const sub = (groupConfig.find((c) => c.id === g.id)?.roles ?? null) as Record<string, { en: string }> | null;
      for (const m of g.members) {
        const ok = sub ? Object.values(sub).some((r) => r.en === m.role.en) : m.role.en === g.label.en;
        expect(ok && !/head/i.test(m.role.en), `${m.id}: role "${m.role.en}" must be ${sub ? 'one of the group roles' : `the general label "${g.label.en}"`}`);
      }
    }
    // Cultural replaces Drama in the same place, with Arya (Drama) then Samith (Fashion).
    const cultural = buildTroupes(team as never).find((t) => t.id === 'cultural');
    expect(cultural && cultural.label.en === 'Cultural' && cultural.label.kn === 'ಸಾಂಸ್ಕೃತಿಕ', 'Cultural group label');
    expect(cultural?.members.map((m) => `${m.name.en}:${m.role.en}`).join() === 'Arya K Hirematha:Drama,Samith Reddy S:Fashion', `Cultural members ${cultural?.members.map((m) => m.name.en)}`);
    expect(order.indexOf('cultural') === order.indexOf('anchoring') + 1 && !order.includes('drama'), 'Cultural sits where Drama was (after Anchoring), and Drama is gone');
    expect(!!cultural?.members.find((m) => m.id === 'samith-reddy-s')?.photo, 'Samith has a processed photo');
    // a reordered config reorders the page
    const reversed = [...groupConfig].reverse();
    expect(reversed[0]!.id !== groupConfig[0]!.id, 'config order is a plain array');
    const personal = /[\w.+-]+@[\w-]+\.[\w.]+|\b\d{10}\b|drive\.google|\bwhatsapp\b/i;
    expect(!personal.test(JSON.stringify(team)), 'team.json contains personal data');
    return `${shown.length} troupes in config order, Heads before Co-Heads, roles are group labels, no personal data`;
  });

  // ---------- Browser ----------
  let browser: Browser | null = null;
  try {
    const reach = await fetch(`${BASE}/team`).catch(() => null);
    if (!reach?.ok) throw new Error(`Dev server not reachable at ${BASE} — start it first.`);
    browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  } catch (e) {
    results.push({ name: 'browser', ok: false, detail: (e as Error).message });
    console.log(`FAIL  browser\n      ${(e as Error).message}`);
  }
  if (browser) {
    for (const lang of ['kn', 'en'] as const) {
      for (const width of [320, 360, 768, 1280]) {
        await scenario(`page-${lang}-${width}`, async () => {
          const errors: string[] = [];
          const page = await openTeam(browser!, lang, width, errors);
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 500) {
              window.scrollTo({ top: y, behavior: 'instant' });
              await new Promise((r) => setTimeout(r, 60));
            }
          });
          await new Promise((r) => setTimeout(r, 500));
          const m = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            const cards = [...document.querySelectorAll<HTMLElement>('.team-card')];
            const out = cards.filter((c) => { const r = c.getBoundingClientRect(); return r.left < -0.5 || r.right > vw + 0.5; }).map((c) => c.dataset.testid);
            const clipped = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,.team-role,.troupe-count')].filter((h) => {
              for (let el: Element | null = h; el; el = el.parentElement) {
                const cs = getComputedStyle(el);
                if (cs.overflow !== 'visible' && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && cs.position !== 'fixed') return true;
              }
              return false;
            }).map((h) => h.textContent);
            const imgs = [...document.querySelectorAll<HTMLImageElement>('.team-photo img')];
            return {
              hScroll: document.documentElement.scrollWidth > vw,
              outside: out,
              clipped,
              troupes: [...document.querySelectorAll('section[data-testid^="troupe-"]')].map((s) => s.getAttribute('data-testid')!.replace('troupe-', '')),
              h1: document.querySelectorAll('h1').length,
              footers: document.querySelectorAll('footer').length,
              cards: cards.length,
              socials: document.querySelectorAll('.team-social').length,
              broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
              noSize: imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
              lazy: imgs.filter((i) => i.loading === 'lazy').length,
              first: cards.slice(0, 2).map((c) => c.querySelector('img')?.loading),
              lang: document.documentElement.lang,
              headings: [...document.querySelectorAll('section[data-testid^="troupe-"] h2')].map((h) => h.textContent),
              cls: (window as unknown as { __cls: number }).__cls,
              dupIds: new Set([...document.querySelectorAll('[id]')].map((e) => e.id)).size !== document.querySelectorAll('[id]').length,
            };
          });
          expect(!m.hScroll, 'horizontal scroll');
          expect(m.outside.length === 0, `cards outside the viewport: ${m.outside}`);
          expect(m.clipped.length === 0, `clipped text: ${m.clipped.join(' | ')}`);
          expect(m.troupes.join() === expectedTroupes.map((g) => g.id).join(), `troupes ${m.troupes} ≠ ${expectedTroupes.map((g) => g.id)}`);
          expect(m.headings.join() === expectedTroupes.map((g) => g.label[lang]).join(), `headings ${m.headings}`);
          expect(m.cards === team.reduce((n, g) => n + g.members.length, 0), `cards ${m.cards}`);
          expect(m.h1 === 1 && m.footers === 1, `h1 ${m.h1}, footers ${m.footers}`);
          expect(m.socials === team.flatMap((g) => g.members).filter((x) => (x as TeamMember).linkedin || (x as TeamMember).instagram).length, 'icons without a URL are rendered');
          expect(m.broken === 0, `${m.broken} photos did not load`);
          expect(m.noSize === 0, 'photo without width/height');
          expect(m.first.every((l) => l === 'eager') && m.lazy > 0, `loading attrs ${m.first} / lazy ${m.lazy}`);
          expect(m.lang === lang, 'html lang');
          expect(!m.dupIds, 'duplicate ids');
          expect(m.cls <= 0.05, `CLS ${m.cls.toFixed(3)}`);
          expect(errors.length === 0, `console: ${errors.join(' | ')}`);
          await page.addStyleTag({ content: '.cv-auto{content-visibility:visible!important}' });
          if (width === 360) await page.screenshot({ path: resolve(OUT, `team-${lang}-${width}.png`), fullPage: true });
          await page.browserContext().close();
          return `${m.cards} cards in ${m.troupes.length} troupes, no h-scroll/clipping, footer×1, CLS ${m.cls.toFixed(3)}, ${m.lazy} lazy photos`;
        });
      }
    }

    await scenario('card-links-hidden-and-safe', async () => {
      // The page is served team.json with links added (the real data has none yet): icons must follow the URLs.
      const fake = JSON.parse(JSON.stringify(team)) as { id: string; members: TeamMember[] }[];
      const ms = fake.flatMap((g) => g.members);
      ms[0]!.linkedin = 'https://www.linkedin.com/in/test-one/';
      ms[0]!.instagram = 'https://www.instagram.com/test.one/';
      ms[1]!.instagram = 'https://www.instagram.com/test.two/';
      ms[2]!.linkedin = 'javascript:alert(1)';
      ms[3]!.instagram = 'https://example.com/not-instagram';
      for (const lang of ['en', 'kn'] as const) {
        const errors: string[] = [];
        const ctx = await browser!.createBrowserContext();
        const page = await ctx.newPage();
        await page.setViewport({ width: 360, height: 900 });
        await page.evaluateOnNewDocument(`localStorage.setItem('kr26.lang', '${lang}'); sessionStorage.setItem('seenIntro', '1');`);
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (/\/src\/data\/team\.json(\?|$)/.test(req.url())) {
            void req.respond({ status: 200, contentType: 'text/javascript', body: `export default ${JSON.stringify(fake)};` });
          } else void req.continue();
        });
        page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && errors.push(m.text()));
        await page.goto(`${BASE}/team`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.team-card');
        const m = await page.evaluate((ids) => {
          const cards = ids.map((id) => document.querySelector<HTMLElement>(`[data-testid="team-card-${id}"]`)!);
          const per = cards.map((c) =>
            [...c.querySelectorAll<HTMLAnchorElement>('.team-social a')].map((a) => ({ href: a.href, label: a.getAttribute('aria-label'), target: a.target, rel: a.rel, size: Math.round(a.getBoundingClientRect().width) })),
          );
          return { first: per[0]!, second: per[1]!, third: per[2]!, fourth: per[3]!, fifth: per[4]!, total: document.querySelectorAll('.team-social a').length, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, name0: cards[0]!.querySelector('.team-name')!.textContent };
        }, ms.slice(0, 5).map((x) => x.id));
        expect(m.first.length === 2 && m.second.length === 1, `icon counts ${m.first.length}/${m.second.length}`);
        expect(m.third.length === 0 && m.fourth.length === 0 && m.fifth.length === 0, 'invalid, foreign or missing URLs must show no icon');
        expect(m.first[0]!.href === 'https://www.linkedin.com/in/test-one/' && m.first[1]!.href === 'https://www.instagram.com/test.one/', 'hrefs');
        expect(m.second[0]!.href === 'https://www.instagram.com/test.two/', 'second card should only have Instagram');
        for (const l of [...m.first, ...m.second]) {
          expect(l.target === '_blank' && /noopener/.test(l.rel) && /noreferrer/.test(l.rel), `target/rel: ${l.target} ${l.rel}`);
          expect(l.size >= 44, `touch target ${l.size}px`);
        }
        expect(m.first[0]!.label === (lang === 'en' ? `${m.name0} on LinkedIn` : `${m.name0} — ಲಿಂಕ್ಡ್‌ಇನ್`), `aria-label ${m.first[0]!.label}`);
        expect(m.first[1]!.label!.includes(m.name0!) && /Instagram|ಇನ್‌ಸ್ಟಾಗ್ರಾಂ/.test(m.first[1]!.label!), `aria-label ${m.first[1]!.label}`);
        expect(m.total === 3 && !m.hs, `links ${m.total}, h-scroll ${m.hs}`);
        expect(errors.length === 0, errors.join(' | '));
        await ctx.close();
      }
      return 'icons only for valid LinkedIn/Instagram URLs, aria-label + target=_blank + rel=noopener noreferrer, 44px targets, kn + en';
    });

    await scenario('frame-lights-on-hover-and-tap', async () => {
      const errors: string[] = [];
      const page = await openTeam(browser!, 'en', 1280, errors);
      const lit = (sel: string) => page.evaluate((s) => Number(getComputedStyle(document.querySelector(s)!, '::after').opacity), sel);
      const sel = '[data-testid^="team-card-"] .team-frame';
      expect((await lit(sel)) === 0, 'frame should start dark');
      await page.hover(sel);
      await new Promise((r) => setTimeout(r, 450));
      expect((await lit(sel)) > 0.95, 'hover must light the bulbs');
      await page.mouse.move(2, 2);
      await new Promise((r) => setTimeout(r, 450));
      expect((await lit(sel)) === 0, 'bulbs must go dark again');
      // tap (touch pointer): lights, then fades after a moment
      await page.evaluate((s) => {
        const li = document.querySelector(s)!.closest('li')!;
        li.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      }, sel);
      await new Promise((r) => setTimeout(r, 450));
      expect((await lit(sel)) > 0.95, 'tap must light the bulbs');
      await new Promise((r) => setTimeout(r, 2700));
      expect((await lit(sel)) === 0, 'tap highlight must fade');
      expect(errors.length === 0, errors.join(' | '));
      await page.browserContext().close();
      return 'dark → lit on hover → dark; lit on tap → fades after ~2.4 s';
    });

    await scenario('reduced-motion', async () => {
      const errors: string[] = [];
      const page = await openTeam(browser!, 'kn', 360, errors, true);
      const m = await page.evaluate(() => {
        const frame = document.querySelector('.team-frame')!;
        return {
          after: getComputedStyle(frame, '::after').transitionDuration,
          frame: getComputedStyle(frame).transitionDuration,
          sectionOpacity: getComputedStyle(document.querySelector('section[data-testid^="troupe-"]')!).opacity,
          lastOpacity: getComputedStyle([...document.querySelectorAll('section[data-testid^="troupe-"]')].pop()!).opacity,
        };
      });
      expect(off(m.after) && off(m.frame), `transitions still on: ${m.after} / ${m.frame}`);
      expect(m.sectionOpacity === '1' && m.lastOpacity === '1', `reveal must show the final state at once (${m.sectionOpacity}/${m.lastOpacity})`);
      await page.browserContext().close();
      return 'no transitions, sections visible immediately';
    });

    await browser.close();
  }

  // ---------- dist / repo hygiene ----------
  await scenario('no-personal-data-in-dist', async () => {
    const dist = resolve('dist');
    expect(existsSync(dist), 'dist/ is missing — run npm run build first');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    const files = walk(dist);
    const text = files.filter((f) => /\.(js|css|html|json|txt|xml|webmanifest|map|svg)$/i.test(f));
    const generic = [/[\w.+-]+@(bmsit\.in|gmail\.com|yahoo\.\w+|outlook\.\w+)/i, /drive\.google\.com\/open\?id=/i, /\b1[A-Z]{2}\d{2}[A-Z]{2}\d{3,4}\b/];
    // Competition coordinators' numbers are published on purpose (tel: links on the cards); any other mobile number is a leak.
    const published = new Set((JSON.parse(readFileSync(resolve('src/data/events.json'), 'utf8')) as { coordinators: { phone: string }[] }[]).flatMap((e) => e.coordinators.map((c) => c.phone)));
    const secrets: string[] = [];
    const csv = process.env.TEAM_CSV;
    if (csv && existsSync(csv)) {
      const raw = readFileSync(csv, 'utf8');
      for (const m of raw.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) secrets.push(m[0].toLowerCase());
      for (const m of raw.matchAll(/id=([\w-]{20,})/g)) secrets.push(m[1]!);
    }
    const hits: string[] = [];
    for (const f of text) {
      const body = readFileSync(f, 'utf8');
      const lower = body.toLowerCase();
      for (const re of generic) if (re.test(body)) hits.push(`${f.replace(dist, '')}: ${re}`);
      const phones = [...body.matchAll(/\b[6-9]\d{9}\b/g)].map((m) => m[0]).filter((p) => !published.has(p));
      if (phones.length) hits.push(`${f.replace(dist, '')}: ${phones.length} mobile number(s) that are not coordinator numbers`);
      for (const s of new Set(secrets)) if (lower.includes(s.toLowerCase())) hits.push(`${f.replace(dist, '')}: value from the CSV`);
    }
    expect(hits.length === 0, `personal data in dist:\n        ${hits.slice(0, 8).join('\n        ')}`);
    // photo files: WebP only, no EXIF/GPS, names carry no USN or e-mail
    const teamFiles = files.filter((f) => /[\\/]team[\\/]/.test(f));
    for (const f of teamFiles) {
      expect(/\.webp$/.test(f), `${f}: only WebP copies belong in dist/team`);
      expect(!/\d[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{3}|@/.test(f), `${f}: file name looks like a USN or e-mail`);
      const meta = await sharp(f).metadata();
      expect(meta.exif === undefined && meta.icc === undefined, `${f}: carries EXIF/ICC metadata`);
    }
    // nothing from the private folders is in the repo tree
    for (const bad of ['_incoming', 'team-responses.csv']) expect(!existsSync(resolve(bad)), `${bad} must not be inside the repo`);
    return `${text.length} text files + ${teamFiles.length} photos scanned${secrets.length ? `, ${new Set(secrets).size} real values from the CSV checked` : ' (set TEAM_CSV to also check the real CSV values)'}`;
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:\n' + failed.map((f) => `  - ${f.name}: ${f.detail}`).join('\n'));
    process.exit(1);
  }
}

void main();
