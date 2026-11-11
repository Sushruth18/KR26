import { useTranslation } from 'react-i18next';
import { get, useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { CompetitionEvent } from '../../lib/schemas';
import { emptyMember, type RegistrationValues } from '../../lib/validation';
import { eventDisplay } from '../../lib/eventDisplay';
import { formatNumber } from '../../lib/format';
import { useLang } from '../../hooks/useLang';
import { TextField } from '../ui/Field';
import { Button } from '../ui/Button';

type F = RegistrationValues;

export function StepTeam({ event }: { event: CompetitionEvent }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { control, formState } = useFormContext<F>();
  const { fields, append, remove } = useFieldArray<F, 'members'>({ control, name: 'members' });
  const range = eventDisplay(event, lang, t).teamRange;
  const student = event.category === 'students';
  const minRows = event.teamSize.min - 1; // team size counts the registrant
  const maxRows = event.teamSize.max - 1;
  // min = max (Treasure Hunt 4, Rangoli 5): the rows are all there from the start, so no add/remove buttons.
  const exact = minRows === maxRows;
  const n = (x: number) => formatNumber(x, lang);
  // Array-level error (team size) lives at errors.members.message or errors.members.root.message.
  const membersErr = get(formState.errors, 'members') as { message?: string; root?: { message?: string } } | undefined;
  const rawTeamError = membersErr?.message ?? membersErr?.root?.message;
  const teamError = exact && rawTeamError === 'errors.teamSize' ? 'errors.teamSizeExact' : rawTeamError;

  return (
    <div className="space-y-5">
      <p className="text-ivory-300" data-testid="team-intro">
        {exact
          ? t('register.teamIntroExact', { n: n(event.teamSize.max), others: n(maxRows) })
          : t('register.teamIntro', { range })}
      </p>
      <TextField<F> name="teamName" label={t('register.teamName')} />

      <ol className="space-y-4">
        {fields.map((f, i) => (
          <li key={f.id} className="card p-4" data-testid={`member-${i}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base text-gold-300">{t('register.member', { n: formatNumber(i + 2, lang) })}</h3>
              {fields.length > minRows && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="btn btn-ghost !min-h-[44px] !px-3"
                  aria-label={t('register.removeMember', { n: formatNumber(i + 2, lang) })}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField<F> name={`members.${i}.name`} label={t('register.memberName')} autoComplete="off" />
              <TextField<F>
                name={`members.${i}.id`}
                label={student ? t('register.memberUsn') : t('register.memberEmpId')}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                lang="en"
              />
              <TextField<F> name={`members.${i}.phone`} label={t('register.memberPhone')} type="tel" inputMode="tel" lang="en" />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ivory-300" aria-live="polite" data-testid="team-count">
          {exact
            ? t('register.teamCountExact', { n: n(fields.length + 1), max: n(event.teamSize.max) })
            : t('register.teamCount', { n: n(fields.length + 1), min: n(event.teamSize.min), max: n(event.teamSize.max) })}
        </p>
        {!exact && (
          <Button variant="ghost" onClick={() => append(emptyMember())} disabled={fields.length >= maxRows} data-testid="add-member">
            <Plus size={18} aria-hidden="true" />
            {t('register.addMember')}
          </Button>
        )}
      </div>
      {teamError && (
        <p className="field-error" role="alert">
          {t(teamError, { range, n: n(event.teamSize.max) })}
        </p>
      )}
    </div>
  );
}
