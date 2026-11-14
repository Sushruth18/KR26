import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getEvent, site } from '../../lib/data';
import { eventTime } from '../../lib/eventDisplay';
import { formatDate, formatNumber, isTodo } from '../../lib/format';
import type { PassData } from '../../lib/passStore';
import { useLang } from '../../hooks/useLang';
import { BrandLogo } from '../ui/BrandLogo';
import { AmbariMotif } from './AmbariMotif';

/** Width (CSS px) of the exported pass — the PNG is always this wide × 2, whatever the screen is. */
export const PASS_EXPORT_WIDTH = 380;

/**
 * The procession pass. Uses only solid colours, inline SVG and same-origin logo images (no
 * backdrop-filter, no srcset — html-to-image embeds each <img> `src`) so the PNG matches the screen.
 *
 * Two renderings of the same card:
 *  - screen (default): fluid — fills the available width up to 380 px and never wider than its container;
 *  - `fixed`: exactly 380 px, no auto margins, no viewport units. It lives off-screen (see PassBlock) and is the
 *    node that gets exported, so the PNG never depends on the phone it was made on.
 */
export const PassCard = forwardRef<HTMLDivElement, { pass: PassData; fixed?: boolean }>(function PassCard({ pass, fixed = false }, ref) {
  const { t } = useTranslation();
  const lang = useLang();
  const event = getEvent(pass.eventId);
  const tba = t('pass.tba');
  const time = (event && eventTime(event, lang)) ?? tba;
  const venue = event && !isTodo(event.venue[lang]) ? event.venue[lang] : tba;
  const day1 = t('pass.day', { n: formatNumber(1, lang), date: formatDate(site.day1Date, lang) });
  const names = [pass.name, ...pass.members.filter(Boolean)];
  const sfx = fixed ? '-export' : ''; // the export copy must not duplicate the on-screen test ids

  return (
    <div
      ref={ref}
      data-testid={`pass-card${sfx}`}
      className={`relative overflow-hidden rounded-[28px] border-2 border-gold-400 bg-night-900 p-6 text-center ${
        fixed ? 'w-[380px]' : 'mx-auto w-full min-w-0 max-w-[380px]'
      }`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(139,30,45,.55), transparent 65%)' }}
    >
      <div className="pointer-events-none absolute inset-2 rounded-[22px] border border-gold-600/60" aria-hidden="true" />
      <p className="tracking-latin font-display text-sm text-gold-300">{t('pass.brand')} · {formatNumber(2026, lang)}</p>
      <AmbariMotif className="mx-auto my-3 h-24 w-28" />
      <p className="tracking-latin text-xs text-ivory-300">{t('pass.label')}</p>
      <h2 className="mt-1 text-2xl text-gold-300">{event ? event.name[lang] : pass.eventId}</h2>

      <div className="mt-4 space-y-1">
        <p className="text-xs text-ivory-300">{pass.members.length ? t('pass.team') : t('pass.participant')}</p>
        {pass.teamName && <p className="font-semibold text-ivory-50">{pass.teamName}</p>}
        <p className="text-ivory-50">{names.join(', ')}</p>
      </div>

      <div className="mx-auto mt-4 rounded-xl border border-gold-600 bg-night-950 px-4 py-3">
        <p className="text-xs text-ivory-300">{t('pass.regId')}</p>
        {/* One line. On screen the size follows the screen (so it also fits 130 % text on a 320 px phone); the export is fixed. */}
        <p
          className={`font-mono font-semibold tracking-wider text-gold-300 [overflow-wrap:anywhere] ${
            fixed ? 'whitespace-nowrap text-2xl' : 'text-[clamp(1rem,5.4vw,1.5rem)]'
          }`}
          lang="en"
          data-testid={`pass-reg-id${sfx}`}
        >
          {pass.regId}
        </p>
      </div>

      <p className="mt-4 font-semibold text-ivory-50">{day1}</p>
      <p className="text-sm text-ivory-300">
        {time} · {venue}
      </p>
      <p className="mt-3 text-sm font-medium text-gold-300">{t('pass.showAtVenue')}</p>
      <p className="mt-3 border-t border-gold-600/50 pt-3 text-sm text-ivory-300">
        {t('pass.day2Invite', { date: formatDate(site.day2Date, lang) })}
      </p>
      <div className="mt-3 flex items-center justify-center gap-4" data-testid={`pass-logos${sfx}`}>
        <BrandLogo which="college" height={48} plate single />
        <BrandLogo which="club" height={26} single />
      </div>
      <p className="mt-2 text-[11px] text-ivory-300/80">{t('brand.club')} · {t('brand.college')}</p>
    </div>
  );
});
