import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, MapPin, Trophy } from 'lucide-react';
import { BrassPlaque } from '../ui/BrassPlaque';
import { Reveal } from '../ui/Reveal';
import { useLang } from '../../hooks/useLang';
import { cashPrizePool, site } from '../../lib/data';
import { dateOnlyParts, formatDate, formatNumber, formatPrize, formatTime, monthName } from '../../lib/format';

/** Dates · Day 2 time · venue · prize pool — computed from site.json and events.json. */
export function EventPlaques() {
  const { t } = useTranslation();
  const lang = useLang();
  const d1 = dateOnlyParts(site.day1Date);
  const d2 = dateOnlyParts(site.day2Date);
  const sameMonth = d1.month === d2.month && d1.year === d2.year;
  const hhmm = (iso: string) => iso.slice(11, 16); // site.json instants are written in IST
  // Keep each time in one piece ("9:00 AM"), so the range breaks only at the dash on narrow phones.
  const time = (iso: string) => formatTime(hhmm(iso), lang).replace(/ /g, ' ');
  const items = [
    {
      icon: <CalendarDays size={26} strokeWidth={1.6} />,
      value: sameMonth
        ? `${formatNumber(d1.day, lang)}–${formatNumber(d2.day, lang)}`
        : `${formatDate(site.day1Date, lang)} – ${formatDate(site.day2Date, lang)}`,
      unit: sameMonth ? monthName(d1.month, lang) : undefined,
      caption: t('eventPage.plaques.datesCaption'),
    },
    {
      icon: <Clock size={26} strokeWidth={1.6} />,
      value: `${time(site.eventStart)} – ${time(site.eventEnd)}`,
      caption: t('eventPage.plaques.timeCaption'),
    },
    {
      icon: <MapPin size={26} strokeWidth={1.6} />,
      value: t('eventPage.plaques.venueValue'),
      unit: t('eventPage.plaques.venueUnit'),
      caption: t('eventPage.plaques.venueCaption'),
    },
    {
      icon: <Trophy size={26} strokeWidth={1.6} />,
      value: formatPrize(cashPrizePool, lang),
      unit: t('eventPage.plaques.prizeUnit'),
      caption: t('eventPage.plaques.prizeCaption'),
    },
  ];
  return (
    <section aria-label={t('home.plaques.heading')} className="container-page py-8">
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => (
          <li key={i} className="min-w-0">
            <Reveal index={i} className="h-full">
              <BrassPlaque className="h-full" {...p} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
