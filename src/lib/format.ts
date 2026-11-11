/**
 * The ONE place numbers, dates, times and prizes are formatted (CLAUDE.md §3 numerals rule).
 *  - kn: Kannada numerals for dates, times, counts, prizes (own digit mapper; no Intl dependency).
 *  - en: Latin numerals.
 * Registration IDs, phone numbers and USNs are never passed through here — they stay Latin.
 */
import { TODO } from './todo';

export type Lang = 'kn' | 'en';

const KN_DIGITS = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'] as const;

export function toKannadaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => KN_DIGITS[Number(d)] ?? d);
}

function digits(input: string | number, lang: Lang): string {
  return lang === 'kn' ? toKannadaDigits(input) : String(input);
}

const MONTHS = {
  kn: ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const;

const WEEKDAYS = {
  kn: ['ಭಾನುವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
} as const;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

/** Calendar parts of an instant, as seen in India Standard Time. */
export function istParts(instant: Date | string | number): DateParts {
  const t = new Date(instant).getTime() + IST_OFFSET_MS;
  const d = new Date(t);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** Month name, 1–12. */
export function monthName(month: number, lang: Lang): string {
  return MONTHS[lang][month - 1] ?? '';
}

/** Parts for a plain "YYYY-MM-DD" date (no timezone maths involved). */
export function dateOnlyParts(date: string): DateParts {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { year: y, month: m, day: d, weekday, hour: 0, minute: 0 };
}

function toParts(input: string): DateParts {
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? dateOnlyParts(input) : istParts(input);
}

export function formatNumber(n: number, lang: Lang, opts: { pad?: number } = {}): string {
  const s = opts.pad ? String(Math.trunc(n)).padStart(opts.pad, '0') : String(n);
  return digits(s, lang);
}

export interface DateFormatOptions {
  year?: boolean;
  weekday?: boolean;
  /** English: three-letter month ("21 Nov"). Kannada has no abbreviation and is unchanged. */
  short?: boolean;
}

/** kn: "೨೧ ನವೆಂಬರ್ ೨೦೨೬" · en: "21 November 2026". Accepts "YYYY-MM-DD" or an ISO instant (read in IST). */
export function formatDate(input: string | Date, lang: Lang, opts: DateFormatOptions = {}): string {
  const p = typeof input === 'string' ? toParts(input) : istParts(input);
  const full = MONTHS[lang][p.month - 1] ?? '';
  const month = opts.short && lang === 'en' ? full.slice(0, 3) : full;
  let out = `${digits(p.day, lang)} ${month}`;
  if (opts.year) out += ` ${digits(p.year, lang)}`;
  if (opts.weekday) out = `${WEEKDAYS[lang][p.weekday] ?? ''}, ${out}`;
  return out;
}

/** ISO instant → kn: "೧೮ ನವೆಂಬರ್, ರಾತ್ರಿ ೧೧:೫೯" · en: "18 November, 11:59 PM" (read in IST). */
export function formatDeadline(iso: string, lang: Lang): string {
  const p = istParts(iso);
  const hhmm = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  return `${formatDate(iso, lang)}, ${formatTime(hhmm, lang)}`;
}

/** Kannada part-of-day word: ಬೆಳಿಗ್ಗೆ (<12), ಮಧ್ಯಾಹ್ನ (12–16), ಸಂಜೆ (16–19), ರಾತ್ರಿ (19+). */
export function kannadaDayPart(hour24: number): string {
  if (hour24 < 12) return 'ಬೆಳಿಗ್ಗೆ';
  if (hour24 < 16) return 'ಮಧ್ಯಾಹ್ನ';
  if (hour24 < 19) return 'ಸಂಜೆ';
  return 'ರಾತ್ರಿ';
}

/** "HH:MM" (24h, IST) → kn: "ಬೆಳಿಗ್ಗೆ ೯:೦೦" · en: "9:00 AM". */
export function formatTime(hhmm: string, lang: Lang): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  if (lang === 'kn') return `${kannadaDayPart(h)} ${toKannadaDigits(`${h12}:${mm}`)}`;
  return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatTimeRange(start: string, end: string, lang: Lang): string {
  return `${formatTime(start, lang)} – ${formatTime(end, lang)}`;
}

/** Minutes → kn: "೨ ಗಂ ೦೫ ನಿ" · en: "2 h 05 m". */
export function formatDuration(totalMinutes: number, lang: Lang): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hUnit = lang === 'kn' ? 'ಗಂ' : 'h';
  const mUnit = lang === 'kn' ? 'ನಿ' : 'm';
  const parts: string[] = [];
  if (h > 0) parts.push(`${digits(h, lang)} ${hUnit}`);
  if (m > 0) parts.push(`${digits(h > 0 ? String(m).padStart(2, '0') : m, lang)} ${mUnit}`);
  return parts.join(' ');
}

export function minutesBetween(startHHMM: string, endHHMM: string): number {
  const toMin = (s: string) => {
    const [h = 0, m = 0] = s.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(endHHMM) - toMin(startHHMM);
}

/** ₹ with Indian digit grouping: ₹3,000 · ₹39,000 · ₹1,00,000 (kn: ₹೩,೦೦೦). */
export function formatPrize(amount: number, lang: Lang): string {
  const s = String(Math.trunc(Math.abs(amount)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `₹${digits(grouped, lang)}`;
}

/** True for values that are still TODO-CONFIRM placeholders in the data files. */
export function isTodo(value: string | undefined | null): boolean {
  return !value || value.trim() === TODO;
}
