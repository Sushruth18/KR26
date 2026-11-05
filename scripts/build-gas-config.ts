import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildGasConfigSource } from './gas-config';

const out = resolve(process.cwd(), 'apps-script/Config.gs');
const next = buildGasConfigSource();
const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';

if (prev === next) {
  console.log('apps-script/Config.gs is up to date.');
} else {
  writeFileSync(out, next, 'utf8');
  console.log(
    '\n  apps-script/Config.gs was regenerated because the data changed.\n' +
      '  -> Paste it into the Apps Script project and deploy a new version (README: "Updating the script").\n',
  );
}
