import { useCallback, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { LanguageToggle } from './LanguageToggle';
import { MusicToggle } from './MusicToggle';
import { MobileMenu } from './MobileMenu';

export function Navbar() {
  const { t } = useTranslation();
  // The menu is "open" only for the route it was opened on, so navigating closes it without an effect.
  const { pathname } = useLocation();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = useCallback(() => setOpenOn(null), []);
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  return (
    <header className="sticky top-0 z-50 border-b border-gold-600/30 bg-night-950/70 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to="/" className="font-display text-lg leading-tight text-gold-300 text-glow sm:text-xl">
          {t('brand.wordmark')}
        </Link>

        <nav aria-label={t('common.mainNav')} className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex min-h-[44px] items-center border-b-2 px-3 text-sm transition-colors ${
                  isActive ? 'border-gold-400 text-gold-300' : 'border-transparent text-ivory-50 hover:text-gold-300'
                }`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
          <span className="mx-1 h-6 w-px bg-gold-600/40" aria-hidden="true" />
          <MusicToggle />
          <LanguageToggle />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <button
            type="button"
            className="btn btn-ghost !px-3"
            onClick={() => setOpen(true)}
            aria-label={t('common.menuOpen')}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>
      <MobileMenu open={open} onClose={close} />
    </header>
  );
}
