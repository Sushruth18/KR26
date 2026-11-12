import { useTranslation } from 'react-i18next';
import { MapPin, Music } from 'lucide-react';
import { AmbariElephant } from '../art/AmbariElephant';
import { useLang } from '../../hooks/useLang';
import { useNow } from '../../hooks/useNow';
import { artistNames } from '../../lib/data';
import { formatTime } from '../../lib/format';
import { day2Position, day2Stops, stopState } from '../../lib/schedule';
import { RouteStop } from './RouteStop';

/** Day 2 programme from schedule.json: start times only, with the Now / Next marker from the IST clock. */
export function Day2Timeline() {
  const { t } = useTranslation();
  const lang = useLang();
  const { current, next } = day2Position(useNow(30_000));

  return (
    <ol className="route" aria-label={t('eventPage.timeline.day2Label')} data-testid="timeline-day2">
      {day2Stops.map((s, i) => (
        <RouteStop
          key={s.start}
          state={stopState(i, current, next)}
          time={formatTime(s.start, lang)}
          dateTime={s.start}
          highlight={s.highlight}
          headline={s.headline}
          testId={`stop-${s.start.replace(':', '')}`}
        >
          <div className={`route-meta mt-1 flex items-center gap-3 ${s.highlight ? 'min-h-14' : ''}`}>
            {s.highlight && <AmbariElephant className="h-14 w-auto shrink-0" />}
            <h3 className="m-0 text-xl text-ivory-50">{s.title[lang]}</h3>
          </div>
          {s.description && <p className="m-0 mt-1 text-ivory-300">{s.description[lang]}</p>}
          {s.headline && (
            <p className="route-meta m-0 mt-1 flex items-center gap-2 font-semibold text-gold-300" data-testid="stop-artist">
              <Music size={16} aria-hidden="true" />
              {artistNames(lang)}
            </p>
          )}
          <p className="route-meta m-0 mt-2 flex items-center gap-1.5 text-sm text-ivory-300">
            <MapPin size={15} aria-hidden="true" />
            <span className="sr-only">{t('eventPage.timeline.venue')}: </span>
            {s.venue[lang]}
          </p>
        </RouteStop>
      ))}
    </ol>
  );
}
