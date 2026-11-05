import { useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { PassCard } from '../components/pass/PassCard';
import { PassActions } from '../components/pass/PassActions';
import { LookupForm } from '../components/pass/LookupForm';
import { isPassData, loadPass, savePass, type PassData } from '../lib/passStore';

function PassBlock({ pass }: { pass: PassData }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <PassCard ref={ref} pass={pass} />
      <PassActions pass={pass} cardRef={ref} />
    </div>
  );
}

export default function RegisterSuccess() {
  const { t } = useTranslation();
  useDocumentMeta('pages.pass.title', 'pages.pass.description');
  const location = useLocation();
  const [params] = useSearchParams();
  const fromState = (location.state as { pass?: unknown } | null)?.pass;
  const forceLookup = params.get('lookup') === '1';
  const justRegistered = isPassData(fromState);

  // Router state → last pass in sessionStorage → lookup by ID + phone.
  const [passes, setPasses] = useState<PassData[]>(() => {
    if (isPassData(fromState)) return [fromState];
    if (forceLookup) return [];
    const stored = loadPass();
    return stored ? [stored] : [];
  });

  const onFound = (found: PassData[]) => {
    if (found[0]) savePass(found[0]);
    setPasses(found);
  };

  return (
    <>
      <PageHeader title={t('pages.pass.title')} />
      <div className="container-page">
        {justRegistered && (
          <div className="mx-auto mb-6 max-w-md text-center" role="status">
            <p className="flex items-center justify-center gap-2 text-lg text-success">
              <CheckCircle2 size={22} aria-hidden="true" />
              {t('pass.success')}
            </p>
            <p className="mt-1 text-sm text-ivory-300">{t('pass.emailNote')}</p>
          </div>
        )}
        {passes.length === 0 ? (
          <LookupForm onFound={onFound} />
        ) : (
          <div className="grid gap-12 lg:grid-cols-2">
            {passes.map((p) => (
              <PassBlock key={p.regId} pass={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
