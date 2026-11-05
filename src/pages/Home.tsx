import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ComingSoon } from '../components/ui/ComingSoon';
import { LinkButton } from '../components/ui/Button';
import { FolkDivider } from '../components/ui/FolkDivider';

// Phase 3 replaces this with the full hero. Until then: wordmark + registration entry point.
export default function Home() {
  const { t } = useTranslation();
  useDocumentMeta('pages.home.title', 'pages.home.description');
  return (
    <section className="container-page flex flex-col items-center py-20 text-center">
      <p className="text-ivory-300">{t('brand.college')}</p>
      <h1 className="text-glow mt-4 text-gold-300 text-[clamp(2.25rem,9vw,4.5rem)]">{t('brand.wordmark')}</h1>
      <FolkDivider className="mx-auto my-6 max-w-xs" />
      <div className="flex flex-wrap justify-center gap-3">
        <LinkButton to="/competitions">{t('nav.competitions')}</LinkButton>
        <LinkButton to="/register" variant="ghost">
          {t('nav.register')}
        </LinkButton>
      </div>
      <ComingSoon />
    </section>
  );
}
