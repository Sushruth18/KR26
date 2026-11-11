import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { TroupeSection } from '../components/team/TroupeSection';
import { buildTroupes } from '../lib/team';

export default function Team() {
  const { t } = useTranslation();
  useDocumentMeta('pages.team.title', 'pages.team.description');
  const troupes = useMemo(() => buildTroupes(), []);
  // Cards before each troupe, so the first few photos load eagerly and the rest lazily.
  const offsets = useMemo(() => troupes.map((_, i) => troupes.slice(0, i).reduce((n, g) => n + g.members.length, 0)), [troupes]);
  return (
    <>
      <PageHeader title={t('pages.team.title')} subtitle={t('pages.team.subtitle')} />
      <div className="container-page pb-16">
        {troupes.length === 0 ? (
          <p className="py-10 text-center text-ivory-300" data-testid="team-empty">
            {t('team.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-14">
            {troupes.map((troupe, i) => (
              <TroupeSection key={troupe.id} troupe={troupe} offset={offsets[i] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
