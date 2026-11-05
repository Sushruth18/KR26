import { useTranslation } from 'react-i18next';
import { Award, Trophy } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { formatPrize } from '../../lib/format';
import type { CompetitionEvent } from '../../lib/schemas';

/** 1st / 2nd cash prize plates, or a Memento badge (all faculty events). */
export function PrizeRow({ prizes }: { prizes: CompetitionEvent['prizes'] }) {
  const { t } = useTranslation();
  const lang = useLang();

  if (prizes.type === 'memento') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" data-testid="prize-memento">
        <span className="prize-plate">
          <Award size={16} aria-hidden="true" className="text-gold-300" />
          {t('competitions.mementoBadge')}
        </span>
        <span className="text-sm text-ivory-300">{t('competitions.mementoNote')}</span>
      </div>
    );
  }

  const rows = [
    [t('register.summary.first'), prizes.first],
    [t('register.summary.second'), prizes.second],
  ] as const;
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0" aria-label={t('competitions.prizes')} data-testid="prize-cash">
      {rows.map(([label, amount], i) => (
        <li key={label} className={`prize-plate ${i === 0 ? 'prize-plate-first' : ''}`}>
          <Trophy size={16} aria-hidden="true" className={i === 0 ? 'text-gold-300' : 'text-ivory-300'} />
          <span className="text-ivory-300">{label}</span>
          <span className="font-semibold text-ivory-50">{formatPrize(amount, lang)}</span>
        </li>
      ))}
    </ul>
  );
}
