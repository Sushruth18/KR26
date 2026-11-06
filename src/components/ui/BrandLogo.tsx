import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogo, type LogoKey } from '../../lib/logos';

const ALT: Record<LogoKey, string> = { college: 'brand.collegeLogoAlt', club: 'brand.clubLogoAlt' };

/** Plate border width — keep in sync with `.logo-plate` in index.css. */
const PLATE_BORDER = 1;

interface Props {
  which: LogoKey;
  /**
   * Rendered height in CSS px — of the whole plate when `plate` is set; `heightSm` applies from
   * 640px up. Width follows the logo's aspect ratio.
   */
  height: number;
  heightSm?: number;
  /**
   * Sit the logo on an ivory arch plate (thin gold border, soft gold glow) — for the college logo
   * on dark backgrounds, where its navy gear and ribbon would otherwise vanish into the night.
   */
  plate?: boolean;
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
  plate = false,
  lazy = false,
  single = false,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const logo = getLogo(which);
  if (!logo) return null;

  const widthAt = (h: number) => Math.round((h * logo.width) / logo.height);
  // Plate geometry for one breakpoint. The master's ink leaves an even ~2 % margin on every side
  // and the gear's top follows a semicircle of the logo's width, so a uniform padding plus an arch
  // whose top radius is half the plate width keeps the clearance even around gear and ribbon.
  const plateAt = (outer: number) => {
    const pad = Math.min(6, Math.max(3, Math.round(outer * 0.065)));
    const img = outer - 2 * (pad + PLATE_BORDER);
    const w = widthAt(img) + 2 * (pad + PLATE_BORDER);
    return { pad, img, top: w / 2, bottom: Math.round(w * 0.18) };
  };
  const base = plate ? plateAt(height) : null;
  const sm = plate ? plateAt(heightSm) : null;
  const imgH = base ? base.img : height;
  const imgHSm = sm ? sm.img : heightSm;

  const atLeast = (px: number) =>
    logo.variants.find((v) => v.w >= px) ?? logo.variants[logo.variants.length - 1]!;
  const sizes =
    imgHSm === imgH ? `${widthAt(imgH)}px` : `(min-width: 640px) ${widthAt(imgHSm)}px, ${widthAt(imgH)}px`;

  const img = (
    <img
      src={atLeast(widthAt(imgHSm) * (single ? 3 : 2)).src}
      srcSet={single ? undefined : logo.variants.map((v) => `${v.src} ${v.w}w`).join(', ')}
      sizes={single ? undefined : sizes}
      width={widthAt(imgH)}
      height={imgH}
      alt={t(ALT[which])}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      className={`brand-logo ${base ? '' : className}`}
      style={{ '--logo-h': `${imgH}px`, '--logo-h-sm': `${imgHSm}px` } as CSSProperties}
    />
  );
  if (!base || !sm) return img;

  return (
    <span
      className={`logo-plate ${className}`}
      data-testid={`logo-plate-${which}`}
      style={
        {
          '--plate-pad': `${base.pad}px`,
          '--plate-pad-sm': `${sm.pad}px`,
          '--plate-rt': `${base.top}px`,
          '--plate-rt-sm': `${sm.top}px`,
          '--plate-rb': `${base.bottom}px`,
          '--plate-rb-sm': `${sm.bottom}px`,
        } as CSSProperties
      }
    >
      {img}
    </span>
  );
}
