import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLang } from '../../hooks/useLang';
import { useNow } from '../../hooks/useNow';
import { site } from '../../lib/data';
import { countdownPhase, remaining } from '../../lib/festival';
import { formatDate, formatNumber, formatTime, istParts, type Lang } from '../../lib/format';
import { Rivets } from '../ui/BrassPlaque';
import { LinkButton } from '../ui/Button';

/** Countdown that moves through the festival's phases on its own (CLAUDE.md §5.1). */
export function Countdown() {
  const { t } = useTranslation();
  const lang = useLang();
  const now = useNow(1000);
  const phase = countdownPhase(site, now);

  return (
    <section aria-labelledby="countdown-title" className="container-page relative z-10 flex flex-col items-center pb-4 pt-8 text-center" data-testid="countdown" data-phase={phase.kind}>
      {phase.kind === 'competitionsOn' && (
        <p className="m-0 mb-1 font-display text-2xl text-gold-300 sm:text-3xl" data-testid="countdown-banner">
          {t('home.countdown.competitionsOn')}
        </p>
      )}
      <h2 id="countdown-title" className={phase.kind === 'live' || phase.kind === 'over' ? 'text-glow text-3xl text-gold-300 sm:text-4xl' : 'text-xl text-ivory-50 sm:text-2xl'}>
        {t(`home.countdown.${phase.kind === 'competitionsOn' ? 'mainEventIn' : phase.kind}`)}
      </h2>

      {'target' in phase ? (
        <Tiles target={phase.target} now={now} lang={lang} />
      ) : phase.kind === 'live' ? (
        <>
          <p className="mt-3 text-ivory-300">{t('home.countdown.liveText', { end: formatTime(hhmm(site.eventEnd), lang) })}</p>
          <LinkButton to="/event?day=2" variant="primary" className="mt-2">
            {t('home.countdown.liveLink')}
          </LinkButton>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-[40ch] text-ivory-300">{t('home.countdown.overText')}</p>
          <LinkButton to="/gallery" variant="primary" className="mt-2">
            {t('home.countdown.galleryLink')}
          </LinkButton>
        </>
      )}

      {phase.kind === 'competitionsOn' && (
        <Link to="/event?day=1" className="mt-4 inline-flex min-h-[44px] items-center text-gold-300 underline decoration-gold-600 underline-offset-4 hover:text-gold-400">
          {t('home.countdown.competitionsLink')}
        </Link>
      )}
    </section>
  );
}

function hhmm(iso: string) {
  const p = istParts(iso);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

function Tiles({ target, now, lang }: { target: string; now: number; lang: Lang }) {
  const { t } = useTranslation();
  const r = remaining(target, now);
  const units = [
    ['days', r.days],
    ['hours', r.hours],
    ['minutes', r.minutes],
    ['seconds', r.seconds],
  ] as const;
  return (
    <>
      {/* Screen readers get a minute-level summary; the ticking tiles are hidden from them. */}
      <p className="sr-only">
        {t('home.countdown.remaining', { d: formatNumber(r.days, lang), h: formatNumber(r.hours, lang), m: formatNumber(r.minutes, lang) })}
      </p>
      <div className="cd-tiles mt-4" aria-hidden="true">
        {units.map(([unit, value]) => (
          <div key={unit} className="brass cd-tile">
            <div className="brass-face">
              <Rivets />
              <span className="cd-num" data-testid={`cd-${unit}`}>
                {formatNumber(value, lang, { pad: 2 })}
              </span>
              <span className="cd-unit">{t(`home.countdown.${unit}`)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 text-sm text-ivory-300">
        {t('home.countdown.starts', { date: formatDate(target, lang, { weekday: true }), time: formatTime(hhmm(target), lang) })}
      </p>
    </>
  );
}
