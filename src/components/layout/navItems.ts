import { features } from '../../lib/features';

const ALL_NAV_ITEMS = [
  { to: '/', key: 'nav.home', end: true, feature: null },
  { to: '/competitions', key: 'nav.competitions', end: false, feature: null },
  { to: '/event', key: 'nav.event', end: false, feature: null },
  { to: '/gallery', key: 'nav.gallery', end: false, feature: 'gallery' },
  { to: '/team', key: 'nav.team', end: false, feature: null },
  { to: '/register', key: 'nav.register', end: false, feature: null },
] as const;

/** The navbar, the mobile menu and the sitemap: items behind a switched-off feature (src/data/site.json → features) are left out. */
export const NAV_ITEMS = ALL_NAV_ITEMS.filter((i) => i.feature === null || features[i.feature]);
