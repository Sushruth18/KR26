import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { setLanguage } from '../../i18n';
import { useLang } from '../../hooks/useLang';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const next = lang === 'kn' ? 'en' : 'kn';
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      className={`btn btn-ghost !px-3 ${className}`}
      // aria-label is in the *target* language so screen readers pronounce it correctly
      aria-label={t('common.langSwitch')}
      lang={next}
    >
      <Languages size={18} aria-hidden="true" />
      <span>{t('common.langShort')}</span>
    </button>
  );
}
