import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function Gallery() {
  const { t } = useTranslation();
  useDocumentMeta('pages.gallery.title', 'pages.gallery.description');
  return (
    <>
      <PageHeader title={t('pages.gallery.title')} subtitle={t('pages.gallery.subtitle')} />
      <ComingSoon />
    </>
  );
}
