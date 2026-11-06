import { useTranslation } from 'react-i18next';
import { useWatch } from 'react-hook-form';
import { events, getEvent } from '../../lib/data';
import type { ResolvedEvent } from '../../lib/eventState';
import type { RegistrationValues } from '../../lib/validation';
import { useLang } from '../../hooks/useLang';
import { SelectField } from '../ui/Field';
import { EventSummary } from './EventSummary';

interface Props {
  resolved: Record<string, ResolvedEvent>;
  loading: boolean;
  failed: boolean;
}

export function StepEvent({ resolved, loading, failed }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const eventId = useWatch<RegistrationValues, 'eventId'>({ name: 'eventId' });
  const event = getEvent(eventId);
  const r = event ? resolved[event.id] ?? null : null;

  const option = (id: string, name: string) => {
    const s = resolved[id];
    const suffix = s && !s.canRegister ? ` — ${t(`state.${s.state}`)}` : '';
    return (
      <option key={id} value={id}>
        {name}
        {suffix}
      </option>
    );
  };

  return (
    <div className="space-y-2">
      <SelectField<RegistrationValues> name="eventId" label={t('register.chooseEvent')}>
        <option value="">{t('register.eventPlaceholder')}</option>
        <optgroup label={t('register.groupStudents')}>
          {events.filter((e) => e.category === 'students').map((e) => option(e.id, e.name[lang]))}
        </optgroup>
        <optgroup label={t('register.groupFaculty')}>
          {events.filter((e) => e.category === 'faculty').map((e) => option(e.id, e.name[lang]))}
        </optgroup>
      </SelectField>

      {event && <EventSummary event={event} resolved={r} loading={loading} />}

      {failed && !loading && (
        <p className="text-sm text-ivory-300" role="note">
          {t('state.liveUnavailable')}
        </p>
      )}
      {r && !r.canRegister && !loading && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm" role="alert" data-testid="cannot-register">
          {t('register.cannotRegister', { reason: t(`state.${r.state}`) })}
        </p>
      )}
    </div>
  );
}
