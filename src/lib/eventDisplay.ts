import type { TFunction } from 'i18next';
import type { CompetitionEvent } from './schemas';
import { formatDate, formatNumber, formatPrize, formatTime, isTodo, type Lang } from './format';

/** Localised, TBA-aware strings for showing an event (cards, register summary, pass). */
export function eventDisplay(e: CompetitionEvent, lang: Lang, t: TFunction) {
  const range =
    e.teamSize.min === e.teamSize.max
      ? formatNumber(e.teamSize.min, lang)
      : `${formatNumber(e.teamSize.min, lang)}–${formatNumber(e.teamSize.max, lang)}`;
  return {
    name: e.name[lang],
    date: formatDate(e.date, lang),
    dateWithYear: formatDate(e.date, lang, { year: true, weekday: true }),
    time: isTodo(e.time) ? t('common.timeTba') : formatTime(e.time, lang),
    venue: isTodo(e.venue[lang]) ? t('common.tba') : e.venue[lang],
    teamRange: range,
    team: e.teamSize.max === 1 ? t('register.summary.individual') : t('register.summary.people', { range }),
    prizes:
      e.prizes.type === 'cash'
        ? `${t('register.summary.first')} ${formatPrize(e.prizes.first, lang)} · ${t('register.summary.second')} ${formatPrize(e.prizes.second, lang)}`
        : t('register.summary.memento'),
    isTeam: e.teamSize.max > 1,
  };
}
