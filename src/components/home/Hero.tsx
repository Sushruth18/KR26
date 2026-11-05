import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { useLang } from '../../hooks/useLang';
import { useNow } from '../../hooks/useNow';
import { site } from '../../lib/data';
import { formatDate, formatDeadline, formatNumber, istParts } from '../../lib/format';
import { registrationWindow } from '../../lib/festival';
import { CollegeRow } from './CollegeRow';
import { TwoDayStrip } from './TwoDayStrip';
import { HeroScene } from './HeroScene';

const YEAR = istParts(site.eventStart).year;

/** Title lockup, two-day strip and the call to action, standing over the lit palace. */
export function Hero() {
  const { t } = useTranslation();
  const lang = useLang();
  const words = t('brand.wordmark').split(' ');

  return (
    <section aria-labelledby="home-title" className="relative">
      <div className="container-page relative z-10 flex flex-col items-center pt-4 text-center sm:pt-6">
        <CollegeRow />
        <p className="mb-0 mt-3 text-sm text-ivory-300 sm:mt-4 sm:text-base">{t('home.presents')}</p>
        <h1 id="home-title" className="hero-title mt-1">
          {words.map((w, i) => (
            <span key={w} className="block md:inline">
              {w}
              {i < words.length - 1 && ' '}
            </span>
          ))}
          <span className="hero-year font-display">{formatNumber(YEAR, lang)}</span>
        </h1>
        <p className="mb-0 mt-1 text-lg text-ivory-50 sm:mt-2 sm:text-xl">{t('home.tagline')}</p>
        <div className="mt-5 flex w-full justify-center sm:mt-6">
          <TwoDayStrip />
        </div>
      </div>
      <HeroScene />
      <div className="container-page relative z-10 flex flex-col items-center pt-5 text-center">
        <div className="flex w-full max-w-[34rem] flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <LinkButton to="/competitions" variant="primary" className="w-full sm:w-auto sm:flex-1">
            {t('home.cta')}
          </LinkButton>
          <LinkButton to="/team" variant="ghost" className="sm:flex-none">
            <Users size={18} aria-hidden="true" />
            {t('nav.team')}
          </LinkButton>
        </div>
        <RegistrationNote />
      </div>
    </section>
  );
}

/** One line under the CTA: when registration opens, the deadline, or that it has closed. */
function RegistrationNote() {
  const { t } = useTranslation();
  const lang = useLang();
  const win = registrationWindow(site, useNow(60_000));
  const text =
    win === 'notOpen'
      ? t('state.opensOn', { date: formatDate(site.registrationOpen, lang) })
      : win === 'open'
        ? t('home.regBy', { when: formatDeadline(site.registrationClose, lang) })
        : t('home.regClosed');
  return <p className="mb-0 mt-3 min-h-[1.6em] text-sm text-ivory-300">{text}</p>;
}
