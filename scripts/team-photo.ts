/**
 * Processes the photo of ONE person who is in src/data/team.json but not in the form export (added by hand), the same
 * way `npm run team:import` does for everyone else: 4:5 crop (focus/zoom from scripts/team-photo-map.json), EXIF
 * rotation baked in and metadata dropped, 480/960/1600 px WebP copies (never wider than the crop), blur-up placeholder.
 *
 *   npm run team:photo -- --photos <photo folder> --id <member id>
 *
 * The photo is chosen ONLY through scripts/team-photo-map.json → people[<id>].file (exact file name, or the unique piece
 * of it before " - "). Nothing from the source file name or path is written anywhere: the copies are named after the
 * member id, and team.json / team-photos.generated.json get the member id as the photo key.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TeamPhoto } from '../src/lib/team';
import type { TeamGroupData } from './lib/team-import';
import { filesForOverride, listSourceFiles, processPhoto, type PhotoOverride } from './lib/team-photos';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const photos = opt('photos');
const id = opt('id');
if (!photos || !id) {
  console.error('Usage: npm run team:photo -- --photos <photo folder> --id <member id>');
  process.exit(1);
}

const p = (rel: string) => resolve(process.cwd(), rel);
const team = JSON.parse(readFileSync(p('src/data/team.json'), 'utf8')) as TeamGroupData[];
const manifest = JSON.parse(readFileSync(p('src/data/team-photos.generated.json'), 'utf8')) as Record<string, TeamPhoto>;
const notes = JSON.parse(readFileSync(p('scripts/team-photo-notes.json'), 'utf8')) as Record<string, string[]>;
const override = (JSON.parse(readFileSync(p('scripts/team-photo-map.json'), 'utf8')) as { people: Record<string, PhotoOverride> }).people[id];

const member = team.flatMap((g) => g.members).find((m) => m.id === id);
if (!member) throw new Error(`${id} is not in src/data/team.json`);
if (!override?.file) throw new Error(`scripts/team-photo-map.json has no "file" for ${id}`);
const hits = filesForOverride(listSourceFiles(resolve(photos)), override.file);
if (hits.length !== 1) throw new Error(`team-photo-map.json: the "file" for ${id} matches ${hits.length} photos — it must match exactly one`);

const done = await processPhoto(hits[0]!, id, p('public/team'), '/team', override);
manifest[id] = done.photo;
member.photo = id;
if (done.flags.length) notes[id] = done.flags;
else delete notes[id];

writeFileSync(p('src/data/team.json'), JSON.stringify(team, null, 2) + '\n', 'utf8');
writeFileSync(p('src/data/team-photos.generated.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
writeFileSync(p('scripts/team-photo-notes.json'), JSON.stringify(notes, null, 2) + '\n', 'utf8');
// Drop this person's older copies (a re-crop gets new content hashes).
const keep = new Set(done.photo.variants.map((v) => v.src.split('/').pop()));
if (existsSync(p('public/team'))) {
  for (const f of readdirSync(p('public/team'))) if (f.startsWith(`${id}-`) && !keep.has(f)) rmSync(p(`public/team/${f}`));
}
console.log(`${member.name.en}: ${done.photo.variants.map((v) => `${v.w}w`).join(', ')} (${done.photo.width}×${done.photo.height})${done.flags.length ? ` — ${done.flags.join('; ')}` : ''}`);
