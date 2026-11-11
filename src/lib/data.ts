import eventsRaw from '../data/events.json';
import scheduleRaw from '../data/schedule.json';
import guestsRaw from '../data/guests.json';
import teamRaw from '../data/team.json';
import galleryRaw from '../data/gallery.json';
import siteRaw from '../data/site.json';
import type { CompetitionEvent, SiteConfig, ScheduleItem, Guest, TeamGroup, GalleryData } from './schemas';

// The data files are validated with the zod schemas in scripts/validate-data.ts on every build (`prebuild`), so the
// browser does not ship or run zod just to re-check them — that cost ~16 KB gzip on the critical path of every page.
// (Type-only import above: erased at build time.)
export const site = siteRaw as unknown as SiteConfig;
export const events = eventsRaw as unknown as CompetitionEvent[];
export const schedule = scheduleRaw as unknown as ScheduleItem[];
export const guests = guestsRaw as unknown as Guest[];
export const team = teamRaw as unknown as TeamGroup[];
export const gallery = galleryRaw as unknown as GalleryData;

export const cashPrizePool = events.reduce(
  (sum, e) => sum + (e.prizes.type === 'cash' ? e.prizes.first + e.prizes.second : 0),
  0,
);

export function getEvent(id: string | null | undefined): CompetitionEvent | undefined {
  return events.find((e) => e.id === id);
}
