import { useId } from 'react';

/**
 * A panju — the hand torch of the Dasara torchlight parade. Flat SVG with gold line-work; the flame
 * flickers with a transform-only CSS loop (static under reduced motion). Decorative.
 */
export function Torch({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 150" width="32" height="120" className={`torch ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`tg-${id}`}>
          <stop offset="0" stopColor="#FFD27A" stopOpacity="0.5" />
          <stop offset="1" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`tf-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#E8772E" />
          <stop offset="0.45" stopColor="#F5B841" />
          <stop offset="1" stopColor="#FFD27A" />
        </linearGradient>
        <linearGradient id={`tc-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B07816" />
          <stop offset="0.45" stopColor="#FFD27A" />
          <stop offset="1" stopColor="#C98A1B" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="34" r="20" fill={`url(#tg-${id})`} />
      <g className="torch-flame">
        <path d="M20 3C26 15 33 23 31 35 30 45 25 51 20 51S10 45 9 35C8 25 15 16 20 3Z" fill={`url(#tf-${id})`} />
        <path className="torch-core" d="M20 20C23 27 27 32 26 39 25 45 23 48 20 48S15 45 14 39C14 32 18 27 20 20Z" fill="#FFF1C6" />
      </g>
      <path d="M7 51H33L28 66H12Z" fill={`url(#tc-${id})`} stroke="#8A5E12" strokeWidth="0.8" />
      <path d="M10 56H30" stroke="#8B1E2D" strokeWidth="2" />
      <path d="M15 66H25V72H15Z" fill="#F5B841" />
      <path d="M16.5 72H23.5V145Q20 149 16.5 145Z" fill="#5A3A1A" stroke="#C98A1B" strokeWidth="0.8" strokeOpacity="0.7" />
      {[86, 106, 126].map((y) => (
        <path key={y} d={`M15.5 ${y}H24.5V${y + 4}H15.5Z`} fill="#F5B841" />
      ))}
    </svg>
  );
}
