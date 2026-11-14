import { useTranslation } from 'react-i18next';
import type { EventState } from '../../lib/eventState';

const TONE: Record<EventState | 'few', string> = {
  open: 'border-success/60 bg-success/15 text-success',
  few: 'border-gold-400/70 bg-gold-400/15 text-gold-300',
  full: 'border-danger/60 bg-danger/10 text-danger',
  closed: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
  deadline: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
  completed: 'border-ivory-300/40 bg-ivory-300/10 text-ivory-300',
};

/** `few`: an open, capped event with only a handful of places left ("Few seats left"). */
export function StatusPill({ state, few = false }: { state: EventState; few?: boolean }) {
  const { t } = useTranslation();
  const key = state === 'open' && few ? 'few' : state;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-medium ${TONE[key]}`}
      data-testid="status-pill"
      data-state={key}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`state.${key}`)}
    </span>
  );
}
