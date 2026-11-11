import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import { site } from '../../lib/data';
import { formatDate, formatNumber } from '../../lib/format';
import type { Day } from '../../lib/schedule';

interface Props {
  value: Day;
  onChange: (d: Day) => void;
}

/** "Day 1 · 20 November · Competitions" / "Day 2 · 21 November · Rajyotsava" toggle (aria-pressed buttons). */
export function DayTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const days: { n: Day; date: string; what: string }[] = [
    { n: 1, date: site.day1Date, what: t('eventPage.tabs.day1') },
    { n: 2, date: site.day2Date, what: t('eventPage.tabs.day2') },
  ];
  return (
    <div role="group" aria-label={t('eventPage.tabs.label')} className="daytabs" data-testid="day-tabs">
      {days.map((d) => {
        const head = `${t('eventPage.tabs.day', { n: formatNumber(d.n, lang) })} · ${formatDate(d.date, lang)}`;
        return (
          <button
            key={d.n}
            type="button"
            className="daytab"
            aria-pressed={value === d.n}
            aria-controls="day-panel"
            aria-label={`${head} · ${d.what}`}
            onClick={() => onChange(d.n)}
            data-testid={`tab-day${d.n}`}
          >
            <span className="font-display text-lg leading-snug">{head}</span>
            <span className="text-sm font-semibold">{d.what}</span>
          </button>
        );
      })}
    </div>
  );
}
