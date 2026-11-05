import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function EventDetails() {
  const { t } = useTranslation();
  useDocumentMeta('pages.event.title', 'pages.event.description');
  return (
    <>
      <PageHeader title={t('pages.event.title')} subtitle={t('pages.event.subtitle')} />
      <ComingSoon />
    </>
  );
}
