import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FormProvider } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useResolvedEvents } from '../hooks/useResolvedEvents';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StepIndicator } from '../components/register/StepIndicator';
import { StepEvent } from '../components/register/StepEvent';
import { StepDetails } from '../components/register/StepDetails';
import { StepTeam } from '../components/register/StepTeam';
import { StepReview } from '../components/register/StepReview';
import { SubmitAlert } from '../components/register/SubmitAlert';
import { useRegistration } from '../components/register/useRegistration';
import { ENDPOINT } from '../lib/api';

export default function Register() {
  const { t } = useTranslation();
  useDocumentMeta('pages.register.title', 'pages.register.description');
  const [params] = useSearchParams();
  const status = useResolvedEvents();
  const r = useRegistration(params.get('event'));
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const { resolved } = status;

  // Move focus to the step heading when the step changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [r.step]);

  const submitting = r.submit.kind === 'submitting';
  const blocked = r.step === 'event' && (!r.event || (!status.loading && resolved[r.event.id]?.canRegister === false));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (r.isLast) void r.doSubmit();
    else if (!blocked) void r.next();
  };

  if (!ENDPOINT) {
    return (
      <>
        <PageHeader title={t('pages.register.title')} subtitle={t('pages.register.subtitle')} />
        <p className="container-page text-center text-ivory-300" role="status">
          {t('register.notConfigured')}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('pages.register.title')} subtitle={t('pages.register.subtitle')} />
      <div className="container-page max-w-3xl">
        <StepIndicator steps={r.steps} current={r.index} />
        <FormProvider {...r.form}>
          <form noValidate onSubmit={onSubmit} className="mt-6 space-y-6" data-testid="register-form" data-step={r.step}>
            <h2 ref={heading} tabIndex={-1} className="text-2xl text-gold-300 outline-none">
              {t(`register.steps.${r.step}`)}
            </h2>

            {r.step === 'event' && <StepEvent resolved={resolved} loading={status.loading} failed={status.failed} />}
            {r.step === 'details' && r.event && <StepDetails event={r.event} />}
            {r.step === 'team' && r.event && <StepTeam event={r.event} />}
            {r.step === 'review' && r.event && <StepReview event={r.event} onEdit={r.goTo} />}

            {/* Honeypot — invisible to people, tempting to bots. */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="f-website">{t('register.honeypot')}</label>
              <input id="f-website" type="text" tabIndex={-1} autoComplete="off" {...r.form.register('website')} />
            </div>

            <div aria-live="polite" className="min-h-[1px]">
              {submitting && <p className="text-gold-300">{t('register.submitting')}</p>}
              {r.submit.kind === 'error' && <SubmitAlert error={r.submit.error} onRetry={() => void r.doSubmit()} retrying={false} />}
            </div>

            <div className="flex flex-wrap-reverse items-center justify-between gap-3 border-t border-gold-600/30 pt-5">
              {r.index > 0 ? (
                <Button variant="ghost" onClick={r.back} disabled={submitting} data-testid="back">
                  <ArrowLeft size={18} aria-hidden="true" />
                  {t('register.back')}
                </Button>
              ) : (
                <span />
              )}
              {r.isLast ? (
                <Button type="submit" variant="primary" loading={submitting} data-testid="submit">
                  {!submitting && <Send size={18} aria-hidden="true" />}
                  {submitting ? t('register.submitting') : t('register.submit')}
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={blocked} data-testid="next">
                  {t('register.next')}
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </>
  );
}
