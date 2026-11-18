import type { ReactNode } from 'react';
import type { FolkIconName } from '../../lib/team';

/**
 * Folk icons for the troupes: flat, single-weight gold line-work (24×24), one per group —
 * chatri (royal parasol), ratha (temple-car wheel), kombu (processional horn), lens, rangoli,
 * palm-leaf scroll, kalasha (welcome pot), stall, shield, conch, Yakshagana mask, gear.
 */
const PATHS: Record<FolkIconName, ReactNode> = {
  chatri: (
    <>
      <path d="M3 12a9 9 0 0 1 18 0 2.25 2.25 0 0 0-4.5 0 2.25 2.25 0 0 0-4.5 0 2.25 2.25 0 0 0-4.5 0A2.25 2.25 0 0 0 3 12Z" />
      <path d="M12 3V1.5M12 12v8.5a1.8 1.8 0 0 0 3.6 0" />
      <path d="M7.5 14.5v2M16.5 14.5v2" />
    </>
  ),
  ratha: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3v6.8M12 14.2V21M3 12h6.8M14.2 12H21M5.6 5.6l4.8 4.8M13.6 13.6l4.8 4.8M18.4 5.6l-4.8 4.8M10.4 13.6l-4.8 4.8" />
    </>
  ),
  kombu: (
    <>
      <path d="M3 20c9 1 16-5 16-14" />
      <path d="M3 20c8-.5 13-5.5 13.5-13" />
      <path d="M16.5 7l-1.5-4.5M19 6l4-3M19 6l2.5 3.5" />
    </>
  ),
  lens: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v4.8M20.2 7.5l-4.2 2.4M20.2 16.5l-4.2-2.4M12 21v-4.8M3.8 16.5l4.2-2.4M3.8 7.5l4.2 2.4" />
    </>
  ),
  rangoli: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4c-2.6-2.4-2.6-6 0-8 2.6 2 2.6 5.6 0 8ZM13.6 12c2.4-2.6 6-2.6 8 0-2 2.6-5.6 2.6-8 0ZM12 13.6c2.6 2.4 2.6 6 0 8-2.6-2-2.6-5.6 0-8ZM10.4 12c-2.4 2.6-6 2.6-8 0 2-2.6 5.6-2.6 8 0Z" />
      <path d="M5.2 5.2l1.6 1.6M18.8 5.2l-1.6 1.6M5.2 18.8l1.6-1.6M18.8 18.8l-1.6-1.6" />
    </>
  ),
  scroll: (
    <>
      <path d="M4 6.5h16v11H4z" />
      <path d="M7.5 10h9M7.5 13h9M7.5 16h5" />
      <path d="M2.5 12h1.5M20 12h1.5" />
      <circle cx="6.2" cy="8.2" r=".5" />
    </>
  ),
  kalasha: (
    <>
      <path d="M8 9c-3 1.5-3.5 9 0 11h8c3.5-2 3-9.5 0-11" />
      <path d="M7.5 9h9" />
      <circle cx="12" cy="6" r="2.2" />
      <path d="M9.8 5.2C7.5 3.5 5.5 4 4.5 5.5c1.6 1.2 3.7 1.2 5.3.5M14.2 5.2c2.3-1.7 4.3-1.2 5.3.3-1.6 1.2-3.7 1.2-5.3.5" />
      <path d="M9.5 14c1.5 1 3.5 1 5 0" />
    </>
  ),
  stall: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M4.5 12v8.5M19.5 12v8.5M3 20.5h18M4.5 16h15" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10v-6Z" />
      <path d="M12 7v10M8 11.5h8" />
    </>
  ),
  conch: (
    <>
      <path d="M4 15c0-5.5 4-10.5 10-10.5 4 0 6.5 2 6.5 5 0 3-2 4.5-4 4.5-1.8 0-3-1-3-2.5 0-1.2.9-2 2-2" />
      <path d="M4 15c0 3.5 3 5.5 7 5.5 3 0 5.5-1.5 7-3.5" />
      <path d="M4 15c-1.5-.5-2.5-1.5-2.5-3" />
    </>
  ),
  mask: (
    <>
      <path d="M7 8.5c0-3.5 2-6 5-6s5 2.5 5 6" />
      <path d="M4.5 6.5 7 8.5M19.5 6.5 17 8.5M12 2.5V1" />
      <path d="M7 8.5v5c0 4 2 7.5 5 7.5s5-3.5 5-7.5v-5Z" />
      <path d="M9 12c1-.8 2-.8 3 0M12 12c1-.8 2-.8 3 0M9.5 17c1.5 1 3.5 1 5 0" />
      <path d="M12 12.5v2.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
};

export function TeamGroupIcon({ name, size = 26 }: { name: FolkIconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
