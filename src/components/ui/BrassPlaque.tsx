import type { CSSProperties, ReactNode } from 'react';
import { fitCqi, noBreak } from '../../lib/textFit';

interface Props {
  /** Engraved emblem above the value (a lucide icon). */
  icon?: ReactNode;
  /**
   * The big value. It wraps only at a normal space or a zero-width space (U+200B) — use a no-break
   * space everywhere else — and is sized from the card's width so its longest piece always fits.
   */
  value: string;
  /** Smaller text beside the value (or below it when there is no room), e.g. a month or "+ mementos". Never wraps. */
  unit?: string;
  caption?: ReactNode;
  className?: string;
}

const fit = (s: string) => ({ '--fit': fitCqi(s) }) as CSSProperties;

/**
 * Stat card: dark face in a brushed-brass frame with four rivets. Rows: icon · value (centred in the
 * free space) · caption (two lines reserved), so cards of equal height line up across a row.
 */
export function BrassPlaque({ icon, value, unit, caption, className = '' }: Props) {
  return (
    <div className={`brass plaque ${className}`} data-testid="plaque">
      <div className="brass-face plaque-face">
        <Rivets />
        <span className="plaque-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="plaque-body">
          <p className="plaque-line" data-testid="plaque-line">
            <span className="brass-value plaque-value" style={fit(value)}>
              {value}
            </span>
            {unit && (
              <span className="plaque-unit" style={fit(noBreak(unit))}>
                {unit}
              </span>
            )}
          </p>
        </div>
        <p className="plaque-caption" data-testid="plaque-caption">
          {caption}
        </p>
      </div>
    </div>
  );
}

export function Rivets() {
  return (
    <>
      <span className="brass-rivet left-2 top-2" aria-hidden="true" />
      <span className="brass-rivet right-2 top-2" aria-hidden="true" />
      <span className="brass-rivet bottom-2 left-2" aria-hidden="true" />
      <span className="brass-rivet bottom-2 right-2" aria-hidden="true" />
    </>
  );
}
