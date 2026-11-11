import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import { AnchorButton } from '../ui/Button';
import { site } from '../../lib/data';

/** Embedded Google Map of the campus. The iframe is only created when the section scrolls near the viewport. */
export function VenueMap() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  // Very old browsers without IntersectionObserver get the map straight away.
  const [show, setShow] = useState(() => !('IntersectionObserver' in window));
  const q = encodeURIComponent(site.mapQuery);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <section aria-labelledby="venue-title" className="container-page py-8 pb-16">
      <h2 id="venue-title" className="mb-6 text-center text-2xl text-gold-300 md:text-3xl">
        {t('eventPage.venue.title')}
      </h2>
      <div ref={ref} className="map-frame" data-testid="map-frame">
        {show ? (
          <iframe
            src={`https://www.google.com/maps?q=${q}&output=embed`}
            title={t('eventPage.venue.mapTitle')}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            data-testid="map-iframe"
          />
        ) : (
          <p className="m-0 grid h-full place-items-center text-ivory-300" role="status">
            {t('eventPage.venue.loading')}
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-center">
        <AnchorButton
          variant="primary"
          href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="directions"
        >
          <Navigation size={18} aria-hidden="true" />
          {t('eventPage.venue.directions')}
        </AnchorButton>
      </div>
    </section>
  );
}
