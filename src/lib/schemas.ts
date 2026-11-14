import { z } from 'zod';
import { TODO } from './todo';
import { RULES } from './rules';

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
  /** Optional HH:MM (IST) end; shown as a range ("12:30 PM – 4:30 PM") and used as the .ics DTEND. Needs a real `time`. */
  endTime: hhmm.optional(),
  venue: bilingual,
  /** "kannada" = the event is held in Kannada only; the card and the register summary show a notice. */
  medium: z.literal('kannada').optional(),
  /**
   * Events to suggest to someone who cannot take part in Kannada (ids of other events, same category; shown as links in
   * the medium notice). Checked by validate-data.
   */
  alternatives: z.array(z.string()).optional(),
  /**
   * "nonKannadiga" = only for students whose mother tongue is not Kannada: the Register page asks them to confirm it
   * (required checkbox), the server rejects a registration without it and stores it in eligibility_confirmed.
   */
  eligibility: z.literal('nonKannadiga').optional(),
  teamSize: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  deadline: isoDateTime,
  prizes: z.discriminatedUnion('type', [
    z.object({ type: z.literal('cash'), first: z.number().int().positive(), second: z.number().int().positive() }),
    z.object({ type: z.literal('memento') }),
  ]),
  rules: bilingualList,
  /** 0–3 people (0 = not named yet: the card shows no coordinator block); phone = 10 digits (RULES.phone), a tel: link each. */
  coordinators: z
    .array(
      z
        .object({
          name: z.string().trim().min(1),
          phone: z.string().regex(new RegExp(RULES.phone.pattern), 'phone must be 10 digits starting with 6–9 (no +91, no spaces)'),
        })
        .strict(),
    )
    .max(3),
  completed: z.boolean(),
});
export const eventsSchema = z.array(eventSchema);
/** An events.json entry as stored (what scripts read). */
export type EventRecord = z.infer<typeof eventSchema>;
/** An event as the browser gets it: `rules` live in `virtual:competition-rules` (scripts/vite-plugin-split-rules.ts). */
export type CompetitionEvent = Omit<EventRecord, 'rules'>;

/** One stop of the Day 2 timeline. Start times only — the site shows no end times or durations. */
export const scheduleItemSchema = z
  .object({
    day: z.union([z.literal(1), z.literal(2)]),
    start: hhmm,
    title: bilingual,
    venue: bilingual,
    description: bilingual.optional(),
    /** The centrepiece stop (Inauguration & Procession) — drawn with the Ambari. */
    highlight: z.boolean().optional(),
    /** The headline-act stop: shows the artist from artist.json. */
    headline: z.boolean().optional(),
  })
  .strict();
export const scheduleSchema = z.array(scheduleItemSchema);
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

/** "Special attractions" banners. `starts` are start times of schedule stops (validated to exist). */
export const attractionsSchema = z.array(
  z
    .object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      icon: z.string(),
      title: bilingual,
      text: bilingual,
      starts: z.array(hhmm).min(1),
      headline: z.boolean().optional(),
    })
    .strict(),
);
export type Attraction = z.infer<typeof attractionsSchema>[number];

/**
 * The headline artists, in the order they are shown (artist.json is a list). The shared caption's event label
 * defaults to the headline schedule stop's title; `caption` overrides it for one artist's alt text. The date and
 * time are always read from the headline stop.
 */
export const artistSchema = z
  .object({
    /** Lower-case slug; keys src/data/artist.generated.json. */
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: bilingual,
    photo: z.string().regex(/^\/[^?#]+\.(jpe?g|png|webp)$/i, 'a path under public/, e.g. /artist/remo.jpg'),
    /** CSS object-position, so the face is not cut when the frame crops the photo. */
    focus: z.string().regex(/^\d{1,3}% \d{1,3}%$/).optional(),
    caption: bilingual.optional(),
  })
  .strict();
export const artistsSchema = z
  .array(artistSchema)
  .min(1)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    for (const [i, a] of list.entries()) {
      if (seen.has(a.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `duplicate artist id "${a.id}"` });
      seen.add(a.id);
    }
  });
export type Artist = z.infer<typeof artistSchema>;

export const guestsSchema = z.array(z.object({ name: bilingual, title: bilingual, photo: z.string() }));
export type Guest = z.infer<typeof guestsSchema>[number];

/** A team member. `photo` is a key of src/data/team-photos.generated.json ("" = no photo yet → initials frame). */
export const teamMemberSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: bilingual,
  role: bilingual,
  photo: z.string(),
  linkedin: z.string().url().optional(),
  instagram: z.string().url().optional(),
});
/** One troupe: `id` is a group of src/data/team-config.json, which owns the label and the page order. */
export const teamSchema = z.array(z.object({ id: z.string(), members: z.array(teamMemberSchema) }));
export type TeamMember = z.infer<typeof teamMemberSchema>;
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
  /** "General instructions" for every competition (Competitions page + Register review step). */
  generalRules: bilingualList,
});
/** site.json as stored (what scripts read). */
export type SiteRecord = z.infer<typeof siteSchema>;
/** site.json as the browser gets it: `generalRules` live in `virtual:competition-rules`. */
export type SiteConfig = Omit<SiteRecord, 'generalRules'>;
