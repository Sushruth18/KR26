/**
 * Our Team import:  npm run team:import -- --csv <responses.csv> --photos <photo folder> [--regen-photos] [--dry-run]
 * Reads the team form export and the photos Google Forms downloaded (read-only), then updates
 *   src/data/team.json, src/data/team-photos.generated.json, public/team/ and TODO-CONFIRM-team.md.
 * Existing people and their order are never changed: only new people are added (at the end of their group).
 * The CSV and the photo folder are personal data — never commit them; nothing from them except names,
 * roles, social links and the processed photos reaches the repo.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import config from '../src/data/team-config.json' with { type: 'json' };
import roleMap from '../src/data/team-role-map.json' with { type: 'json' };
import type { RoleMap } from '../src/lib/teamRoles';
import type { TeamGroupConfig, TeamPhoto } from '../src/lib/team';
import { importTeam, type TeamGroupData } from './lib/team-import';
import { mergeReport, renderReport } from './lib/team-report';
import { listSourceFiles, type PhotoOverride } from './lib/team-photos';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const flag = (name: string) => args.includes(`--${name}`);
const csv = opt('csv');
const photos = opt('photos');
const dry = flag('dry-run');
if (!csv) {
  console.error('Usage: npm run team:import -- --csv <responses.csv> [--photos <folder>] [--regen-photos] [--dry-run]');
  process.exit(1);
}

const root = process.cwd();
const p = (rel: string) => resolve(root, rel);
const readJson = <T>(rel: string, fallback: T): T => (existsSync(p(rel)) ? (JSON.parse(readFileSync(p(rel), 'utf8')) as T) : fallback);

const existing = readJson<TeamGroupData[]>('src/data/team.json', []);
const manifest = readJson<Record<string, TeamPhoto>>('src/data/team-photos.generated.json', {});
const overrides = readJson<{ people: Record<string, PhotoOverride> }>('scripts/team-photo-map.json', { people: {} }).people;
const photoNotes = readJson<Record<string, string[]>>('scripts/team-photo-notes.json', {});
const result = await importTeam({
  photoNotes,
  csvText: readFileSync(resolve(csv), 'utf8'),
  photoDir: photos ? resolve(photos) : null,
  existing,
  manifest,
  groups: (config as { groups: TeamGroupConfig[] }).groups,
  roleMap: roleMap as RoleMap,
  overrides,
  excludeIds: (config as { excludeIds?: string[] }).excludeIds ?? [],
  outPhotoDir: p('public/team'),
  publicBase: '/team',
  regenPhotos: flag('regen-photos'),
});
const { report } = result;

const todoPath = p('TODO-CONFIRM-team.md');
const block = renderReport(report, result.team, (config as { groups: TeamGroupConfig[] }).groups);
if (!dry) {
  writeFileSync(p('src/data/team.json'), JSON.stringify(result.team, null, 2) + '\n', 'utf8');
  writeFileSync(p('scripts/team-photo-notes.json'), JSON.stringify(result.photoNotes, null, 2) + '\n', 'utf8');
  writeFileSync(p('src/data/team-photos.generated.json'), JSON.stringify(result.manifest, null, 2) + '\n', 'utf8');
  writeFileSync(todoPath, mergeReport(existsSync(todoPath) ? readFileSync(todoPath, 'utf8') : null, block), 'utf8');
  // Drop photo copies nothing refers to any more (a regenerated photo gets a new content hash).
  const used = new Set(Object.values(result.manifest).flatMap((ph) => ph.variants.map((v) => v.src.split('/').pop()!)));
  if (existsSync(p('public/team'))) for (const f of readdirSync(p('public/team'))) if (!used.has(f)) rmSync(p(`public/team/${f}`));

  // Review sheets for the person running the import (faces: local only, e2e-output is git-ignored).
  const outDir = p('e2e-output/team');
  mkdirSync(outDir, { recursive: true });
  const tiles = result.team.flatMap((g) => g.members).filter((m) => result.manifest[m.photo]);
  if (tiles.length) {
    const W = 200;
    const H = 250;
    const cols = 8;
    const composites: OverlayOptions[] = [];
    for (const [i, m] of tiles.entries()) {
      const v = result.manifest[m.photo]!.variants[0]!;
      const buf = await sharp(p(`public${v.src}`)).resize(W, H).toBuffer();
      composites.push({ input: buf, left: (i % cols) * W, top: Math.floor(i / cols) * H });
    }
    await sharp({ create: { width: cols * W, height: Math.ceil(tiles.length / cols) * H, channels: 3, background: '#222' } })
      .composite(composites)
      .jpeg({ quality: 80 })
      .toFile(resolve(outDir, 'contact.jpg'));
  }
  if (photos && report.photos.ambiguous.length) {
    const files = listSourceFiles(resolve(photos));
    let n = 0;
    for (const a of report.photos.ambiguous) {
      const comps: OverlayOptions[] = [];
      for (const [i, original] of a.candidates.entries()) {
        const f = files.find((x) => x.original === original)!;
        const buf = await sharp(f.path).rotate().resize(300, 400, { fit: 'contain', background: '#222' }).toBuffer();
        comps.push({ input: buf, left: i * 300, top: 0 });
      }
      await sharp({ create: { width: a.candidates.length * 300, height: 400, channels: 3, background: '#000' } })
        .composite(comps)
        .jpeg({ quality: 80 })
        .toFile(resolve(outDir, `ambiguous-${++n}.jpg`));
    }
  }
}

// ---- console summary (names only) ----
const label = (id: string) => (config as { groups: TeamGroupConfig[] }).groups.find((g) => g.id === id)?.label.en ?? id;
console.log(`${dry ? '[dry run] ' : ''}Form rows: ${report.rows} → shown: ${report.placed.length} (new: ${report.changes.added.length}, already there: ${report.changes.kept})`);
for (const g of result.team) console.log(`  ${label(g.id)}: ${g.members.map((m) => m.name.en).join(', ')}`);
const show = (title: string, items: string[]) => items.length && console.log(`${title}:\n${items.map((i) => `  - ${i}`).join('\n')}`);
show('Skipped', report.skipped.map((s) => `${s.name} (${s.reason})`));
show('Needs review (not shown)', report.review.map((x) => `${x.name}: "${x.role}" — ${x.reason}`));
show('Duplicates (latest kept)', report.duplicates.map((d) => d.name));
show('Shared e-mail, different names', report.sharedEmail.map((n) => n.join(', ')));
show('Photo ambiguous', report.photos.ambiguous.map((a) => `${a.names.join(' / ')} ← ${a.candidates.join(' | ')}`));
show('No photo found', report.photos.none);
show('Photo flags', report.photos.flags.map((f) => `${f.name}: ${f.flag}`));
show('Differs from team.json (not applied)', report.changes.differs.map((d) => `${d.name}: ${d.note}`));
show('Filled blanks', report.changes.filled.map((f) => `${f.name}: ${f.what}`));
show('In team.json, not in the CSV', report.changes.notInCsv);
if (!report.columns.consent) console.log('NOTE: the CSV has no consent column — nobody could be skipped for consent.');
