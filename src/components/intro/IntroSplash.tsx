import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PalaceSilhouette } from '../art/PalaceSilhouette';
import { endIntro, useIntroShowing } from './introState';

const LIFT_AT_MS = 2500; // bulbs ~1.6 s + "presents" 0.8 s
const LIFT_MS = 500; // total 3.0 s
const SKIP_LIFT_MS = 350;

/**
 * First-visit splash: black → the palace lights up row by row → "BMSIT&M presents" → lifts away.
 * Home renders underneath the whole time (so LCP is the hero heading, not this overlay).
 */
export function IntroSplash() {
  const showing = useIntroShowing();
  return showing ? <Splash /> : null;
}

function Splash() {
  const { t } = useTranslation();
  const [liftMs, setLiftMs] = useState<number | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const leave = useCallback((ms: number) => {
    setLiftMs((prev) => prev ?? ms);
    window.setTimeout(endIntro, ms);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => leave(LIFT_MS), LIFT_AT_MS);
    // The page underneath is inert until the splash has gone (so Tab lands on Skip), and cannot be scrolled.
    const app = document.getElementById('root');
    app?.setAttribute('inert', '');
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave(SKIP_LIFT_MS);
      else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && e.target !== skipRef.current) e.preventDefault();
    };
    const el = rootRef.current;
    el?.addEventListener('wheel', block, { passive: false });
    el?.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', keys);
    return () => {
      window.clearTimeout(timer);
      app?.removeAttribute('inert');
      el?.removeEventListener('wheel', block);
      el?.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', keys);
    };
  }, [leave]);

  return createPortal(
    <div ref={rootRef} className="intro" data-leaving={liftMs !== null}
      style={liftMs !== null ? { animationDuration: `${liftMs}ms` } : undefined} data-testid="intro" role="dialog" aria-modal="true" aria-label={t('intro.label')}>
      <div className="intro-glow" aria-hidden="true" />
      <div className="relative w-full min-w-0">
        <div className="intro-palace">
          <PalaceSilhouette mode="animate" twinkle={false} />
        </div>
        <p className="intro-presents">{t('intro.presents')}</p>
      </div>
      <button ref={skipRef} type="button" className="btn btn-ghost intro-skip" onClick={() => leave(SKIP_LIFT_MS)} disabled={liftMs !== null}>
        {t('intro.skip')}
      </button>
    </div>,
    document.body,
  );
}
