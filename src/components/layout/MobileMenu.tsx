import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { LanguageToggle } from './LanguageToggle';
import { MusicToggle } from './MusicToggle';
import { useReducedMotion } from '../../hooks/useMotionPrefs';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);

  // Lock scroll, close on Esc, keep Tab focus inside the menu.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('a,button');
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
      const a = f[0];
      const z = f[f.length - 1];
      if (!a || !z) return;
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Portal to <body>: the header's backdrop-filter would otherwise become the containing block
  // for this fixed overlay and clip it to the header's height.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.mobileNav')}
          className="fixed inset-0 z-[60] flex flex-col bg-night-950/95 backdrop-blur-md md:hidden"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-display text-xl text-gold-300">{t('brand.wordmark')}</span>
            <button type="button" onClick={onClose} className="btn btn-ghost !px-3" aria-label={t('common.menuClose')}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label={t('common.mobileNav')} className="flex flex-1 flex-col justify-center gap-1 px-6 pb-8">
            {NAV_ITEMS.map((item, i) => (
              <motion.div
                key={item.to}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.06 * i + 0.1, duration: 0.35 }}
              >
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block min-h-[52px] rounded-lg px-3 py-2 font-display text-2xl transition-colors ${
                      isActive ? 'text-gold-300 underline decoration-gold-400 decoration-2 underline-offset-8' : 'text-ivory-50 hover:text-gold-300'
                    }`
                  }
                >
                  {t(item.key)}
                </NavLink>
              </motion.div>
            ))}
          </nav>
          <div className="flex items-center gap-3 px-6 pb-safe">
            <LanguageToggle />
            <MusicToggle />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
