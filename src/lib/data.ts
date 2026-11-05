import eventsRaw from '../data/events.json';
import scheduleRaw from '../data/schedule.json';
import guestsRaw from '../data/guests.json';
import teamRaw from '../data/team.json';
import galleryRaw from '../data/gallery.json';
import siteRaw from '../data/site.json';
import {
  eventsSchema,
  scheduleSchema,
  guestsSchema,
  teamSchema,
  gallerySchema,
  siteSchema,
  type CompetitionEvent,
} from './schemas';

// Parsed once at module load; the same schemas also run at build time (scripts/validate-data.ts).
export const site = siteSchema.parse(siteRaw);
export const events = eventsSchema.parse(eventsRaw);
export const schedule = scheduleSchema.parse(scheduleRaw);
export const guests = guestsSchema.parse(guestsRaw);
export const team = teamSchema.parse(teamRaw);
export const gallery = gallerySchema.parse(galleryRaw);

export const cashPrizePool = events.reduce(
  (sum, e) => sum + (e.prizes.type === 'cash' ? e.prizes.first + e.prizes.second : 0),
  0,
);

export function getEvent(id: string | null | undefined): CompetitionEvent | undefined {
  return events.find((e) => e.id === id);
}
