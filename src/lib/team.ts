import config from '../data/team-config.json';
import photoManifest from '../data/team-photos.generated.json';
import teamRaw from '../data/team.json';
import { cleanInstagram, cleanLinkedin } from './social';
import type { TeamGroup, TeamMember } from './schemas';

export type FolkIconName =
  | 'chatri'
  | 'ratha'
  | 'kombu'
  | 'lens'
  | 'rangoli'
  | 'scroll'
  | 'kalasha'
  | 'stall'
  | 'shield'
  | 'conch'
  | 'mask'
  | 'gear';

interface Bilingual {
  kn: string;
  en: string;
}

export interface TeamGroupConfig {
  id: string;
  label: Bilingual;
  icon: FolkIconName;
  /** Present on the first group only: members are shown in this order (Heads before Co-Heads). */
  roles?: Record<string, Bilingual>;
}

/** One entry of src/data/team-photos.generated.json (written by `npm run team:import`). */
export interface TeamPhoto {
  /** Size of the largest copy; every copy is a 4:5 portrait. */
  width: number;
  height: number;
  /** Inline ~24 px WebP, shown blurred until the photo has loaded. */
  blur: string;
  variants: { w: number; src: string }[];
}

export interface Troupe {
  id: string;
  label: Bilingual;
  icon: FolkIconName;
  members: TeamMember[];
}

export const groupConfig = (config as { groups: TeamGroupConfig[] }).groups;
const photos = photoManifest as Record<string, TeamPhoto>;
// Imported here, not via lib/data.ts, so the team data lives in the Team route chunk and not in the entry.
export const team = teamRaw as unknown as TeamGroup[];

export function getTeamPhoto(key: string): TeamPhoto | null {
  return key ? (photos[key] ?? null) : null;
}

/** Links are re-checked at render time, so a bad value in team.json can never become a dead or unsafe href. */
export function memberLinks(m: TeamMember): { linkedin: string | null; instagram: string | null } {
  return { linkedin: cleanLinkedin(m.linkedin), instagram: cleanInstagram(m.instagram) };
}

/**
 * Troupes in the order of team-config.json; groups without members are left out. Inside a group the
 * order is the one in team.json, except the first group, which shows Heads before Co-Heads (stable).
 */
export function buildTroupes(source = team): Troupe[] {
  const byGroup = new Map<string, TeamMember[]>();
  for (const g of source) byGroup.set(g.id, [...(byGroup.get(g.id) ?? []), ...g.members]);
  const troupes: Troupe[] = [];
  for (const g of groupConfig) {
    let members = byGroup.get(g.id) ?? [];
    if (g.roles) {
      const order = Object.values(g.roles).map((r) => r.en);
      const rank = (m: TeamMember) => {
        const i = order.indexOf(m.role.en);
        return i === -1 ? order.length : i;
      };
      members = members.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i).map((x) => x.m);
    }
    if (members.length) troupes.push({ id: g.id, label: g.label, icon: g.icon, members });
  }
  return troupes;
}

/** Up to two initials for the photo-less frame ("Tejas Gowda L" → "TG"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? '')][0] ?? '';
  const second = words.length > 1 ? [...words[1]!][0] ?? '' : '';
  return (first + second).toUpperCase();
}
