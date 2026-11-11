import manifest from '../data/artist.generated.json';

/** src/data/artist.generated.json (written by `npm run brand:images`). */
export interface ArtistAsset {
  /** The master under public/, as named in artist.json → photo. */
  source: string;
  /** sha1 of the master — validate-data compares it to catch a master changed without regenerating. */
  sha1: string;
  /** Intrinsic size of the master. */
  width: number;
  height: number;
  /** WebP copies, ascending by width, never wider than the master. */
  variants: { w: number; src: string }[];
}

export const artistAsset = manifest as ArtistAsset;
