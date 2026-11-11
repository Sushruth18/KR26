/**
 * Keeps the competition rules out of the entry chunk.
 *
 * events.json and site.json are imported on every page (lib/data.ts), but the rule lists (events.json → rules,
 * site.json → generalRules) are only shown on /competitions and in the Register review step — ~5 KB gzip of
 * mostly-Kannada text that would otherwise delay the first paint of every page. The data stays where the
 * organisers edit it; this plugin serves the browser a copy of both files without those fields and exposes
 * them through `virtual:competition-rules`, which only the lazily loaded rule components import.
 * Node scripts (validate-data, gas-config, tests) read the files directly and still see everything.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL = 'virtual:competition-rules';
const RESOLVED = `\0${VIRTUAL}`;

export function splitRules(): Plugin {
  const dataDir = resolve(process.cwd(), 'src/data');
  const file = (name: string) => resolve(dataDir, name);
  const same = (a: string, b: string) => a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();
  const read = (name: string) => JSON.parse(readFileSync(file(name), 'utf8'));

  return {
    name: 'kr26-split-rules',
    enforce: 'pre',
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : undefined;
    },
    load(id) {
      if (id === RESOLVED) {
        this.addWatchFile(file('events.json'));
        this.addWatchFile(file('site.json'));
        const events = read('events.json') as { id: string; rules: unknown }[];
        const eventRules = Object.fromEntries(events.map((e) => [e.id, e.rules]));
        return `export const eventRules = ${JSON.stringify(eventRules)};\nexport const generalRules = ${JSON.stringify(read('site.json').generalRules)};\n`;
      }
      const path = id.split('?')[0]!;
      const without = (obj: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
      if (same(path, file('events.json'))) {
        return JSON.stringify((read('events.json') as Record<string, unknown>[]).map((e) => without(e, 'rules')));
      }
      if (same(path, file('site.json'))) return JSON.stringify(without(read('site.json'), 'generalRules'));
      return undefined;
    },
  };
}
