import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodTypeAny } from 'zod';
import type { LogoAsset, LogoKey } from '../src/lib/logos';
import { sheetNameFor } from './gas-config';
import { BANNED } from './banned-terms';
import type { ArtistAsset } from '../src/lib/artist';
import { validateTeam } from './validate-team';
import {
  artistsSchema,
  attractionsSchema,
  eventsSchema,
  gallerySchema,
  guestsSchema,
  scheduleSchema,
  siteSchema,
  teamSchema,
  type EventRecord,
} from '../src/lib/schemas';

const errors: string[] = [];
const dataDir = resolve(process.cwd(), 'src/data');

function load<S extends ZodTypeAny>(file: string, schema: S): ReturnType<S['parse']> | null {
  const raw = JSON.parse(readFileSync(resolve(dataDir, file), 'utf8'));
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const issue of res.error.issues) {
      errors.push(`${file}: ${issue.path.join('.')} - ${issue.message}`);
    }
    return null;
  }
  return res.data;
}

const site = load('site.json', siteSchema);
const events = load('events.json', eventsSchema) as EventRecord[] | null;
const schedule = load('schedule.json', scheduleSchema);
const artists = load('artist.json', artistsSchema);
const attractions = load('attractions.json', attractionsSchema);
load('guests.json', guestsSchema);
validateTeam(load('team.json', teamSchema), errors);
load('gallery.json', gallerySchema);

