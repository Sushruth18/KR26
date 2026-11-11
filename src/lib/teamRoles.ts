/**
 * Maps the free-text "Your Role" answer of the team form to a troupe (group) of the Our Team page.
 * Pure functions — used by the importer (scripts/import-team.ts) and the e2e suite. The aliases live in
 * src/data/team-role-map.json so they can be edited without touching code.
 */

export interface RoleRule {
  group: string;
  /** Only meaningful for the first group: `head` | `cohead`. */
  role?: string;
  aliases: string[];
}

export interface RoleMap {
  qualifiers: string[];
  rules: RoleRule[];
}

export type MatchVia = 'exact' | 'stripped' | 'part' | 'fuzzy';

export type RoleMatch =
  | { ok: true; group: string; role?: string; via: MatchVia; alias: string }
  | { ok: false; reason: 'empty' | 'unmatched' | 'ambiguous'; detail?: string };

/** lower-case, accents off, "&" and a lone "n" → "and", punctuation → spaces, spaces collapsed. */
export function normaliseRole(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bn\b/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Throws on aliases that appear in two rules, so a typo in the map cannot silently re-route people. */
export function buildAliasIndex(map: RoleMap): Map<string, RoleRule> {
  const index = new Map<string, RoleRule>();
  for (const rule of map.rules) {
    for (const alias of rule.aliases) {
      const key = normaliseRole(alias);
      const clash = index.get(key);
      if (clash && (clash.group !== rule.group || clash.role !== rule.role)) {
        throw new Error(`team-role-map.json: alias "${alias}" is listed for both ${clash.group} and ${rule.group}`);
      }
      index.set(key, rule);
    }
  }
  return index;
}

export function mapRole(raw: string, map: RoleMap, index: Map<string, RoleRule> = buildAliasIndex(map)): RoleMatch {
  const whole = normaliseRole(raw);
  if (!whole) return { ok: false, reason: 'empty' };
  const qualifiers = new Set(map.qualifiers.map(normaliseRole));
  const strip = (s: string) => s.split(' ').filter((w) => !qualifiers.has(w)).join(' ');

  const hit = (rule: RoleRule, via: MatchVia, alias: string): RoleMatch => ({
    ok: true,
    group: rule.group,
    ...(rule.role ? { role: rule.role } : {}),
    via,
    alias,
  });
  const lookup = (s: string): { rule: RoleRule; via: MatchVia } | null => {
    const exact = index.get(s);
    if (exact) return { rule: exact, via: 'exact' };
    const stripped = strip(s);
    const viaStrip = stripped && stripped !== s ? index.get(stripped) : undefined;
    return viaStrip ? { rule: viaStrip, via: 'stripped' } : null;
  };

  // 1. The whole answer ("Press, Media & Publicity" must beat its parts "Press" / "Media").
  const whole1 = lookup(whole);
  if (whole1) return hit(whole1.rule, whole1.via, whole);

  // 2. Parts split on commas, slashes, semicolons and brackets.
  const parts = raw
    .split(/[,/;()|\n]+/)
    .map(normaliseRole)
    .filter(Boolean);
  if (parts.length > 1) {
    const found = parts.map((p) => ({ p, m: lookup(p) })).filter((x): x is { p: string; m: NonNullable<ReturnType<typeof lookup>> } => !!x.m);
    const groups = new Set(found.map((f) => f.m.rule.group));
    if (groups.size > 1) return { ok: false, reason: 'ambiguous', detail: [...groups].join(' / ') };
    if (found[0]) return hit(found[0].m.rule, 'part', found[0].p);
  }

  // 3. A typo: one edit away (two for long answers) from an alias of at least 7 letters.
  const candidates = [whole, strip(whole), ...parts, ...parts.map(strip)].filter((s) => s.length >= 7);
  let best: { rule: RoleRule; alias: string; d: number } | null = null;
  const tied = new Set<string>();
  for (const s of candidates) {
    for (const [alias, rule] of index) {
      if (alias.length < 7) continue;
      const d = editDistance(s, alias);
      const limit = alias.length >= 12 ? 2 : 1;
      if (d > limit) continue;
      if (!best || d < best.d) {
        best = { rule, alias, d };
        tied.clear();
      }
      if (best && d === best.d) tied.add(rule.group);
    }
  }
  if (best) {
    if (tied.size > 1) return { ok: false, reason: 'ambiguous', detail: [...tied].join(' / ') };
    return hit(best.rule, 'fuzzy', best.alias);
  }
  return { ok: false, reason: 'unmatched' };
}
