/**
 * Builds the source of apps-script/Config.gs from the website's data files, so the server
 * validates against exactly the same rules, departments, semesters and events as the browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eventsSchema, siteSchema } from '../src/lib/schemas.ts';
import { RULES } from '../src/lib/rules.ts';

/** Google Sheets forbids these characters in a tab name, and caps it at 100 characters. */
const BAD_TAB_CHARS = /[[\]*?:/\\]/;

/** Default tab name for an event's registrations, e.g. "ESY – Essay Writing". */
export function sheetNameFor(e: { code: string; name: { en: string } }): string {
  const name = `${e.code} – ${e.name.en}`;
  if (BAD_TAB_CHARS.test(name) || name.length > 100) throw new Error(`events.json: "${name}" is not a valid Google Sheets tab name`);
  return name;
}

export function buildGasConfigSource(root = process.cwd()): string {
  const read = (f: string) => JSON.parse(readFileSync(resolve(root, 'src/data', f), 'utf8'));
  const site = siteSchema.parse(read('site.json'));
  const events = eventsSchema.parse(read('events.json'));

  const config = {
    minFormMs: Math.round(site.minFormSeconds * 1000),
    departments: site.departments,
    semesters: site.semesters,
    rules: RULES,
    day1Date: site.day1Date,
    day2Date: site.day2Date,
    eventStart: site.eventStart,
    eventEnd: site.eventEnd,
    events: Object.fromEntries(
      events.map((e) => [
        e.id,
        {
          code: e.code,
          category: e.category,
          name: e.name,
          teamSize: e.teamSize,
          date: e.date,
          time: e.time,
          venue: e.venue,
          sheetName: sheetNameFor(e),
          deadline: e.deadline,
        },
      ]),
    ),
  };

  return [
    '// ============================================================================',
    '// GENERATED FILE — do not edit by hand.',
    '// Source: src/data/site.json, src/data/events.json, src/lib/rules.ts',
    '// Regenerate with `npm run gas:config` (also runs on every build), then paste',
    '// the new contents into the Config.gs file of the Apps Script project and',
    '// redeploy (see apps-script/README.md, "Updating the script").',
    '// ============================================================================',
    '',
    `var CONFIG = ${JSON.stringify(config, null, 2)};`,
    '',
  ].join('\n');
}
