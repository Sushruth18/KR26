import siteRaw from '../data/site.json';

/** Feature switches from src/data/site.json → features (validated at build by scripts/validate-data.ts). */
export const features = { gallery: siteRaw.features.gallery === true } as const;
