/**
 * The Karnataka flag as the splash backdrop: plain horizontal bands, yellow over red, no emblem.
 * Inline SVG/CSS only. The "wave" is a wavy yellow/red seam plus soft cloth folds on two 200%-wide
 * strips that slide sideways by exactly two wave periods (transform only, seamless loop). `still`
 * (low-end devices) keeps the same drawing without the animation. Purely decorative.
 */
export function KarnatakaFlag({ still }: { still: boolean }) {
  return (
    <div className="intro-flag" data-still={still} aria-hidden="true">
      <div className="intro-flag-strip intro-flag-red">
        {/* 4 periods across 200% of the screen = one every 50vw; the strip moves by 100vw (two periods). */}
        <svg className="intro-flag-seam" viewBox="0 0 400 20" preserveAspectRatio="none" focusable="false">
          <path d="M0 10Q25 2 50 10T100 10T150 10T200 10T250 10T300 10T350 10T400 10V20H0Z" fill="#E31B23" />
        </svg>
        <div className="intro-flag-band" />
      </div>
      <div className="intro-flag-strip intro-flag-folds" />
    </div>
  );
}
