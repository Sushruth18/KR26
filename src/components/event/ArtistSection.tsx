import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import { artistAsset } from '../../lib/artist';
import { artist, site } from '../../lib/data';
import { formatDate, formatTime } from '../../lib/format';
import { headlineStop } from '../../lib/schedule';
import { DarbarFrame } from './DarbarFrame';

/**
 * Headline artist: name, photo and event label come from artist.json; the date and time come from the
 * headline stop of the Day 2 schedule, so they can never disagree with the timeline.
 */
export function ArtistSection() {
  const { t } = useTranslation();
  const lang = useLang();
  const name = artist.name[lang];
  const event = artist.caption[lang];
  const caption = t('eventPage.artist.caption', {
    event,
    date: formatDate(site.day2Date, lang, { short: true }),
    time: headlineStop ? formatTime(headlineStop.start, lang) : '',
  });
  const largest = artistAsset.variants[artistAsset.variants.length - 1]!;

  return (
    <section aria-labelledby="artist-title" className="container-page py-8" data-testid="artist-section">
      <h2 id="artist-title" className="mb-6 text-center text-2xl text-gold-300 md:text-3xl">
        {t('eventPage.artist.title')}
      </h2>
      <figure className="m-0">
        <DarbarFrame>
          <img
            src={largest.src}
            srcSet={artistAsset.variants.map((v) => `${v.src} ${v.w}w`).join(', ')}
            sizes="236px"
            width={artistAsset.width}
            height={artistAsset.height}
            alt={t('eventPage.artist.alt', { name, event })}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: artist.focus }}
            data-testid="artist-photo"
          />
        </DarbarFrame>
        <figcaption className="mt-4 text-center">
          <p className="m-0 font-display text-2xl text-gold-300 text-glow" data-testid="artist-name">
            {name}
          </p>
          <p className="m-0 mt-1 text-ivory-300" data-testid="artist-caption">
            {caption}
          </p>
        </figcaption>
      </figure>
    </section>
  );
}
