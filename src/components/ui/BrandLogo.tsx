import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogo, type LogoKey } from '../../lib/logos';

const ALT: Record<LogoKey, string> = { college: 'brand.collegeLogoAlt', club: 'brand.clubLogoAlt' };

interface Props {
  which: LogoKey;
  /** Rendered height in CSS px; `heightSm` applies from 640px up. Width follows the logo's aspect ratio. */
  height: number;
  heightSm?: number;
  /** Below the fold on every page (e.g. the footer). */
  lazy?: boolean;
  /**
   * One fixed file and no srcset, for the pass: html-to-image embeds `src` and drops `srcset`.
   * Uses a copy ≥ 3× the rendered width so the 2× PNG export stays sharp.
   */
  single?: boolean;
  className?: string;
}

/** A brand logo from public/brand/ (WebP copies made by `npm run brand:images`); renders nothing if not supplied. */
export function BrandLogo({
  which,
  height,
  heightSm = height,
  lazy = false,
  single = false,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const logo = getLogo(which);
  if (!logo) return null;

  const widthAt = (h: number) => Math.round((h * logo.width) / logo.height);
  const atLeast = (px: number) =>
    logo.variants.find((v) => v.w >= px) ?? logo.variants[logo.variants.length - 1]!;
  const sizes =
    heightSm === height
      ? `${widthAt(height)}px`
      : `(min-width: 640px) ${widthAt(heightSm)}px, ${widthAt(height)}px`;

  return (
    <img
      src={atLeast(widthAt(heightSm) * (single ? 3 : 2)).src}
      srcSet={single ? undefined : logo.variants.map((v) => `${v.src} ${v.w}w`).join(', ')}
      sizes={single ? undefined : sizes}
      width={widthAt(height)}
      height={height}
      alt={t(ALT[which])}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      className={`brand-logo ${className}`}
      style={{ '--logo-h': `${height}px`, '--logo-h-sm': `${heightSm}px` } as CSSProperties}
    />
  );
}
