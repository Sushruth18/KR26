/**
 * Width estimate for plaque values, so a value can be sized from its card's width in pure CSS
 * (`font-size: clamp(…, var(--fit) * 1cqi, …)`) with no measuring at runtime and no layout shift.
 *
 * A value may wrap only at a normal space or a zero-width space (U+200B); every other gap is a
 * no-break space. The longest unbreakable chunk decides the size, so it always fits on one line.
 *
 * Widths are in em of the display fonts (Baloo Tamma 2 for Kannada, Cinzel for Latin), calibrated
 * against the browser (Nov 2026) and deliberately a little generous; `npm run e2e:plaques` checks
 * the real rendering at 320–1920 px in both languages.
 */

/** No-break space (U+00A0) and zero-width space (U+200B), spelled out so they are visible in the source. */
export const NBSP = String.fromCharCode(0xa0);
export const ZWSP = String.fromCharCode(0x200b);
const BREAKS = new RegExp('[ ' + ZWSP + ']+');

const VIRAMA = 0x0ccd;
const isKnConsonant = (c: number) => (c >= 0x0c95 && c <= 0x0cb9) || c === 0x0cde;
const isKnVowel = (c: number) => c >= 0x0c85 && c <= 0x0c94;
/** Vowel signs and marks that take their own horizontal space (ಾ ು ೂ ೃ ೄ ೊ ೋ ೌ ೕ ೖ ಂ ಃ). */
const KN_SPACING = new Set([0x0cbe, 0x0cc1, 0x0cc2, 0x0cc3, 0x0cc4, 0x0cca, 0x0ccb, 0x0ccc, 0x0cd5, 0x0cd6, 0x0c82, 0x0c83]);

function charEm(s: string, i: number): number {
  const c = s.charCodeAt(i);
  const prev = i > 0 ? s.charCodeAt(i - 1) : 0;
  const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
  if (isKnConsonant(c)) return prev === VIRAMA ? 0.15 : 0.8; // after a virama it is a subscript (ಒತ್ತಕ್ಷರ)
  if (isKnVowel(c)) return 0.95;
  if (c === VIRAMA) return isKnConsonant(next) ? 0.1 : 0.35; // a visible ್ at the end of a cluster
  if (KN_SPACING.has(c)) return 0.5;
  if (c >= 0x0c80 && c <= 0x0cff) return 0.1; // ಿ ೀ ೆ ೇ ೈ … sit over or beside the consonant
  if (c >= 0x30 && c <= 0x39) return 0.65;
  if (c === 0x20 || c === 0xa0) return 0.28;
  if (c === 0x200b) return 0;
  if ('.,:;\'’'.includes(s[i]!)) return 0.25;
  if (s[i] === 'I') return 0.45;
  if (s[i] === '–' || s[i] === '-') return 0.55;
  if (s[i] === '₹' || s[i] === '+') return 0.65;
  if (c >= 0x41 && c <= 0x5a) return 0.9;
  if (c >= 0x61 && c <= 0x7a) return 0.66;
  return 0.9;
}

/** Estimated width of one unbreakable piece of text, in em. */
export function textEm(s: string): number {
  let w = 0;
  for (let i = 0; i < s.length; i++) w += charEm(s, i);
  return w;
}

/** The pieces a value may wrap between: normal spaces and zero-width spaces. */
export function chunks(s: string): string[] {
  return s.split(BREAKS).filter(Boolean);
}

/**
 * `--fit` for a plaque value: the font size, in % of the card's content width (cqi), at which its
 * longest chunk just fits, with a 4% margin. CSS clamps it between a minimum and the design size.
 */
export function fitCqi(s: string): number {
  const widest = Math.max(1, ...chunks(s).map(textEm));
  return Math.round((100 / (widest * 1.04)) * 100) / 100;
}

/** Keeps a piece of text on one line: every space becomes a no-break space. */
export const noBreak = (s: string) => s.replace(/ /g, NBSP);

/**
 * "A – B" that may wrap only after the dash ("9:00 AM –" / "5:45 PM"): each side stays whole and the
 * dash sticks to the first part.
 */
export const breakableRange = (a: string, b: string) => `${noBreak(a)}${NBSP}– ${noBreak(b)}`;
