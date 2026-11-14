import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../src/data/team-config.json' with { type: 'json' };
import roleMap from '../src/data/team-role-map.json' with { type: 'json' };
import { cleanInstagram, cleanLinkedin } from '../src/lib/social';
import { buildAliasIndex, type RoleMap } from '../src/lib/teamRoles';
import type { TeamGroup } from '../src/lib/schemas';
import type { TeamPhoto } from '../src/lib/team';

/** Build-time checks for the Our Team data (shape is checked by teamSchema in validate-data.ts). */
export function validateTeam(team: TeamGroup[] | null, errors: string[]): void {
  const groupIds = config.groups.map((g) => g.id);
  if (new Set(groupIds).size !== groupIds.length) errors.push('team-config.json: duplicate group id');
  const icons = new Set(['chatri', 'ratha', 'kombu', 'lens', 'rangoli', 'scroll', 'kalasha', 'stall', 'shield', 'conch', 'mask', 'gear']);
  for (const g of config.groups) {
    if (!icons.has(g.icon)) errors.push(`team-config.json: ${g.id} uses unknown icon "${g.icon}"`);
    if (!g.label.kn || !g.label.en) errors.push(`team-config.json: ${g.id} needs a Kannada and an English label`);
  }
  try {
    const index = buildAliasIndex(roleMap as RoleMap);
    for (const rule of (roleMap as RoleMap).rules) {
      if (!groupIds.includes(rule.group)) errors.push(`team-role-map.json: rule points to unknown group "${rule.group}"`);
    }
    void index;
  } catch (e) {
    errors.push((e as Error).message);
  }

  // The photo map is committed: it may name a photo only by a piece of its file name, never by a USN, e-mail or phone.
  const mapText = readFileSync(resolve(process.cwd(), 'scripts/team-photo-map.json'), 'utf8');
  // USN without word boundaries on purpose: in a file name it is often glued to other characters ("x_1BY24CS029").
  if (/[\w.+-]+@[\w-]+\.[\w.]+|\b[6-9]\d{9}\b|1[A-Z]{2}\d{2}[A-Z]{2}\d{3}|\b[A-Z]:[\\/]/i.test(mapText)) {
    errors.push('scripts/team-photo-map.json contains personal data or an absolute path (USN, e-mail, phone, drive letter) — use the piece of the file name before " - "');
  }

  if (!team) return;
  const manifestPath = resolve(process.cwd(), 'src/data/team-photos.generated.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, TeamPhoto>;
  const ids = new Set<string>();
  const personal = /[\w.+-]+@[\w-]+\.[\w.]+|\b\d{10}\b|drive\.google|docs\.google|\b1[A-Z]{2}\d{2}[A-Z]{2}\d{3}\b/i;
  for (const g of team) {
    if (!groupIds.includes(g.id)) errors.push(`team.json: group "${g.id}" is not in team-config.json`);
    for (const m of g.members) {
      if (ids.has(m.id)) errors.push(`team.json: duplicate member id ${m.id}`);
      ids.add(m.id);
      for (const [where, text] of [['name.en', m.name.en], ['name.kn', m.name.kn], ['role.en', m.role.en], ['role.kn', m.role.kn], ['photo', m.photo]] as const) {
        if (personal.test(text)) errors.push(`team.json: ${m.id}.${where} looks like personal data (e-mail, phone, USN or Drive link)`);
      }
      if (m.linkedin && cleanLinkedin(m.linkedin) !== m.linkedin) errors.push(`team.json: ${m.id}.linkedin is not a canonical LinkedIn profile URL (${m.linkedin})`);
      if (m.instagram && cleanInstagram(m.instagram) !== m.instagram) errors.push(`team.json: ${m.id}.instagram is not a canonical Instagram profile URL (${m.instagram})`);
      if (g.id === 'head' && !['Head', 'Co-Head'].includes(m.role.en)) errors.push(`team.json: ${m.id} is in the first group but its role is "${m.role.en}"`);
      // A group with sub-roles (Cultural: Drama / Fashion) shows the member's own role, so it must be one of them.
      const cfgGroup = config.groups.find((x) => x.id === g.id) as { roles?: Record<string, { kn: string; en: string }> } | undefined;
      if (cfgGroup?.roles && !Object.values(cfgGroup.roles).some((r) => r.en === m.role.en && r.kn === m.role.kn)) {
        errors.push(`team.json: ${m.id} role "${m.role.en}" / "${m.role.kn}" is not one of the ${g.id} roles in team-config.json`);
      }
      if (!m.photo) continue;
      const photo = manifest[m.photo];
      if (!photo) {
        errors.push(`team.json: ${m.id} photo "${m.photo}" is not in team-photos.generated.json — run npm run team:import`);
        continue;
      }
      for (const v of photo.variants) {
        if (!existsSync(resolve(process.cwd(), 'public', v.src.replace(/^\//, '')))) errors.push(`team: ${v.src} is missing from public/`);
      }
    }
  }
}
