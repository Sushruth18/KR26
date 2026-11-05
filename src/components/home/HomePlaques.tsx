import { useTranslation } from 'react-i18next';
import { CalendarDays, Trophy, Flag } from 'lucide-react';
import { BrassPlaque } from '../ui/BrassPlaque';
import { useLang } from '../../hooks/useLang';
import { cashPrizePool, events, site } from '../../lib/data';
import { dateOnlyParts, formatDate, formatNumber, formatPrize, monthName } from '../../lib/format';

/** Dates · number of competitions · prize pool — all computed from the data files. */
export function HomePlaques() {
  const { t } = useTranslation();
  const lang = useLang();
  const d1 = dateOnlyParts(site.day1Date);
  const d2 = dateOnlyParts(site.day2Date);
  const sameMonth = d1.month === d2.month && d1.year === d2.year;
  const count = (c: string) => formatNumber(events.filter((e) => e.category === c).length, lang);

  return (
    <section aria-labelledby="plaques-title" className="cv-auto container-page pb-6 pt-10 [--cv-h:780px] md:[--cv-h:330px]">
      <h2 id="plaques-title" className="sr-only">
        {t('home.plaques.heading')}
      </h2>
      <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
        <li>
          <BrassPlaque
            className="h-full"
            icon={<CalendarDays size={26} strokeWidth={1.6} />}
            value={
              sameMonth
                ? `${formatNumber(d1.day, lang)}–${formatNumber(d2.day, lang)}`
                : `${formatDate(site.day1Date, lang)} – ${formatDate(site.day2Date, lang)}`
            }
            unit={sameMonth ? monthName(d1.month, lang) : undefined}
            caption={t('home.plaques.datesCaption')}
          />
        </li>
        <li>
          <BrassPlaque
            className="h-full"
            icon={<Flag size={26} strokeWidth={1.6} />}
            value={formatNumber(events.length, lang)}
            unit={t('home.plaques.eventsUnit')}
            caption={t('home.plaques.eventsCaption', { students: count('students'), faculty: count('faculty') })}
          />
        </li>
        <li>
          <BrassPlaque
            className="h-full"
            icon={<Trophy size={26} strokeWidth={1.6} />}
            value={formatPrize(cashPrizePool, lang)}
            unit={t('home.plaques.prizeUnit')}
            caption={t('home.plaques.prizeCaption')}
          />
        </li>
      </ul>
    </section>
  );
}
