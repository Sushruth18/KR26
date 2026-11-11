/**
 * Social-link normalisation for the team page. Used by the importer (scripts/import-team.ts), the
 * build-time validator and the page itself (which re-checks every href it renders).
 * Both functions return a canonical https URL, or null for anything that is not a real profile link.
 */

const INSTAGRAM_RESERVED = new Set([
  'p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct', 'about', 'legal', 'developer', 'web', 'share',
]);

/** Instagram usernames: 1–30 of letters, digits, `.` and `_`; no leading/trailing/double dots. */
const IG_HANDLE = /^(?!.*\.\.)(?!\.)[A-Za-z0-9._]{1,30}(?<!\.)$/;

/** `@name`, `name`, `instagram.com/name`, `https://www.instagram.com/name/?igsh=…` → `https://www.instagram.com/name/`. */
export function cleanInstagram(input: string | null | undefined): string | null {
  let s = (input ?? '').trim();
  if (!s) return null;
  let handle: string;
  if (/instagram\.com|instagr\.am/i.test(s)) {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
    let url: URL;
    try {
      url = new URL(s);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!/^(www\.)?(instagram\.com|instagr\.am)$/i.test(url.hostname)) return null;
    handle = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else {
    // Anything else (a scheme, a slash, spaces, an "@" in the middle) fails the handle pattern below.
    handle = s.replace(/^@/, '');
  }
  if (!IG_HANDLE.test(handle) || INSTAGRAM_RESERVED.has(handle.toLowerCase())) return null;
  return `https://www.instagram.com/${handle}/`;
}

/** A LinkedIn profile (`/in/<slug>`) on linkedin.com or a country subdomain; query and fragment are dropped. */
export function cleanLinkedin(input: string | null | undefined): string | null {
  let s = (input ?? '').trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!/^([a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(url.hostname)) return null;
  const [kind, slug] = url.pathname.split('/').filter(Boolean);
  if (kind?.toLowerCase() !== 'in' || !slug) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (!/^[\p{L}\p{N}_.-]{2,100}$/u.test(decoded)) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(decoded)}/`;
}
