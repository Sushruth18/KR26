/**
 * Minimal RFC 5545 calendar file: the competition (all-day when its time is still TBA) and one entry per
 * Day 2 programme stop (same names and start times as the Event Details timeline). Lines are CRLF-terminated and folded at 75 octets without splitting UTF-8 characters.
 */
import type { CompetitionEvent, ScheduleItem, SiteConfig } from './schemas';
import { isTodo, type Lang } from './format';

const CRLF = '\r\n';
const COMPETITION_MINUTES = 120; // TODO-CONFIRM: per-event duration not in the data yet

function escapeText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets (continuation lines start with a space). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join(`${CRLF} `);
}

const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ymd = (date: string) => date.replace(/-/g, '');
function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface IcsInput {
  regId: string;
  event: CompetitionEvent;
  site: SiteConfig;
  lang: Lang;
  /** Day 2 stops in start order (schedule.json). */
  stops: ScheduleItem[];
  /** The headline artist's display name, added to the headline stop's description. */
  artistName: string;
  labels: { suffix: string; day2Description: string; description: string; location: string };
}

export function buildIcs({ regId, event, site, lang, stops, artistName, labels }: IcsInput): string {
  const stamp = utc(Date.now());
  const venue = isTodo(event.venue[lang]) ? labels.location : `${event.venue[lang]}, ${labels.location}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Honnudi Kannada Sangha//KR 2026//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

  lines.push('BEGIN:VEVENT', `UID:${regId}-day1@kr2k26-bmsit`, `DTSTAMP:${stamp}`);
  if (isTodo(event.time)) {
    lines.push(`DTSTART;VALUE=DATE:${ymd(event.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(event.date))}`);
  } else {
    const start = Date.parse(`${event.date}T${event.time}:00+05:30`);
    lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(start + COMPETITION_MINUTES * 60000)}`);
  }
  lines.push(
    `SUMMARY:${escapeText(`${event.name[lang]} — ${labels.suffix}`)}`,
    `LOCATION:${escapeText(venue)}`,
    `DESCRIPTION:${escapeText(labels.description)}`,
    'END:VEVENT',
  );

  // Day 2: one entry per stop. A stop lasts until the next one starts (the last until eventEnd), which is
  // what the calendar needs for DTEND — the website itself shows start times only.
  const at = (hhmm: string) => Date.parse(`${site.day2Date}T${hhmm}:00+05:30`);
  stops.forEach((stop, i) => {
    const end = stops[i + 1] ? at(stops[i + 1]!.start) : Date.parse(site.eventEnd);
    const parts = [stop.description?.[lang], stop.headline ? artistName : '', labels.day2Description].filter(Boolean);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${regId}-day2-${stop.start.replace(':', '')}@kr2k26-bmsit`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(at(stop.start))}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${escapeText(stop.title[lang])}`,
      `LOCATION:${escapeText(`${stop.venue[lang]}, ${labels.location}`)}`,
      `DESCRIPTION:${escapeText(parts.join(' — '))}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}
