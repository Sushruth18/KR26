import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { LinkButton } from '../components/ui/Button';
import { FolkDivider } from '../components/ui/FolkDivider';

export default function NotFound() {
  const { t } = useTranslation();
  useDocumentMeta('pages.notFound.title', 'pages.notFound.description', { noindex: true });
  return (
    <section className="container-page flex flex-col items-center py-20 text-center">
      <p className="font-display text-7xl text-gold-600" aria-hidden="true">
        404
      </p>
      <h1 className="text-glow mt-4 text-gold-300 text-[clamp(1.75rem,6vw,3rem)]">{t('pages.notFound.title')}</h1>
      <p className="mt-3 max-w-md text-ivory-300">{t('pages.notFound.text')}</p>
      <FolkDivider className="mx-auto my-6 max-w-xs" />
      <LinkButton to="/">{t('common.backHome')}</LinkButton>
    </section>
  );
}
