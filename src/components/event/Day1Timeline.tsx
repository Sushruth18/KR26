import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { RegisterAction } from '../competitions/RegisterAction';
import { useLang } from '../../hooks/useLang';
import { useNow } from '../../hooks/useNow';
import { useResolvedEvents } from '../../hooks/useResolvedEvents';
import { eventDisplay } from '../../lib/eventDisplay';
import { day1Groups, day1Position, stopState, type StopState } from '../../lib/schedule';
import type { CompetitionEvent } from '../../lib/schemas';
import { RouteStop } from './RouteStop';

/**
 * Day 1 is generated from events.json: competitions with a confirmed time in order, then the ones whose time
 * is still to be announced. Each stop links to its competition card and its Register button.
 */
export function Day1Timeline() {
  const { t } = useTranslation();
  const lang = useLang();
  const { resolved, loading } = useResolvedEvents();
  const { timed, tba } = day1Groups();
  const { current, next } = day1Position(timed, useNow(30_000));

  const stop = (e: CompetitionEvent, state: StopState) => {
    const d = eventDisplay(e, lang, t);
    return (
      <RouteStop key={e.id} state={state} time={timedTime(e, d.time)} dateTime={e.time} testId={`stop-${e.id}`}>
        <h3 className="m-0 mt-1 text-xl text-ivory-50">{d.name}</h3>
        <p className="route-meta m-0 mt-1 flex items-center gap-1.5 text-sm text-ivory-300">
          <MapPin size={15} aria-hidden="true" />
          <span className="sr-only">{t('eventPage.timeline.venue')}: </span>
          {d.venue}
        </p>
        <p className="m-0 mt-1 text-sm text-ivory-300">{d.prizes}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            to={`/competitions?for=${e.category}#${e.id}`}
            className="btn btn-ghost"
            aria-label={`${t('eventPage.timeline.details')}: ${d.name}`}
            data-testid={`details-${e.id}`}
          >
            {t('eventPage.timeline.details')}
          </Link>
          <div>
            <RegisterAction eventId={e.id} name={d.name} resolved={resolved[e.id]!} loading={loading} />
          </div>
        </div>
      </RouteStop>
    );
  };

  return (
    <div data-testid="timeline-day1">
      {timed.length > 0 && (
        <ol className="route" aria-label={t('eventPage.timeline.day1Label')}>
          {timed.map((e, i) => stop(e, stopState(i, current, next)))}
        </ol>
      )}
      {tba.length > 0 && (
        <>
          <p className="route-group font-display text-lg text-gold-300" data-testid="tba-group">
            {t('eventPage.timeline.tbaGroup')}
          </p>
          <ol className="route" aria-label={t('eventPage.timeline.tbaGroup')}>
            {tba.map((e) => stop(e, 'upcoming'))}
          </ol>
        </>
      )}
    </div>
  );
}

/** Timed events show their start time on the card; "time to be announced" ones sit under the group heading instead. */
function timedTime(e: CompetitionEvent, formatted: string): string | undefined {
  return /^\d{2}:\d{2}$/.test(e.time) ? formatted : undefined;
}
