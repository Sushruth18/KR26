import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useMotionPrefs';

interface Props {
  /** id of the panel (aria-controls). Must be unique on the page. */
  panelId: string;
  label: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  /** data-testid of the button; the panel gets `panelTestId`. */
  testId?: string;
  panelTestId?: string;
  className?: string;
}

/** Accessible disclosure (button + aria-expanded) with an animated height; closed by default. */
export function Disclosure({ panelId, label, icon, children, testId, panelTestId, className = '' }: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <div className={`disclosure ${className}`}>
      <button
        type="button"
        className="disclosure-btn"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`flex-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
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
            <div className="px-3 pb-3 pt-1 text-sm text-ivory-50" data-testid={panelTestId}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Numbered rule list used inside disclosures. */
export function RuleList({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 ps-5 marker:text-gold-400">
      {items.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ol>
  );
}
