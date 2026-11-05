import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import { useLang } from '../../hooks/useLang';
import { events } from '../../lib/data';
import { formatPrize } from '../../lib/format';
import type { CompetitionEvent } from '../../lib/schemas';
import { EventIcon } from '../competitions/EventIcon';
import { LinkButton } from '../ui/Button';

/**
 * Every competition as a mini float, rolling past like the procession. Pauses on hover, focus and
 * touch, and has its own pause button (WCAG 2.2.2). Reduced motion: a static, swipeable row.
 */
export function ProcessionPreview() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [touching, setTouching] = useState(false);

  return (
    <section aria-labelledby="preview-title" className="cv-auto pt-10 [--cv-h:470px]">
      <div className="container-page flex flex-col items-center gap-2 text-center">
        <h2 id="preview-title" className="text-glow text-[clamp(1.75rem,6vw,2.5rem)] text-gold-300">
          {t('home.preview.title')}
        </h2>
        <p className="m-0 text-ivory-300">{t('home.preview.text')}</p>
      </div>

      {reduced ? (
        <div className="marquee-static mt-6">
          <List />
        </div>
      ) : (
        <div
          className="marquee mt-6"
          data-paused={paused || touching}
          onPointerDown={(e) => e.pointerType === 'touch' && setTouching(true)}
          onPointerUp={() => setTouching(false)}
          onPointerCancel={() => setTouching(false)}
        >
          <div className="marquee-track">
            <List />
            <List copy />
          </div>
        </div>
      )}

      <div className="container-page mt-4 flex flex-wrap items-center justify-center gap-3">
        <LinkButton to="/competitions" variant="ghost">
          {t('home.preview.all')}
        </LinkButton>
        {!reduced && (
          <button
            type="button"
            className="btn btn-ghost !px-3"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? t('home.preview.play') : t('home.preview.pause')}
            title={paused ? t('home.preview.play') : t('home.preview.pause')}
          >
            {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>
  );
}

/** One pass of the floats. The duplicate pass (for a seamless loop) is hidden from AT and the tab order. */
function List({ copy = false }: { copy?: boolean }) {
  return (
    <ul className="marquee-list" aria-hidden={copy || undefined}>
      {events.map((e) => (
        <li key={e.id} className="flex">
          <MiniFloat event={e} hidden={copy} />
        </li>
      ))}
    </ul>
  );
}

function MiniFloat({ event, hidden }: { event: CompetitionEvent; hidden: boolean }) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <Link to={`/competitions?for=${event.category}#${event.id}`} className="mini-float" tabIndex={hidden ? -1 : undefined}>
      <span className="mini-float-frame">
        <span className="tableau-medallion" aria-hidden="true">
          <EventIcon name={event.icon} size={22} strokeWidth={1.8} />
        </span>
        <span className="font-display text-lg leading-snug text-gold-300">{event.name[lang]}</span>
        <span className="mt-auto pt-2 text-sm text-ivory-300">
          {event.prizes.type === 'cash' ? t('home.preview.first', { amount: formatPrize(event.prizes.first, lang) }) : t('competitions.mementoBadge')}
        </span>
      </span>
      <span className="tableau-base" aria-hidden="true">
        <span className="tableau-wheel left-[16%]" />
        <span className="tableau-wheel right-[16%]" />
      </span>
    </Link>
  );
}
