import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { ComingSoon } from '../components/ui/ComingSoon';

// Phase 2 (priority) builds the multi-step form + backend integration here.
export default function Register() {
  const { t } = useTranslation();
  useDocumentMeta('pages.register.title', 'pages.register.description');
  return (
    <>
      <PageHeader title={t('pages.register.title')} subtitle={t('pages.register.subtitle')} />
      <ComingSoon />
    </>
  );
}
