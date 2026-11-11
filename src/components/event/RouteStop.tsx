import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Music2 } from 'lucide-react';
import { AmbariElephant } from '../art/AmbariElephant';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import type { StopState } from '../../lib/schedule';

/**
 * One S-curve of the winding road, stretched to the height of its stop. Every segment starts and ends on the
 * centre line with the same tangent, so consecutive stops join into one road.
 */
function Road() {
  const d = 'M28 0C2 33 54 67 28 100';
  return (
    <span className="route-road" aria-hidden="true">
      <svg viewBox="0 0 56 100" preserveAspectRatio="none" focusable="false">
        <path d={d} fill="none" stroke="#C98A1B" strokeWidth="24" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="#4A0E18" strokeWidth="20" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="#FFD27A" strokeWidth="2" strokeDasharray="7 9" opacity="0.85" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

interface Props {
  state: StopState;
  /** Formatted start time; omitted for stops whose time is still to be announced. */
  time?: string;
  /** "HH:MM" for the <time> element. */
  dateTime?: string;
  highlight?: boolean;
  headline?: boolean;
  testId: string;
  children: ReactNode;
}

/** A stop on the procession route: road segment, node (the Ambari marker when current), and the card. */
export function RouteStop({ state, time, dateTime, highlight, headline, testId, children }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <li
      className="route-stop"
      data-state={state}
      data-highlight={highlight || undefined}
      data-testid={testId}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <Road />
      <span className="route-node" aria-hidden="true">
        {state === 'current' && <AmbariElephant walking={!reduced} />}
      </span>
      <div className="route-card">
        <div className="route-meta flex flex-wrap items-center gap-x-3 gap-y-1">
          {time && (
            <time className="route-time" dateTime={dateTime}>
              {time}
            </time>
          )}
          {state === 'current' && (
            <span className="route-pill" data-kind="now" data-testid="pill-now">
              {t('eventPage.timeline.now')}
            </span>
          )}
          {state === 'next' && (
            <span className="route-pill" data-kind="next" data-testid="pill-next">
              {t('eventPage.timeline.next')}
            </span>
          )}
          {headline && (
            <span className="route-pill" data-kind="headline">
              <Music2 size={14} aria-hidden="true" />
              {t('eventPage.timeline.headline')}
            </span>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}
