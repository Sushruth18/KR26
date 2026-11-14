import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { getEvent } from '../../lib/data';
import type { CompetitionEvent } from '../../lib/schemas';

/**
 * "Medium: Kannada only" callout for events held in Kannada only (`medium: "kannada"`). When the event lists
 * `alternatives`, it also points non-Kannada speakers to them, each a link to its card on the Competitions page.
 */
export function MediumNotice({ event, className = '' }: { event: CompetitionEvent; className?: string }) {
  const { t } = useTranslation();
  if (event.medium !== 'kannada') return null;
  const alternatives = (event.alternatives ?? []).map(getEvent).filter((e): e is CompetitionEvent => !!e);

  return (
    <div className={`medium-notice ${className}`} role="note" data-testid={`medium-${event.id}`}>
      <Languages size={18} aria-hidden="true" className="mt-[0.15em] flex-none text-gold-400" />
      <p className="m-0 min-w-0">
        <strong className="font-semibold text-gold-300">{t('competitions.medium.kannadaOnly')}</strong>
        {alternatives.length > 0 && (
          <>
            {' '}
            {t('competitions.medium.notSpeaker')}{' '}
            {alternatives.map((alt, i) => (
              <Fragment key={alt.id}>
                {i > 0 && ` ${t('competitions.medium.or')} `}
                <Link to={`/competitions?for=${alt.category}#${alt.id}`} className="medium-link" data-testid={`medium-link-${alt.id}`}>
                  {t(`competitions.medium.short.${alt.id}`)}
                </Link>
              </Fragment>
            ))}
            {t('competitions.medium.tail')}
          </>
        )}
      </p>
    </div>
  );
}
