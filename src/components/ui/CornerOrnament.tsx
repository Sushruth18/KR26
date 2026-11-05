/**
 * Small gold corner ornament for major cards. Drawn for the bottom-left corner; `flip` mirrors it
 * for the bottom-right. `kolam` is a dot-grid-and-loop pattern (used on the Rangoli card).
 */
interface Props {
  variant?: 'filigree' | 'kolam';
  flip?: boolean;
  className?: string;
}

export function CornerOrnament({ variant = 'filigree', flip = false, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      width="40"
      height="40"
      className={`corner-ornament ${flip ? '-scale-x-100' : ''} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'kolam' ? <Kolam /> : <Filigree />}
    </svg>
  );
}

function Filigree() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M3 37V15M3 37h22" />
      <path d="M3 25c8 0 12 4 12 12" />
      <path d="M8 37c0-3 2-5 5-5" opacity="0.7" />
      <circle cx="9" cy="31" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="3" cy="11" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="29" cy="37" r="1.4" fill="currentColor" stroke="none" />
    </g>
  );
}

/** Pulli kolam: a 3-dot L of dots with a single line looping around each. */
function Kolam() {
  const dots: [number, number][] = [
    [9, 31],
    [21, 31],
    [33, 31],
    [9, 19],
    [9, 7],
    [21, 19],
  ];
  return (
    <g>
      <g fill="currentColor">
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
        ))}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M3 31c0-5 3-6 6-6s6 1 6 6-3 6-6 6-6-1-6-6Z" />
        <path d="M15 31c0-4 2.5-6 6-6s6 2 6 6-2.5 6-6 6-6-2-6-6Z" />
        <path d="M27 31c0-3 2-6 6-6M9 25c-4 0-6-2.5-6-6s2-6 6-6 6 2.5 6 6-2 6-6 6Z" />
        <path d="M9 13c-3 0-6-2-6-6M15 19c0-3.5 2.5-6 6-6s6 2.5 6 6-2.5 6-6 6" />
      </g>
    </g>
  );
}
