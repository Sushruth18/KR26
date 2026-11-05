import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import { site } from '../../lib/data';
import { formatDate, formatNumber } from '../../lib/format';

/** Day 1 · Competitions ‖ Day 2 · Rajyotsava Procession — a two-part ticket under the title. */
export function TwoDayStrip() {
  const { t } = useTranslation();
  const lang = useLang();
  const days = [
    { n: 1, date: site.day1Date, what: t('home.day1') },
    { n: 2, date: site.day2Date, what: t('home.day2') },
  ];
  return (
    <div className="daystrip">
      {days.map((d, i) => (
        <div key={d.n} className="contents">
          {i > 0 && <span className="daystrip-sep" aria-hidden="true" />}
          <Link
            to={`/event?day=${d.n}`}
            className="daystrip-day"
            aria-label={t('home.dayAria', { n: formatNumber(d.n, lang), date: formatDate(d.date, lang), what: d.what })}
          >
            <span className="daystrip-num" aria-hidden="true">
              {formatNumber(d.n, lang)}
            </span>
            <span className="flex min-w-0 flex-col leading-snug">
              <span className="font-display text-[1.05rem] text-gold-300">{formatDate(d.date, lang)}</span>
              <span className="text-sm text-ivory-50">{d.what}</span>
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
