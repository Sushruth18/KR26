import type { ReactNode } from 'react';

interface Props {
  /** Engraved emblem above the value (a lucide icon). */
  icon?: ReactNode;
  value: ReactNode;
  /** Smaller text set beside/below the value, e.g. a month or "+ mementos". */
  unit?: ReactNode;
  caption?: ReactNode;
  className?: string;
}

/** Stat card: dark face in a brushed-brass frame with four rivets. */
export function BrassPlaque({ icon, value, unit, caption, className = '' }: Props) {
  return (
    <div className={`brass ${className}`}>
      <div className="brass-face flex h-full flex-col items-center px-5 pb-6 pt-7 text-center">
        <Rivets />
        {icon && (
          <span className="mb-3 text-gold-400" aria-hidden="true">
            {icon}
          </span>
        )}
        <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-2 font-display leading-tight text-gold-300">
          <span className="brass-value">{value}</span>
          {unit && <span className="text-xl text-gold-400">{unit}</span>}
        </p>
        {caption && <p className="m-0 mt-2 max-w-[28ch] text-ivory-300">{caption}</p>}
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
