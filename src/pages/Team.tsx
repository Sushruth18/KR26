import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function Team() {
  const { t } = useTranslation();
  useDocumentMeta('pages.team.title', 'pages.team.description');
  return (
    <>
      <PageHeader title={t('pages.team.title')} subtitle={t('pages.team.subtitle')} />
      <ComingSoon />
    </>
  );
}
