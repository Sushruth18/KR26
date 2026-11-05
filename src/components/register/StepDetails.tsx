import { useTranslation } from 'react-i18next';
import { useWatch } from 'react-hook-form';
import { site } from '../../lib/data';
import { formatNumber } from '../../lib/format';
import { OTHER_DEPARTMENT } from '../../lib/rules';
import type { CompetitionEvent } from '../../lib/schemas';
import { semestersFor, type RegistrationValues } from '../../lib/validation';
import { useLang } from '../../hooks/useLang';
import { SelectField, TextField } from '../ui/Field';

type F = RegistrationValues;

export function StepDetails({ event }: { event: CompetitionEvent }) {
  const { t } = useTranslation();
  const lang = useLang();
  const department = useWatch<F, 'department'>({ name: 'department' });
  const student = event.category === 'students';

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="field-label">{t('register.category')}</p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gold-600 bg-gold-600/20 px-3 py-1 text-gold-300" data-testid="category">
            {student ? t('register.categoryStudents') : t('register.categoryFaculty')}
          </span>
          <span className="text-sm text-ivory-300">{t('register.categoryLocked')}</span>
        </p>
      </div>

      <TextField<F> name="name" label={t('register.name')} autoComplete="name" className="sm:col-span-2" />
      <TextField<F>
        name="id"
        label={student ? t('register.usn') : t('register.empId')}
        hint={student ? t('register.usnHint') : undefined}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        lang="en"
      />
      <SelectField<F> name="department" label={t('register.department')}>
        <option value="">{t('register.departmentPlaceholder')}</option>
        {site.departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value={OTHER_DEPARTMENT}>{t('register.departmentOtherOption')}</option>
      </SelectField>
      {department === OTHER_DEPARTMENT && <TextField<F> name="departmentOther" label={t('register.departmentOther')} />}
      {student && (
        <SelectField<F> name="semester" label={t('register.semester')}>
          <option value="">{t('register.semesterPlaceholder')}</option>
          {semestersFor(site, department).map((s) => (
            <option key={s} value={String(s)}>
              {formatNumber(s, lang)}
            </option>
          ))}
        </SelectField>
      )}
      <TextField<F>
        name="phone"
        label={t('register.phone')}
        hint={t('register.phoneHint')}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        lang="en"
      />
      <TextField<F>
        name="email"
        label={t('register.email')}
        hint={t('register.emailHint')}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        lang="en"
      />
    </div>
  );
}
