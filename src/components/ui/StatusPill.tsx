import { useTranslation } from 'react-i18next';
import type { EventState } from '../../lib/eventState';

const TONE: Record<EventState, string> = {
  open: 'border-success/60 bg-success/15 text-success',
  few: 'border-saffron-500/70 bg-saffron-500/15 text-saffron-500',
  full: 'border-danger/60 bg-danger/10 text-danger',
  closed: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
  deadline: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
  opensSoon: 'border-gold-400/60 bg-gold-400/10 text-gold-300',
  completed: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
};

export function StatusPill({ state }: { state: EventState }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-medium ${TONE[state]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`state.${state}`)}
    </span>
  );
}
