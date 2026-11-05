import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Hourglass } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { useNow } from '../../hooks/useNow';
import { site } from '../../lib/data';
import { deadlineDaysLeft } from '../../lib/festival';
import { formatDeadline, formatNumber } from '../../lib/format';

/**
 * Shown on Home only while registration is open and closes within 3 days. The whole band is one link
 * (a big tap target on phones); the pill is visual only, so there is a single tab stop.
 */
export function DeadlineBanner() {
  const { t } = useTranslation();
  const lang = useLang();
  const days = deadlineDaysLeft(site, useNow(60_000));
  if (days === null) return null;
  const lead = days === 0 ? t('home.deadline.today') : t('home.deadline.days', { count: days, n: formatNumber(days, lang) });

  return (
    <aside className="deadline-banner" aria-label={lead} data-testid="deadline-banner">
      <Link to="/competitions" className="deadline-link container-page flex min-h-[56px] items-center justify-between gap-3 py-2.5 no-underline sm:justify-center sm:gap-6">
        <span className="flex min-w-0 items-center gap-2.5">
          <Hourglass size={20} className="hidden flex-none text-gold-300 sm:block" aria-hidden="true" />
          <span className="flex flex-col leading-snug">
            <strong className="font-semibold text-gold-300">{lead}</strong>
            <span className="text-sm text-ivory-50">{t('home.deadline.closes', { when: formatDeadline(site.registrationClose, lang) })}</span>
          </span>
        </span>
        <span className="btn btn-primary hidden flex-none text-sm sm:inline-flex">{t('home.deadline.cta')}</span>
        <span className="sr-only sm:hidden">{t('home.deadline.cta')}</span>
        <ChevronRight size={24} className="flex-none text-gold-300 sm:hidden" aria-hidden="true" />
      </Link>
    </aside>
  );
}
