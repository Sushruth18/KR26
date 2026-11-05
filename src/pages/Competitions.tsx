import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function Competitions() {
  const { t } = useTranslation();
  useDocumentMeta('pages.competitions.title', 'pages.competitions.description');
  return (
    <>
      <PageHeader title={t('pages.competitions.title')} subtitle={t('pages.competitions.subtitle')} />
      <ComingSoon />
    </>
  );
}
