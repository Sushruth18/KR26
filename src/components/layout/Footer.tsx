import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Torch } from '../ui/Torch';
import { FolkDivider } from '../ui/FolkDivider';
import { BrandLogo } from '../ui/BrandLogo';
import { site } from '../../lib/data';
import { getLogo } from '../../lib/logos';
import { formatNumber } from '../../lib/format';
import { useLang } from '../../hooks/useLang';

// lucide-react no longer ships brand icons, so Instagram is an inline SVG.
function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Rendered ONLY by <Layout/> — never import this anywhere else (CLAUDE.md §10 bug 1). */
export function Footer() {
  const { t } = useTranslation();
  const lang = useLang();
  const year = formatNumber(2026, lang);

  return (
    <footer className="cv-auto mt-16 border-t border-gold-600/30 bg-night-900/80 [--cv-h:463px] sm:[--cv-h:279px]">
      <FolkDivider className="text-gold-600" />
      <div className="container-page flex items-end justify-between gap-4 py-8">
        <Torch className="hidden sm:block" />
        <div className="flex flex-1 flex-col items-center gap-3 text-center">
          {(getLogo('college') || getLogo('club')) && (
            <div className="mb-1 flex items-center justify-center gap-5">
              <BrandLogo which="college" height={72} plate lazy />
              {getLogo('college') && getLogo('club') && <span className="h-10 w-px bg-gold-600/50" aria-hidden="true" />}
              <BrandLogo which="club" height={40} lazy />
            </div>
          )}
          <p className="font-display text-lg text-gold-300">{t('brand.college')}</p>
          <p className="text-sm text-ivory-300">{t('brand.club')}</p>
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {site.instagramUrl && (
              <li>
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  aria-label={t('footer.instagram')}
                >
                  <InstagramIcon />
                </a>
              </li>
            )}
            {site.contactEmail && (
              <li>
                <a href={`mailto:${site.contactEmail}`} className="btn btn-ghost" aria-label={t('footer.contact')}>
                  <Mail size={20} aria-hidden="true" />
                </a>
              </li>
            )}
          </ul>
          <p className="text-sm text-ivory-300">{t('footer.copyright', { year })}</p>
          {site.madeBy && <p className="text-xs text-ivory-300">{t('footer.madeBy', { name: site.madeBy })}</p>}
        </div>
        <Torch className="hidden sm:block" />
      </div>
      <div className="flex justify-center gap-24 pb-4 sm:hidden" aria-hidden="true">
        <Torch className="scale-75" />
        <Torch className="scale-75" />
      </div>
    </footer>
  );
}
