import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import { formatNumber } from '../../lib/format';
import { CATEGORIES, type Category } from './category';

const ICON = { students: GraduationCap, faculty: BookOpen } as const;

interface Props {
  value: Category;
  counts: Record<Category, number>;
  onChange: (c: Category) => void;
}

/** Students / Faculty segmented control. Toggle buttons (aria-pressed) — the grid below is filtered, not swapped. */
export function CategoryToggle({ value, counts, onChange }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const reduced = useReducedMotion();

  return (
    <div role="group" aria-label={t('competitions.forLabel')} className="segmented" data-testid="category-toggle">
      {CATEGORIES.map((c) => {
        const active = c === value;
        const Icon = ICON[c];
        return (
          <button
            key={c}
            type="button"
            className="segmented-btn"
            aria-pressed={active}
            onClick={() => onChange(c)}
            data-testid={`toggle-${c}`}
          >
            {active && (
              <motion.span
                layoutId="segmented-indicator"
                className="segmented-indicator"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                aria-hidden="true"
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              <Icon size={18} aria-hidden="true" className="max-[359px]:hidden" />
              {t(`competitions.${c}`)}
              <span className="segmented-count">{formatNumber(counts[c], lang)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
