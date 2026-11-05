import manifest from '../data/logos.generated.json';

export type LogoKey = 'college' | 'club';

/** One entry of src/data/logos.generated.json (written by `npm run brand:images`). */
export interface LogoAsset {
  /** The master under public/, as named in site.json → logos. */
  source: string;
  /** sha1 of the master — validate-data compares it to catch a master changed without regenerating. */
  sha1: string;
  /** Intrinsic size of the master (its aspect ratio sizes every copy). */
  width: number;
  height: number;
  /** WebP copies, ascending by width. */
  variants: { w: number; src: string }[];
}

const logos = manifest as Record<LogoKey, LogoAsset | null>;

/** null while site.json → logos.<key> is empty — the logo is then hidden. */
export function getLogo(key: LogoKey): LogoAsset | null {
  return logos[key];
}
