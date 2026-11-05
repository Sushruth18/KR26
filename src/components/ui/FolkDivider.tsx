import { useId } from 'react';

/** Temple-border / kasuti-style geometric band, drawn as a repeating SVG pattern. */
export function FolkDivider({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <svg className={`folk-divider ${className}`} role="presentation" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L10 2 L20 10 L10 18 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="10" cy="10" r="2" fill="currentColor" />
          <path d="M20 10 H40" stroke="currentColor" strokeWidth="1" />
          <path d="M28 10 L32 6 L36 10 L32 14 Z" fill="currentColor" opacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="20" fill={`url(#${id})`} />
    </svg>
  );
}
