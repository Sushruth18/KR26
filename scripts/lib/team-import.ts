/**
 * Team form export → src/data/team.json (+ processed photos). Pure apart from writing photo files to
 * `outPhotoDir`; the CLI (scripts/import-team.ts) reads and writes the JSON files and the report.
 * Personal data (e-mail, phone, time stamp, Drive link) is read only to decide who is who and never
 * leaves this function: the result holds names, roles, photo keys and social links.
 */
import { cleanInstagram, cleanLinkedin } from '../../src/lib/social';
import { buildAliasIndex, mapRole, type RoleMap } from '../../src/lib/teamRoles';
import type { TeamGroupConfig, TeamPhoto } from '../../src/lib/team';
import type { TeamMember } from '../../src/lib/schemas';
import { hasConsent, parseTeamForm, type FormRow } from './team-csv';
import { listSourceFiles, matchPhotos, processPhoto, type PhotoOverride, type PhotoPerson } from './team-photos';

export interface TeamGroupData {
  id: string;
  members: TeamMember[];
}

export interface ImportInput {
  csvText: string;
  /** null = do not touch photos. */
  photoDir: string | null;
  existing: TeamGroupData[];
  manifest: Record<string, TeamPhoto>;
  groups: TeamGroupConfig[];
  roleMap: RoleMap;
  overrides: Record<string, PhotoOverride>;
  /** Ids that were removed on purpose: never added again. */
  excludeIds: string[];
  outPhotoDir: string;
  publicBase: string;
  regenPhotos?: boolean;
  /** Photo quality notes from earlier runs, by member id (kept until the photo is regenerated). */
  photoNotes?: Record<string, string[]>;
}

export interface ImportReport {
  rows: number;
  columns: { consent: boolean; linkedin: boolean; instagram: boolean };
  placed: { id: string; name: string; group: string; role: string; isNew: boolean }[];
  skipped: { name: string; reason: string }[];
  /** Same person submitted twice: the later answer was used. */
  duplicates: { name: string; detail: string }[];
  /** Different names, one e-mail address (the e-mail itself is not listed). */
  sharedEmail: string[][];
  review: { name: string; role: string; reason: string }[];
  photos: {
    generated: string[];
    ambiguous: { names: string[]; candidates: string[] }[];
    none: string[];
    flags: { name: string; flag: string }[];
    noPhotoDir: boolean;
  };
  invalidLinks: { name: string; which: 'linkedin' | 'instagram' }[];
  /** Merge outcome against the existing team.json. */
  changes: { added: string[]; kept: number; differs: { name: string; note: string }[]; filled: { name: string; what: string }[]; notInCsv: string[]; excluded: string[] };
}

export interface ImportResult {
  team: TeamGroupData[];
  manifest: Record<string, TeamPhoto>;
  photoNotes: Record<string, string[]>;
  report: ImportReport;
}

/**
 * "PUNITH P GOWDA" → "Punith P Gowda", "Mallikarjun katagi" → "Mallikarjun Katagi". Initials stay capitals:
 * 1–2 letters always ("KV"), and 3 letters ("JP", "RAO"?) only in a mixed-case name — in an all-caps name
 * every word of 3+ letters is a word.
 */
export function tidyName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  const allCaps = name === name.toUpperCase();
  return name
    .split(' ')
    .map((w) => {
      const letters = w.replace(/[^\p{L}]/gu, '');
      const longWord = letters.length > (allCaps ? 2 : 3);
      if (longWord && (w === w.toUpperCase() || w === w.toLowerCase())) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      if (!longWord && letters.length > 0 && w === w.toLowerCase() && /^[a-z.]+$/.test(w)) return w.toUpperCase();
      return w;
    })
    .join(' ');
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const nameKey = (name: string) => slugify(name).replace(/-/g, '');

