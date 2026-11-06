import { useTranslation } from 'react-i18next';
import { getLogo } from '../../lib/logos';
import { BrandLogo } from '../ui/BrandLogo';

/**
 * §5.1 logo row: [college seal on its plate] [college name] [25-years logo], all on one centred line,
 * with the Honnudi wordmark below (the club's name in text while its logo is not supplied).
 * Above the fold — loaded eagerly. The name wraps to two lines on phones; the logos keep the row's
 * height (46 px, 50 px from 640 px) so the hero scene stays inside the first screen.
 * The 25-years logo has its own light face and gold ring, so it sits on the night sky without a plate.
 */
export function CollegeRow() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5" data-testid="college-row">
      <div className="flex max-w-full items-center justify-center gap-2 sm:gap-3" data-testid="college-row-main">
        <BrandLogo which="college" height={46} heightSm={50} plate />
        <p className="mb-0 min-w-0 max-w-[10.5rem] text-balance text-center text-[0.75rem] font-medium leading-snug text-ivory-50 min-[360px]:text-[0.8125rem] sm:max-w-none sm:text-[0.95rem]">
          {t('brand.college')}
        </p>
        <BrandLogo which="jubilee" height={46} heightSm={50} />
      </div>
      {getLogo('club') ? (
        <BrandLogo which="club" height={28} heightSm={32} />
      ) : (
        <p className="mb-0 text-[0.8125rem] leading-snug text-gold-400 sm:text-[0.95rem]">{t('brand.club')}</p>
      )}
    </div>
  );
}
