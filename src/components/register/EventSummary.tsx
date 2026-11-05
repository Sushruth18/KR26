import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import { eventDisplay } from '../../lib/eventDisplay';
import { formatNumber } from '../../lib/format';
import type { CompetitionEvent } from '../../lib/schemas';
import type { ResolvedEvent } from '../../lib/eventState';
import { StatusPill } from './StatusPill';

interface Props {
  event: CompetitionEvent;
  resolved: ResolvedEvent | null;
  loading: boolean;
}

export function EventSummary({ event, resolved, loading }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const d = eventDisplay(event, lang, t);
  const rows: [string, string][] = [
    [t('register.summary.date'), `${t('register.summary.dayLabel', { n: formatNumber(1, lang) })} · ${d.dateWithYear}`],
    [t('register.summary.time'), d.time],
    [t('register.summary.venue'), d.venue],
    [t('register.summary.team'), d.team],
    [t('register.summary.prizes'), d.prizes],
  ];

  return (
    <div className="card mt-4 p-4 sm:p-5" data-testid="event-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl text-gold-300">{d.name}</h3>
        {loading ? <span className="skeleton h-6 w-28" aria-hidden="true" /> : resolved && <StatusPill state={resolved.state} />}
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ivory-300">{k}</dt>
            <dd className="m-0 text-ivory-50">{v}</dd>
          </div>
        ))}
        <dt className="text-ivory-300">{t('register.summary.seats')}</dt>
        <dd className="m-0 text-ivory-50" data-testid="seats-left">
          {loading ? (
            <span className="skeleton inline-block h-4 w-16 align-middle" aria-hidden="true" />
          ) : resolved?.seatsLeft != null ? (
            t('register.summary.seatsOf', { left: formatNumber(resolved.seatsLeft, lang), total: formatNumber(resolved.seats, lang) })
          ) : (
            <span className="text-ivory-300">{t('state.liveUnavailable')}</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