export async function importTeam(input: ImportInput): Promise<ImportResult> {
  const form = parseTeamForm(input.csvText);
  const index = buildAliasIndex(input.roleMap);
  const groupById = new Map(input.groups.map((g) => [g.id, g]));
  const report: ImportReport = {
    rows: form.rows.length,
    columns: form.columns,
    placed: [],
    skipped: [],
    duplicates: [],
    sharedEmail: [],
    review: [],
    photos: { generated: [], ambiguous: [], none: [], flags: [], noPhotoDir: input.photoDir === null },
    invalidLinks: [],
    changes: { added: [], kept: 0, differs: [], filled: [], notInCsv: [], excluded: [] },
  };

  // 1. Consent. A form without a consent question cannot skip anyone — the report says so.
  const consented: FormRow[] = [];
  for (const r of form.rows) {
    const name = tidyName(r.name);
    if (!name) report.skipped.push({ name: `(row ${r.line}: no name)`, reason: 'no name given' });
    else if (r.consent !== undefined && !hasConsent(r.consent)) report.skipped.push({ name, reason: 'did not tick the consent box' });
    else consented.push(r);
  }

  // 2. Same person twice (same name): the later answer wins, the first position is kept.
  const order: string[] = [];
  const latest = new Map<string, FormRow>();
  for (const r of consented) {
    const key = nameKey(r.name);
    if (latest.has(key)) {
      report.duplicates.push({ name: tidyName(r.name), detail: `submitted twice — the later answer (form line ${r.line}) is used` });
    } else order.push(key);
    latest.set(key, r);
  }
  const rows = order.map((k) => latest.get(k)!);

  // Different names behind one e-mail address: a person filling the form for friends — flag, never merge.
  const byEmail = new Map<string, FormRow[]>();
  for (const r of rows) if (r.email) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r]);
  for (const list of byEmail.values()) if (list.length > 1) report.sharedEmail.push(list.map((r) => tidyName(r.name)));

  // 3. Roles → groups. Unmatched or ambiguous answers are not shown until the role map learns them.
  interface Person {
    row: FormRow;
    id: string;
    name: string;
    group: string;
    role: { kn: string; en: string };
  }
  const people: Person[] = [];
  const usedIds = new Set<string>();
  for (const row of rows) {
    const name = tidyName(row.name);
    const m = mapRole(row.role, input.roleMap, index);
    if (!m.ok) {
      report.review.push({ name, role: row.role || '(empty)', reason: m.reason === 'ambiguous' ? `fits several groups (${m.detail})` : m.reason === 'empty' ? 'no role given' : 'no group matches this role' });
      continue;
    }
    const cfg = groupById.get(m.group);
    if (!cfg) {
      report.review.push({ name, role: row.role, reason: `role map points to "${m.group}", which is not in team-config.json` });
      continue;
    }
    const role = cfg.roles ? (cfg.roles[m.role ?? 'head'] ?? cfg.label) : cfg.label;
    let id = slugify(name);
    for (let n = 2; usedIds.has(id); n++) id = `${slugify(name)}-${n}`;
    usedIds.add(id);
    people.push({ row, id, name, group: m.group, role: { kn: role.kn, en: role.en } });
  }

  // 4. Merge with what is already in team.json: existing people and their order are never touched.
  const team: TeamGroupData[] = input.existing.map((g) => ({ id: g.id, members: [...g.members] }));
  const find = (id: string) => {
    for (const g of team) {
      const m = g.members.find((x) => x.id === id);
      if (m) return { group: g, member: m };
    }
    return null;
  };
  const excluded = new Set(input.excludeIds);
  const fresh: Person[] = [];
  const photoNeeds: { p: Person; member: TeamMember }[] = [];
  const idByPerson = new Map<Person, string>();
  for (const p of people) {
    // An existing entry keeps its id for good, so a renamed or Kannada-fied member is still recognised.
    const existing = find(p.id);
    idByPerson.set(p, existing?.member.id ?? p.id);
    if (excluded.has(p.id)) {
      report.changes.excluded.push(p.name);
      continue;
    }
    if (!existing) {
      fresh.push(p);
      continue;
    }
    report.changes.kept++;
    if (existing.group.id !== p.group) {
      report.changes.differs.push({ name: existing.member.name.en, note: `the form now says "${p.row.role}" (group ${p.group}); team.json keeps ${existing.group.id}` });
    }
    const lin = cleanLinkedin(p.row.linkedin);
    const ins = cleanInstagram(p.row.instagram);
    if (lin && !existing.member.linkedin) {
      existing.member.linkedin = lin;
      report.changes.filled.push({ name: existing.member.name.en, what: 'LinkedIn link' });
    }
    if (ins && !existing.member.instagram) {
      existing.member.instagram = ins;
      report.changes.filled.push({ name: existing.member.name.en, what: 'Instagram link' });
    }
    if (!existing.member.photo || input.regenPhotos || !input.manifest[existing.member.photo]) photoNeeds.push({ p, member: existing.member });
  }
  const placedIds = new Set(people.map((p) => idByPerson.get(p)));
  for (const g of team) for (const m of g.members) if (!placedIds.has(m.id)) report.changes.notInCsv.push(m.name.en);

  for (const p of fresh) {
    const member: TeamMember = { id: p.id, name: { kn: p.name, en: p.name }, role: p.role, photo: '' };
    const lin = cleanLinkedin(p.row.linkedin);
    const ins = cleanInstagram(p.row.instagram);
    if (p.row.linkedin && !lin) report.invalidLinks.push({ name: p.name, which: 'linkedin' });
    if (p.row.instagram && !ins) report.invalidLinks.push({ name: p.name, which: 'instagram' });
    if (lin) member.linkedin = lin;
    if (ins) member.instagram = ins;
    let g = team.find((x) => x.id === p.group);
    if (!g) team.push((g = { id: p.group, members: [] }));
    g.members.push(member);
    report.changes.added.push(p.name);
    photoNeeds.push({ p, member });
  }

  // 5. Photos.
  const manifest = { ...input.manifest };
  const photoNotes = { ...(input.photoNotes ?? {}) };
  if (input.photoDir) {
    const files = listSourceFiles(input.photoDir);
    const matches = matchPhotos(
      people.map<PhotoPerson>((p) => ({ id: idByPerson.get(p)!, name: p.name, email: p.row.email })),
      files,
      input.overrides,
    );
    const ambiguous = new Map<string, { names: string[]; candidates: string[] }>();
    for (const { p, member } of photoNeeds) {
      const match = matches.get(member.id) ?? { kind: 'none' as const };
      if (match.kind === 'assigned') {
        const done = await processPhoto(match.file, member.id, input.outPhotoDir, input.publicBase, input.overrides[member.id]);
        manifest[member.id] = done.photo;
        member.photo = member.id;
        report.photos.generated.push(member.name.en);
        if (done.flags.length) photoNotes[member.id] = done.flags;
        else delete photoNotes[member.id];
      } else if (match.kind === 'ambiguous') {
        const key = match.candidates.map((c) => c.sha1).sort().join();
        const entry = ambiguous.get(key) ?? { names: [], candidates: match.candidates.map((c) => c.original) };
        entry.names.push(member.name.en);
        ambiguous.set(key, entry);
      } else report.photos.none.push(p.name);
    }
    report.photos.ambiguous = [...ambiguous.values()];
  }

  for (const g of team) for (const m of g.members) for (const flag of photoNotes[m.id] ?? []) report.photos.flags.push({ name: m.name.en, flag });

  // 6. Who is placed where (final state of the people in this CSV).
  for (const p of people) {
    const at = find(idByPerson.get(p)!);
    if (at) report.placed.push({ id: at.member.id, name: at.member.name.en, group: at.group.id, role: at.member.role.en, isNew: report.changes.added.includes(p.name) });
  }

  // Tidy: groups in config order (new groups follow), members keep the order they are in.
  const rank = (id: string) => {
    const i = input.groups.findIndex((g) => g.id === id);
    return i === -1 ? input.groups.length : i;
  };
  team.sort((a, b) => rank(a.id) - rank(b.id));
  return { team: team.filter((g) => g.members.length), manifest, photoNotes, report };
}
