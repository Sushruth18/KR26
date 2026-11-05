import { useTranslation } from 'react-i18next';
import { getLogo } from '../../lib/logos';
import { BrandLogo } from '../ui/BrandLogo';

/**
 * §5.1 logo row: the college logo beside the college name, the Honnudi wordmark below it
 * (the club's name in text while its logo is not supplied). Above the fold — loaded eagerly.
 */
export function CollegeRow() {
  const { t } = useTranslation();
  const hasCollege = !!getLogo('college');
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5" data-testid="college-row">
      <p className={`mb-0 inline-flex items-center gap-2.5 sm:gap-3 ${hasCollege ? 'text-start' : ''}`}>
        <BrandLogo which="college" height={40} heightSm={48} />
        <span className="text-balance text-[0.8125rem] font-medium leading-snug text-ivory-50 sm:text-[0.95rem]">{t('brand.college')}</span>
      </p>
      {getLogo('club') ? (
        <BrandLogo which="club" height={28} heightSm={32} />
      ) : (
        <p className="mb-0 text-[0.8125rem] leading-snug text-gold-400 sm:text-[0.95rem]">{t('brand.club')}</p>
      )}
    </div>
  );
}
