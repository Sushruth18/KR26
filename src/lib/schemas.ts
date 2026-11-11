import { z } from 'zod';
import { TODO } from './todo';

export { TODO };

const bilingual = z.object({ kn: z.string().min(1), en: z.string().min(1) });
const bilingualList = z.object({ kn: z.array(z.string()).min(1), en: z.array(z.string()).min(1) });
const isoDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const logoPath = z.union([z.literal(''), z.string().regex(/^\/[^?#]+\.(png|jpe?g|webp|avif|svg)$/i, 'a path under public/, e.g. /brand/logo.png')]);

export const eventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  code: z.string().regex(/^[A-Z]{3}$/),
  category: z.enum(['students', 'faculty']),
  name: bilingual,
  icon: z.string(),
  /** Optional card decoration, e.g. a kolam-pattern corner for Rangoli. */
  ornament: z.enum(['kolam']).optional(),
  date: isoDate,
  /** HH:MM (IST) or TODO-CONFIRM */
  time: z.union([hhmm, z.literal(TODO)]),
  venue: bilingual,
  teamSize: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  deadline: isoDateTime,
  prizes: z.discriminatedUnion('type', [
    z.object({ type: z.literal('cash'), first: z.number().int().positive(), second: z.number().int().positive() }),
    z.object({ type: z.literal('memento') }),
  ]),
  rules: bilingualList,
  coordinator: z.object({ name: z.string(), phone: z.string() }),
  completed: z.boolean(),
});
export const eventsSchema = z.array(eventSchema);
export type CompetitionEvent = z.infer<typeof eventSchema>;

export const scheduleItemSchema = z.object({
  day: z.union([z.literal(1), z.literal(2)]),
  start: hhmm,
  end: hhmm,
  title: bilingual,
  venue: bilingual,
  description: bilingual.optional(),
  highlight: z.boolean().optional(),
  kind: z.enum(['break']).optional(),
});
export const scheduleSchema = z.array(scheduleItemSchema);
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

export const guestsSchema = z.array(z.object({ name: bilingual, title: bilingual, photo: z.string() }));
export type Guest = z.infer<typeof guestsSchema>[number];

export const teamSchema = z.array(
  z.object({
    group: bilingual,
    members: z.array(
      z.object({
        name: bilingual,
        role: bilingual,
        photo: z.string(),
        linkedin: z.string().url().optional(),
        instagram: z.string().url().optional(),
      }),
    ),
  }),
);
export type TeamGroup = z.infer<typeof teamSchema>[number];

export const gallerySchema = z.object({
  photos: z.array(
    z.object({ year: z.number().int(), src: z.string(), alt: bilingual, caption: bilingual.optional() }),
  ),
  reels: z.array(
    z.object({
      year: z.number().int(),
      poster: z.string(),
      title: bilingual,
      video: z.string().optional(),
      url: z.string().url().optional(),
    }),
  ),
});
export type GalleryData = z.infer<typeof gallerySchema>;

export const siteSchema = z.object({
  day1Date: isoDate,
  day2Date: isoDate,
  competitionsStart: isoDateTime,
  competitionsEnd: isoDateTime,
  eventStart: isoDateTime,
  eventEnd: isoDateTime,
  registrationClose: isoDateTime,
  prizePoolTotal: z.number().int().positive(),
  /** Public origin of the deployed site, no trailing slash — used for canonical, og:url/og:image, sitemap and emails. */
  siteUrl: z
    .string()
    .url()
    .refine((u) => /^https:\/\/[^/]+$/.test(u), 'siteUrl must be an https origin with no path or trailing slash'),
  /** Empty string = not yet confirmed; UI hides the element. */
  instagramUrl: z.union([z.literal(''), z.string().url()]),
  contactEmail: z.union([z.literal(''), z.string().email()]),
  madeBy: z.string(),
  /**
   * Master logo files under public/ (e.g. "/brand/college-logo.png"); empty = not supplied, logo hidden.
   * The site serves WebP copies made by `npm run brand:images`, never the master itself.
   */
  logos: z.object({ college: logoPath, club: logoPath, jubilee: logoPath, cultural: logoPath }),
  minFormSeconds: z.number().min(0),
  mapQuery: z.string().min(1),
  departments: z.array(z.string().min(1)).min(1),
  /** Odd semesters only (Nov = odd term). byDepartment overrides default (e.g. MBA/MCA). */
  semesters: z.object({
    default: z.array(z.number().int().min(1).max(10)).min(1),
    byDepartment: z.record(z.string(), z.array(z.number().int().min(1).max(10)).min(1)),
  }),
});
export type SiteConfig = z.infer<typeof siteSchema>;
