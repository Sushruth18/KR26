import { useTranslation } from 'react-i18next';
import { useWatch } from 'react-hook-form';
import { Pencil } from 'lucide-react';
import type { CompetitionEvent } from '../../lib/schemas';
import { normEmail, normId, normPhone, normText, type RegistrationValues } from '../../lib/validation';
import { OTHER_DEPARTMENT } from '../../lib/rules';
import { eventDisplay } from '../../lib/eventDisplay';
import { formatNumber } from '../../lib/format';
import { useLang } from '../../hooks/useLang';
import { CheckboxField } from '../ui/Field';
import { GeneralInstructions } from '../competitions/GeneralInstructions';
import type { StepId } from './steps';

type F = RegistrationValues;

interface Props {
  event: CompetitionEvent;
  onEdit: (step: StepId) => void;
}

export function StepReview({ event, onEdit }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const v = useWatch<F>() as F;
  const d = eventDisplay(event, lang, t);
  const student = event.category === 'students';
  const dept = v.department === OTHER_DEPARTMENT ? normText(v.departmentOther) : v.department;

  const sections: { step: StepId; title: string; rows: [string, string][] }[] = [
    { step: 'event', title: t('register.steps.event'), rows: [[t('register.chooseEvent'), `${d.name} · ${d.date} · ${d.time}`]] },
    {
      step: 'details',
      title: t('register.steps.details'),
      rows: [
        [t('register.name'), normText(v.name)],
        [student ? t('register.usn') : t('register.empId'), normId(v.id)],
        [t('register.department'), dept],
        ...(student ? ([[t('register.semester'), formatNumber(Number(v.semester), lang)]] as [string, string][]) : []),
        [t('register.phone'), normPhone(v.phone)],
        [t('register.email'), normEmail(v.email)],
      ],
    },
  ];
  if (event.teamSize.max > 1) {
    sections.push({
      step: 'team',
      title: t('register.steps.team'),
      rows: [
        [t('register.teamName'), normText(v.teamName)],
        ...v.members.map((m, i): [string, string] => [
          t('register.member', { n: formatNumber(i + 2, lang) }),
          `${normText(m.name)} · ${normId(m.id)} · ${normPhone(m.phone)}`,
        ]),
      ],
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-ivory-300">{t('register.reviewIntro')}</p>
      {sections.map((s) => (
        <section key={s.step} className="card p-4" aria-labelledby={`review-${s.step}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id={`review-${s.step}`} className="text-base text-gold-300">
              {s.title}
            </h3>
            <button type="button" className="btn btn-ghost !min-h-[44px] !px-3 text-sm" onClick={() => onEdit(s.step)}>
              <Pencil size={16} aria-hidden="true" />
              {t('register.edit')}
            </button>
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            {s.rows.map(([k, val]) => (
              <div key={k} className="contents">
                <dt className="text-ivory-300">{k}</dt>
                <dd className="m-0 break-words text-ivory-50">{val}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <div className="space-y-2">
        <GeneralInstructions />
        {event.eligibility && <CheckboxField<F> name="eligibilityConfirmed" label={t('register.eligibility')} />}
        <CheckboxField<F> name="consentRules" label={t('register.consentRules')} />
        <CheckboxField<F> name="consentPhoto" label={t('register.consentPhoto')} />
      </div>
    </div>
  );
}
