/**
 * Builds the source of apps-script/Config.gs from the website's data files, so the server
 * validates against exactly the same rules, departments, semesters and events as the browser.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eventsSchema, siteSchema } from '../src/lib/schemas.ts';
import { RULES } from '../src/lib/rules.ts';

/**
 * Format of Config.gs that apps-script/Code.gs understands (its EXPECTED_CONFIG_SCHEMA must equal this — checked by
 * `npm run gas:config` and `npm run test:server`). Bump BOTH when Code.gs starts reading new/renamed CONFIG fields.
 */
export const GAS_CONFIG_SCHEMA = 3;

/** Short content hash of the whole config (events, rules, departments, semesters, dates…): a stale paste shows a different value. */
export function computeConfigVersion(config: unknown): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 8);
}

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
    /** Reply-To of confirmation emails; empty = none. Comes from site.json, never invented. */
    contactEmail: site.contactEmail,
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
    '// Format number Code.gs checks (CONFIG_MISMATCH if it differs) and a hash of everything below.',
    '// GET ?action=status returns configVersion — compare it with the value printed by `npm run gas:config`.',
    `var CONFIG_SCHEMA = ${GAS_CONFIG_SCHEMA};`,
    `var CONFIG_VERSION = '${computeConfigVersion(config)}';`,
    '',
    `var CONFIG = ${JSON.stringify(config, null, 2)};`,
    '',
  ].join('\n');
}
