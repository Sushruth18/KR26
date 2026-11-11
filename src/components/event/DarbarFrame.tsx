import type { ReactNode } from 'react';

/** Darbar-hall frame: an arch held up by two gold pillars. Children fill the arch (a photo or a placeholder). */
export function DarbarFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`darbar ${className}`}>
      <div className="darbar-hall">
        <span className="darbar-pillar" aria-hidden="true" />
        <div className="darbar-arch">{children}</div>
        <span className="darbar-pillar" aria-hidden="true" />
      </div>
      <div className="darbar-floor" aria-hidden="true" />
    </div>
  );
}
