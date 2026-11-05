import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ScrollText } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import { isTodo } from '../../lib/format';

interface Props {
  eventId: string;
  rules: string[];
}

/** Accessible disclosure (button + aria-expanded) with an animated height. TODO rules → "announced soon". */
export function RulesDisclosure({ eventId, rules }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelId = `rules-${eventId}`;
  const known = rules.filter((r) => !isTodo(r));

  return (
    <div className="disclosure">
      <button
        type="button"
        className="disclosure-btn"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        data-testid={`rules-toggle-${eventId}`}
      >
        <span className="inline-flex items-center gap-2">
          <ScrollText size={18} aria-hidden="true" />
          {t('competitions.rules')}
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 text-sm text-ivory-50" data-testid={`rules-${eventId}`}>
              {known.length ? (
                <ol className="list-decimal space-y-1.5 ps-5 marker:text-gold-400">
                  {known.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-ivory-300">{t('competitions.rulesTba')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
