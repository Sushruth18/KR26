import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

export default function RegisterSuccess() {
  const { t } = useTranslation();
  useDocumentMeta('pages.pass.title', 'pages.pass.description');
  return (
    <>
      <PageHeader title={t('pages.pass.title')} />
      <ComingSoon />
    </>
  );
}
