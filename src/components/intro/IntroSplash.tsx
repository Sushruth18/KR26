import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isLowEndDevice } from '../../hooks/useMotionPrefs';
import { PalaceSilhouette } from '../art/PalaceSilhouette';
import { BrandLogo } from '../ui/BrandLogo';
import { KarnatakaFlag } from './KarnatakaFlag';
import { endIntro, introHold, useIntroShowing } from './introState';

/**
 * Timeline (CSS delays in home.css → "Intro splash"; keep in sync):
 *   0.0–0.8 s flag fades in from black · 0.4–2.8 s palace bulbs light row by row · 1.2–2.2 s logos rise in
 *   2.6–3.8 s "… presents" · 3.8–4.4 s hold with a twinkle · 4.4–5.0 s the splash lifts away.
 */
export const INTRO_LIFT_AT_MS = 4400;
export const INTRO_LIFT_MS = 600; // total 5.0 s
const SKIP_LIFT_MS = 350;

/**
 * First-visit splash (CLAUDE.md §5.0). Home renders underneath the whole time, and the splash's first
 * frame is only black + Skip: the flag, palace and logos mount one frame later, so they never hold up
 * Home's first paint (LCP stays the hero heading). Screen readers get a labelled dialog whose only
 * content is the Skip button; everything visual is aria-hidden.
 */
export function IntroSplash() {
  const showing = useIntroShowing();
  return showing ? <Splash /> : null;
}

function Splash() {
  const { t } = useTranslation();
  const [liftMs, setLiftMs] = useState<number | null>(null);
  const [stage, setStage] = useState(false);
  // Timed from the splash's first render, not from the effect: Home mounts in the same commit, so the
  // effect can run well after the splash appeared, and the 5 s budget must not grow by that much.
  const [bornAt] = useState(() => performance.now());
  const skipRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const leave = useCallback((ms: number) => {
    setLiftMs((prev) => prev ?? ms);
    window.setTimeout(endIntro, ms);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStage(true));
    const liftIn = Math.max(0, INTRO_LIFT_AT_MS - (performance.now() - bornAt));
    const timer = introHold ? 0 : window.setTimeout(() => leave(INTRO_LIFT_MS), liftIn);
    // The page underneath is inert until the splash has gone (so Tab lands on Skip) and cannot scroll:
    // wheel/touch/keys are blocked, and a scrollbar drag is undone. The position is restored on close.
    const app = document.getElementById('root');
    app?.setAttribute('inert', '');
    const y = window.scrollY;
    const pin = () => window.scrollY !== y && window.scrollTo({ top: y, behavior: 'instant' });
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave(SKIP_LIFT_MS);
      else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && e.target !== skipRef.current) e.preventDefault();
    };
    const el = rootRef.current;
    el?.addEventListener('wheel', block, { passive: false });
    el?.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', keys);
    window.addEventListener('scroll', pin, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      app?.removeAttribute('inert');
      el?.removeEventListener('wheel', block);
      el?.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', keys);
      window.removeEventListener('scroll', pin);
      pin();
    };
  }, [leave, bornAt]);

  return createPortal(
    <div
      ref={rootRef}
      className="intro"
      data-leaving={liftMs !== null}
      style={liftMs !== null ? { animationDuration: `${liftMs}ms` } : undefined}
      data-testid="intro"
      role="dialog"
      aria-modal="true"
      aria-label={t('intro.presents')}
    >
      {stage && (
        <>
          <KarnatakaFlag still={isLowEndDevice} />
          <div className="intro-night" aria-hidden="true" />
          <div className="intro-stage" aria-hidden="true" data-testid="intro-stage">
            <div className="intro-logos" data-testid="intro-logos">
              <BrandLogo which="college" height={64} heightSm={80} plate />
              <span className="intro-logo-divider" />
              <BrandLogo which="jubilee" height={64} heightSm={80} />
            </div>
            <div className="intro-palace">
              <PalaceSilhouette mode="animate" twinkle={!isLowEndDevice} lightSets={isLowEndDevice ? 1 : undefined} />
            </div>
            <p className="intro-presents">{t('intro.presents')}</p>
          </div>
        </>
      )}
      <button ref={skipRef} type="button" className="btn btn-ghost intro-skip" onClick={() => leave(SKIP_LIFT_MS)} disabled={liftMs !== null}>
        {t('intro.skip')}
      </button>
    </div>,
    document.body,
  );
}
