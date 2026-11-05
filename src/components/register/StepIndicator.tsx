import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { formatNumber } from '../../lib/format';
import type { StepId } from './steps';

export function StepIndicator({ steps, current }: { steps: StepId[]; current: number }) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <nav aria-label={t('register.stepOf', { n: formatNumber(current + 1, lang), total: formatNumber(steps.length, lang) })}>
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-sm font-semibold ${
                  active
                    ? 'border-gold-300 bg-gold-400 text-night-950'
                    : done
                      ? 'border-gold-600 bg-gold-600/30 text-gold-300'
                      : 'border-ivory-300/40 text-ivory-300'
                }`}
              >
                {done ? <Check size={16} aria-hidden="true" /> : formatNumber(i + 1, lang)}
              </span>
              <span className={`hidden text-sm sm:inline ${active ? 'text-gold-300' : 'text-ivory-300'}`}>
                {t(`register.steps.${s}`)}
              </span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-gold-600/40" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-ivory-300 sm:hidden">
        {t('register.stepOf', { n: formatNumber(current + 1, lang), total: formatNumber(steps.length, lang) })} ·{' '}
        <span className="text-gold-300">{t(`register.steps.${steps[current] ?? 'event'}`)}</span>
      </p>
    </nav>
  );
}
