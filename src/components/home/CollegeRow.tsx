import { useTranslation } from 'react-i18next';
import { site } from '../../lib/data';

/** College + club, with their logos once the files are in public/brand/ (site.json → logos). */
export function CollegeRow() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-0.5 text-center sm:flex-row sm:gap-3">
      <span className="inline-flex items-center gap-2.5">
        {site.logos.college && <Logo src={site.logos.college} alt={t('brand.college')} />}
        <span className="text-balance text-[0.8125rem] font-medium leading-snug text-ivory-50 sm:text-[0.95rem]">{t('brand.college')}</span>
      </span>
      <span className="hidden h-4 w-px bg-gold-600/60 sm:block" aria-hidden="true" />
      <span className="inline-flex items-center gap-2.5">
        {site.logos.club && <Logo src={site.logos.club} alt={t('brand.club')} />}
        <span className="text-[0.8125rem] leading-snug text-gold-400 sm:text-[0.95rem]">{t('brand.club')}</span>
      </span>
    </div>
  );
}

function Logo({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width={40} height={40} className="h-10 w-10 flex-none object-contain" decoding="async" />;
}
