import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodTypeAny } from 'zod';
import {
  eventsSchema,
  gallerySchema,
  guestsSchema,
  scheduleSchema,
  siteSchema,
  teamSchema,
  type CompetitionEvent,
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
const events = load('events.json', eventsSchema) as CompetitionEvent[] | null;
const schedule = load('schedule.json', scheduleSchema);
load('guests.json', guestsSchema);
load('team.json', teamSchema);
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
  }
  try {
    new RegExp(site.usnRegex);
  } catch {
    errors.push('site.json: usnRegex is not a valid regular expression');
  }
  if (new Date(site.registrationOpen) >= new Date(site.registrationClose)) {
    errors.push('site.json: registrationOpen must be before registrationClose');
  }
}

if (schedule) {
  for (const s of schedule) {
    if (s.end <= s.start) errors.push(`schedule.json: ${s.title.en} ends before it starts`);
  }
}

if (errors.length) {
  console.error('\nData validation failed:\n' + errors.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log('Data validation passed.');
