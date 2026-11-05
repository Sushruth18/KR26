import { useId } from 'react';

/**
 * Section divider: a band framed by two fine rules with a repeating kasuti (Karnataka cross-stitch)
 * motif — five "x" stitches set as a diamond, joined by a dotted running stitch. SVG pattern repeat.
 */
export function FolkDivider({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const stitch = (x: number, y: number) => `M${x - 1.7} ${y - 1.7}l3.4 3.4m0-3.4l-3.4 3.4`;
  return (
    <svg className={`folk-divider ${className}`} role="presentation" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="36" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 1.5H36M0 20.5H36" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <path
            d={[stitch(18, 6), stitch(13, 11), stitch(18, 11), stitch(23, 11), stitch(18, 16)].join('')}
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M2 11h2M6 11h2M28 11h2M32 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        </pattern>
      </defs>
      <rect width="100%" height="22" fill={`url(#${id})`} />
    </svg>
  );
}
