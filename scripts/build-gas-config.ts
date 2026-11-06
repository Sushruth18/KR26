import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildGasConfigSource, GAS_CONFIG_SCHEMA } from './gas-config';

// Code.gs and the generator must agree on the Config.gs format, or the deployed script answers CONFIG_MISMATCH.
const code = readFileSync(resolve(process.cwd(), 'apps-script/Code.gs'), 'utf8');
const expected = /var EXPECTED_CONFIG_SCHEMA = (\d+);/.exec(code)?.[1];
if (Number(expected) !== GAS_CONFIG_SCHEMA) {
  console.error(`apps-script/Code.gs expects Config.gs schema ${expected ?? '(none)'} but scripts/gas-config.ts generates ${GAS_CONFIG_SCHEMA}.`);
  process.exit(1);
}

const out = resolve(process.cwd(), 'apps-script/Config.gs');
const next = buildGasConfigSource();
const version = /var CONFIG_VERSION = '([0-9a-f]+)'/.exec(next)?.[1];
const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';

if (prev === next) {
  console.log(`apps-script/Config.gs is up to date (CONFIG_VERSION ${version}).`);
} else {
  writeFileSync(out, next, 'utf8');
  console.log(
    `\n  apps-script/Config.gs was regenerated because the data changed (CONFIG_VERSION ${version}).\n` +
      '  -> Paste it into the Apps Script project and deploy a new version (README: "Updating the script").\n',
  );
}
