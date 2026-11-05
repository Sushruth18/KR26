import { useTranslation } from 'react-i18next';
import type { Lang } from '../lib/format';

export function useLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'en' : 'kn';
}
