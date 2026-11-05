import { useState } from 'react';
import { isLowEndDevice, useReducedMotion } from '../../hooks/useMotionPrefs';
import { useParallax } from '../../hooks/useParallax';
import { introShowing } from '../intro/introState';
import { PalaceSilhouette, type PalaceMode } from '../art/PalaceSilhouette';
import { AmbariElephant } from '../art/AmbariElephant';
import { CrowdSilhouette } from '../art/CrowdSilhouette';

/** px of sink per px scrolled: glow (farthest) → palace → crowd. Elephant and road stay put. */
const RATES = [0.17, 0.13, 0.036] as const;

/**
 * The procession at night: sky glow → palace → crowd → road → Ambari walking across the foreground.
 * Parallax (transform only, 0 at rest on load) is off under reduced motion and on low-end devices.
 */
export function HeroScene() {
  const reduced = useReducedMotion();
  const layer = useParallax<HTMLDivElement>(RATES, !reduced && !isLowEndDevice);
  // If the splash is up, the palace is revealed already lit (the splash did the light-up).
  const [mode] = useState<PalaceMode>(() => (reduced || introShowing() ? 'lit' : 'animate'));

  return (
    <div className="hero-scene" aria-hidden="true" data-testid="hero-scene">
      <div ref={layer(0)} className="scene-glow" />
      {/* Static clip box, so the sinking palace never shows below the crowd line. */}
      <div className="scene-palace-clip">
        <div ref={layer(1)} className="scene-palace">
          <PalaceSilhouette mode={mode} twinkle={!reduced && !isLowEndDevice} />
        </div>
      </div>
      <div ref={layer(2)} className="scene-crowd">
        <CrowdSilhouette />
      </div>
      <div className="scene-road" />
      <div className="scene-elephant" data-crossing={!reduced}>
        <AmbariElephant walking={!reduced} />
      </div>
    </div>
  );
}
