import { useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useResolvedEvents } from '../hooks/useResolvedEvents';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { CategoryToggle } from '../components/competitions/CategoryToggle';
import { CATEGORIES, parseCategory, type Category } from '../components/competitions/category';
import { TableauCard } from '../components/competitions/TableauCard';
import { events } from '../lib/data';
import { useReducedMotion } from '../hooks/useMotionPrefs';

export default function Competitions() {
  const { t } = useTranslation();
  useDocumentMeta('pages.competitions.title', 'pages.competitions.description');
  const [params, setParams] = useSearchParams();
  const category = parseCategory(params.get('for'));
  const { resolved, loading, failed, refresh } = useResolvedEvents();
  const { hash } = useLocation();
  const reduced = useReducedMotion();

  // /competitions?for=…#<event-id> (from the Home preview strip) lands on that card.
  useEffect(() => {
    const el = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    el?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }, [hash, reduced]);

  const counts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, events.filter((e) => e.category === c).length])) as Record<Category, number>,
    [],
  );
  const list = useMemo(() => events.filter((e) => e.category === category), [category]);

  const setCategory = (c: Category) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('for', c);
        return next;
      },
      { replace: true },
    );

  return (
    <>
      <PageHeader title={t('pages.competitions.title')} subtitle={t('pages.competitions.subtitle')} />
      <div className="container-page pb-16">
        <div className="flex flex-col items-center gap-3">
          <CategoryToggle value={category} counts={counts} onChange={setCategory} />
          <div aria-live="polite" className="flex min-h-[44px] flex-wrap items-center justify-center gap-x-3 text-center text-sm text-ivory-300">
            {loading && (
              <span className="inline-flex items-center gap-2" role="status">
                <span className="spinner" aria-hidden="true" />
                {t('competitions.checking')}
              </span>
            )}
            {!loading && failed && (
              <>
                <span data-testid="live-unavailable">{t('state.liveUnavailable')}</span>
                <Button variant="ghost" className="!px-3 !py-1 text-sm" onClick={refresh}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {t('competitions.liveRetry')}
                </Button>
              </>
            )}
          </div>
        </div>

        <h2 className="sr-only">{t(`competitions.${category}`)}</h2>
        <ul className="m-0 mt-6 grid list-none gap-x-6 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-3" data-testid="competition-grid">
          {list.map((e, i) => (
            <li key={e.id} id={e.id} className="flex">
              <TableauCard event={e} resolved={resolved[e.id]!} loading={loading} index={i} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
