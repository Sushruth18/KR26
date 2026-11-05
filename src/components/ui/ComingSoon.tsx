import { useTranslation } from 'react-i18next';

/** Temporary body for routes whose phase hasn't shipped yet (removed as each page is built). */
export function ComingSoon() {
  const { t } = useTranslation();
  return (
    <p className="container-page py-16 text-center text-ivory-300" role="status">
      {t('common.comingSoon')}
    </p>
  );
}
