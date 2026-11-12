import eventsRaw from '../data/events.json';
import scheduleRaw from '../data/schedule.json';
import artistRaw from '../data/artist.json';
import attractionsRaw from '../data/attractions.json';
import guestsRaw from '../data/guests.json';
import galleryRaw from '../data/gallery.json';
import siteRaw from '../data/site.json';
import type { Lang } from './format';
import type { CompetitionEvent, SiteConfig, ScheduleItem, Guest, GalleryData, Artist, Attraction } from './schemas';

// The data files are validated with the zod schemas in scripts/validate-data.ts on every build (`prebuild`), so the
// browser does not ship or run zod just to re-check them — that cost ~16 KB gzip on the critical path of every page.
// (Type-only import above: erased at build time.)
export const site = siteRaw as unknown as SiteConfig;
export const events = eventsRaw as unknown as CompetitionEvent[];
export const schedule = scheduleRaw as unknown as ScheduleItem[];
/** Headline artists in display order (artist.json). */
export const artists = artistRaw as unknown as Artist[];
/** Every headline artist's name, in order — on the headline stop, its banner and the calendar file. */
export const artistNames = (lang: Lang) => artists.map((a) => a.name[lang]).join(' · ');
export const attractions = attractionsRaw as unknown as Attraction[];
export const guests = guestsRaw as unknown as Guest[];
export const gallery = galleryRaw as unknown as GalleryData;

export const cashPrizePool = events.reduce(
  (sum, e) => sum + (e.prizes.type === 'cash' ? e.prizes.first + e.prizes.second : 0),
  0,
);

export function getEvent(id: string | null | undefined): CompetitionEvent | undefined {
  return events.find((e) => e.id === id);
}
