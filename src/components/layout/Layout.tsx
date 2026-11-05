import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { NightSky } from '../ui/NightSky';

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Scroll to top on route change; move focus to <main> for keyboard/screen-reader users.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) first.current = false;
    else main.current?.focus({ preventScroll: true });
  }, [pathname]);

  // Dev-only guard against the 2025 "footer rendered 2–3 times" bug.
  useEffect(() => {
    if (import.meta.env.DEV && document.querySelectorAll('footer').length > 1) {
      console.warn('[Layout] More than one <footer> in the document — Footer must only render inside Layout.');
    }
  });

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-night-950"
      >
        {t('common.skip')}
      </a>
      <NightSky />
      <Navbar />
      <main id="main" ref={main} tabIndex={-1} className="min-h-[60vh] outline-none">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
