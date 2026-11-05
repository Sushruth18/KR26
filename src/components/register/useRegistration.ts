/**
 * State machine for the registration form: steps, draft persistence, per-step validation and submit.
 * Kept out of the page component so each piece stays small and testable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type FieldPath, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { getEvent, site } from '../../lib/data';
import { register as apiRegister, type ApiError } from '../../lib/api';
import { emptyMember, emptyRegistration, registrationSchema, toPayload, type RegistrationValues } from '../../lib/validation';
import { savePass, type PassData } from '../../lib/passStore';
import { useLang } from '../../hooks/useLang';
import { clearDraft, loadDraft, saveDraft } from './useRegistrationDraft';
import { STEP_FIELDS, stepOfField, stepsFor, type StepId } from './steps';

type F = RegistrationValues;

const resolver: Resolver<F> = (values, ctx, opts) =>
  zodResolver(registrationSchema(getEvent(values.eventId), site))(values, ctx, opts) as ReturnType<Resolver<F>>;

/** Members array sized to the event: team size counts the registrant. */
function fitMembers(members: F['members'], eventId: string): F['members'] {
  const ev = getEvent(eventId);
  if (!ev || ev.teamSize.max === 1) return [];
  const min = ev.teamSize.min - 1;
  const max = ev.teamSize.max - 1;
  const out = members.slice(0, max);
  while (out.length < min) out.push(emptyMember());
  return out;
}

function initial(paramEvent: string | null) {
  const draft = loadDraft();
  const fromParam = paramEvent && getEvent(paramEvent) ? paramEvent : null;
  const values = draft?.values ?? emptyRegistration();
  if (fromParam && fromParam !== values.eventId) {
    values.eventId = fromParam;
    values.members = fitMembers(values.members, fromParam);
    return { values, step: 0, startedAt: draft?.startedAt ?? Date.now() };
  }
  return { values, step: draft?.step ?? 0, startedAt: draft?.startedAt ?? Date.now() };
}

export type SubmitState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; error: ApiError };

export function useRegistration(paramEvent: string | null) {
  const lang = useLang();
  const navigate = useNavigate();
  const [init] = useState(() => initial(paramEvent));
  const form = useForm<F>({ defaultValues: init.values, resolver, mode: 'onTouched', shouldFocusError: true });
  const [stepIndex, setStepIndex] = useState(init.step);
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });
  const busy = useRef(false);

  const eventId = useWatch({ control: form.control, name: 'eventId' });
  const event = getEvent(eventId);
  const steps = useMemo(() => stepsFor(event), [event]);
  const step: StepId = steps[Math.min(stepIndex, steps.length - 1)] ?? 'event';
  const index = steps.indexOf(step);

  // Persist on every change (sessionStorage; survives reloads, not tab close).
  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => saveDraft({ values: values as F, step: index, startedAt: init.startedAt }),
    });
    saveDraft({ values: form.getValues(), step: index, startedAt: init.startedAt });
    return unsubscribe;
  }, [form, index, init.startedAt]);

  const goTo = useCallback((s: StepId) => setStepIndex(Math.max(0, steps.indexOf(s))), [steps]);

  const next = useCallback(async () => {
    const ok = await form.trigger(STEP_FIELDS[step] as FieldPath<F>[], { shouldFocus: true });
    if (!ok) return;
    if (step === 'event') form.setValue('members', fitMembers(form.getValues('members'), form.getValues('eventId')));
    setSubmit({ kind: 'idle' });
    setStepIndex(index + 1);
  }, [form, step, index]);

  const back = useCallback(() => setStepIndex(Math.max(0, index - 1)), [index]);

  const doSubmit = useCallback(
    () =>
      form.handleSubmit(
        async (values) => {
          if (busy.current || !event) return;
          busy.current = true;
          setSubmit({ kind: 'submitting' });
          const res = await apiRegister(toPayload(values, event, Date.now() - init.startedAt, lang));
          busy.current = false;
          if (res.ok) {
            const pass: PassData = {
              regId: res.regId,
              eventId: event.id,
              name: res.name,
              members: event.teamSize.max > 1 ? values.members.map((m) => m.name.trim()) : [],
              teamName: event.teamSize.max > 1 ? values.teamName.trim() : '',
            };
            savePass(pass);
            clearDraft();
            navigate('/register/success', { state: { pass } });
            return;
          }
          setSubmit({ kind: 'error', error: res });
          if (res.code === 'VALIDATION' && res.field && !['form', 'body', 'action'].includes(res.field)) {
            const path = (res.field === 'members' ? 'members' : res.field) as FieldPath<F>;
            form.setError(path, { type: 'server', message: res.field === 'members' ? 'errors.teamSize' : 'errors.server' }, { shouldFocus: false });
            goTo(stepOfField(res.field));
          }
        },
        (errors) => {
          const first = Object.keys(errors)[0];
          if (first) goTo(stepOfField(first));
        },
      )(),
    [form, event, init.startedAt, lang, navigate, goTo],
  );

  return { form, event, steps, step, index, next, back, goTo, submit, doSubmit, isLast: index === steps.length - 1 };
}