if (site && events) {
  const cash = events.reduce((sum, e) => sum + (e.prizes.type === 'cash' ? e.prizes.first + e.prizes.second : 0), 0);
  if (cash !== site.prizePoolTotal) {
    errors.push(`events.json: cash prizes total ${cash} but site.json prizePoolTotal is ${site.prizePoolTotal}`);
  }
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) errors.push(`events.json: duplicate id ${e.id}`);
    if (codes.has(e.code)) errors.push(`events.json: duplicate code ${e.code}`);
    ids.add(e.id);
    codes.add(e.code);
    if (e.date !== site.day1Date) errors.push(`events.json: ${e.id} date ${e.date} is not Day 1 (${site.day1Date})`);
    if (new Date(e.deadline) > new Date(site.registrationClose)) {
      errors.push(`events.json: ${e.id} deadline is after site registrationClose`);
    }
    if (e.teamSize.min > e.teamSize.max) errors.push(`events.json: ${e.id} teamSize.min > max`);
    if (e.prizes.type === 'cash' && e.category === 'faculty') errors.push(`events.json: ${e.id} faculty events award mementos`);
    // The two languages show the same numbered list, so rule n must exist in both.
    if (e.rules.kn.length !== e.rules.en.length) {
      errors.push(`events.json: ${e.id} has ${e.rules.kn.length} Kannada rules but ${e.rules.en.length} English rules`);
    }
    const phones = e.coordinators.map((c) => c.phone);
    if (new Set(phones).size !== phones.length) errors.push(`events.json: ${e.id} lists the same coordinator phone twice`);
  }
  if (site.generalRules.kn.length !== site.generalRules.en.length) {
    errors.push(`site.json: generalRules has ${site.generalRules.kn.length} Kannada and ${site.generalRules.en.length} English items`);
  }
  // Every event gets its own Sheet tab; the names must be valid and unique (sheetNameFor throws on a bad one).
  const tabs = new Set<string>();
  for (const e of events) {
    try {
      const tab = sheetNameFor(e);
      if (tabs.has(tab)) errors.push(`events.json: ${e.id} produces a duplicate Sheet tab name "${tab}"`);
      tabs.add(tab);
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
}

if (site) {
  for (const dept of Object.keys(site.semesters.byDepartment)) {
    if (!site.departments.includes(dept)) errors.push(`site.json: semesters.byDepartment.${dept} is not in departments`);
  }

  // Logos: the WebP copies the site serves must be made from the current masters.
  const manifest = JSON.parse(readFileSync(resolve(dataDir, 'logos.generated.json'), 'utf8')) as Record<LogoKey, LogoAsset | null>;
  const pub = (p: string) => resolve(process.cwd(), 'public', p.replace(/^\//, ''));
  const regen = 'run "npm run brand:images" and commit the result';
  for (const key of Object.keys(site.logos) as LogoKey[]) {
    const source = site.logos[key];
    const entry = manifest[key];
    if (!source) {
      if (entry) errors.push(`logos.generated.json: ${key} is listed but site.json → logos.${key} is empty — ${regen}`);
      continue;
    }
    if (!existsSync(pub(source))) {
      errors.push(`site.json: logos.${key} "${source}" is not in public/`);
      continue;
    }
    const sha1 = createHash('sha1').update(readFileSync(pub(source))).digest('hex');
    if (!entry || entry.source !== source || entry.sha1 !== sha1) {
      errors.push(`logos.${key}: ${source} changed since its WebP copies were made — ${regen}`);
    } else {
      for (const v of entry.variants) if (!existsSync(pub(v.src))) errors.push(`logos.${key}: ${v.src} is missing — ${regen}`);
    }
  }
}

// tokens.css: every colour's "-rgb" twin (used by Tailwind opacity modifiers) must match its hex value.
{
  const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  for (const [, name, hex] of css.matchAll(/--([a-z0-9-]+):\s*#([0-9a-f]{6})\s*;/gi)) {
    const rgb = css.match(new RegExp(`--${name}-rgb:\\s*(\\d+) (\\d+) (\\d+);`));
    const want = [0, 2, 4].map((i) => parseInt(hex!.slice(i, i + 2), 16)).join(' ');
    if (!rgb) errors.push(`tokens.css: --${name}-rgb missing`);
    else if (rgb.slice(1).join(' ') !== want) errors.push(`tokens.css: --${name}-rgb is "${rgb.slice(1).join(' ')}", expected "${want}"`);
  }
}

// WhatsApp invite links are coordinator-only data (Events tab → whatsapp_url): they must never be committed to the repo.
for (const f of readdirSync(dataDir).filter((n) => n.endsWith('.json'))) {
  if (/chat\.whatsapp\.com|whatsapp\.com\/channel/i.test(readFileSync(resolve(dataDir, f), 'utf8'))) {
    errors.push(`${f}: contains a WhatsApp link — those belong in the Sheet's Events tab (whatsapp_url), not in the repo`);
  }
}

// A Netlify build without the Apps Script URL would ship a dead registration form.
if (process.env.NETLIFY === 'true' && !process.env.VITE_REGISTRATION_ENDPOINT?.trim()) {
  errors.push('VITE_REGISTRATION_ENDPOINT is not set in Netlify → Site configuration → Environment variables');
} else if (!process.env.VITE_REGISTRATION_ENDPOINT?.trim()) {
  console.warn('Note: VITE_REGISTRATION_ENDPOINT is empty — this build will show "registration unavailable".');
}

if (schedule) {
  const starts = schedule.map((s) => s.start);
  if (starts.some((s, i) => i > 0 && s <= starts[i - 1]!)) {
    errors.push('schedule.json: stops must be in strictly ascending start order, with no two at the same time');
  }
  if (schedule.some((s) => s.day !== 2)) errors.push('schedule.json: only Day 2 is listed here (Day 1 is built from events.json)');
  if (schedule.filter((s) => s.highlight).length !== 1) errors.push('schedule.json: exactly one stop must be the highlight (Inauguration & Procession)');
  if (schedule.filter((s) => s.headline).length !== 1) errors.push('schedule.json: exactly one stop must be the headline act');
  if (site) {
    const toIst = (hhmm: string) => `${site.day2Date}T${hhmm}:00+05:30`;
    if (schedule[0] && Date.parse(toIst(schedule[0].start)) !== Date.parse(site.eventStart)) {
      errors.push(`schedule.json: the first stop (${schedule[0].start}) must start at site.json eventStart`);
    }
    // The last stop runs until eventEnd (Now/Next), so it must start before it.
    const last = schedule[schedule.length - 1];
    if (last && Date.parse(toIst(last.start)) >= Date.parse(site.eventEnd)) {
      errors.push('schedule.json: the last stop must start before site.json eventEnd');
    }
  }
  if (attractions) {
    for (const a of attractions) {
      for (const start of a.starts) {
        if (!schedule.some((s) => s.start === start)) errors.push(`attractions.json: ${a.id} points at ${start}, which is not a schedule stop`);
      }
    }
  }
}

// Headline artist photos: the WebP copies must be made from the current masters, one entry per artist.
if (artists) {
  const regen = 'run "npm run brand:images" and commit the result';
  const manifest = JSON.parse(readFileSync(resolve(dataDir, 'artist.generated.json'), 'utf8')) as Record<string, ArtistAsset>;
  for (const id of Object.keys(manifest)) {
    if (!artists.some((a) => a.id === id)) errors.push(`artist.generated.json: "${id}" is not in artist.json — ${regen}`);
  }
  for (const artist of artists) {
    const abs = resolve(process.cwd(), 'public', artist.photo.replace(/^\//, ''));
    const entry = manifest[artist.id];
    if (!existsSync(abs)) {
      errors.push(`artist.json: ${artist.id} photo "${artist.photo}" is not in public/`);
      continue;
    }
    const sha1 = createHash('sha1').update(readFileSync(abs)).digest('hex');
    if (!entry || entry.source !== artist.photo || entry.sha1 !== sha1) {
      errors.push(`artist.generated.json: ${artist.photo} (${artist.id}) changed or has no WebP copies yet — ${regen}`);
      continue;
    }
    for (const v of entry.variants) {
      if (!existsSync(resolve(process.cwd(), 'public', v.src.replace(/^\//, '')))) errors.push(`artist.generated.json: ${v.src} is missing — ${regen}`);
      if (v.w > entry.width) errors.push(`artist.generated.json: ${v.src} is wider than the master (${entry.width}px) — copies must never be upscaled`);
    }
  }
}

// Names the college has asked us to keep off the site (also checked against the built output by `npm run check:banned`).
for (const f of readdirSync(dataDir).filter((n) => n.endsWith('.json'))) {
  const hit = BANNED.find((b) => b.test(readFileSync(resolve(dataDir, f), 'utf8')));
  if (hit) errors.push(`${f}: contains a banned term (${hit})`);
}

if (errors.length) {
  console.error('\nData validation failed:\n' + errors.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log('Data validation passed.');
