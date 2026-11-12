import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import { artistAssets } from '../../lib/artist';
import { artists, site } from '../../lib/data';
import { formatDate, formatTime } from '../../lib/format';
import type { Artist } from '../../lib/schemas';
import { headlineStop } from '../../lib/schedule';
import { DarbarFrame } from './DarbarFrame';

/**
 * The photos are square and drawn with object-fit: cover in a 3:4 arch, so they need as many pixels as the
 * arch is tall: --artist-w (event.css) minus pillars and borders, × 4/3. Keep in step with --artist-w.
 */
const ARTIST_IMG_SIZES = '262px';

/**
 * Headline artists (artist.json, in its order): one Darbar frame each, all the same size — side by side
 * from 640 px, stacked on phones — and one shared caption. The event label is the headline schedule stop's
 * title and the date and time come from that stop too, so they can never disagree with the timeline.
 */
export function ArtistSection() {
  const { t } = useTranslation();
  const lang = useLang();
  const event = headlineStop?.title[lang] ?? artists[0]?.caption?.[lang] ?? '';
  const caption = t('eventPage.artist.caption', {
    event,
    date: formatDate(site.day2Date, lang, { short: true }),
    time: headlineStop ? formatTime(headlineStop.start, lang) : '',
  });

  return (
    <section aria-labelledby="artist-title" className="container-page py-8" data-testid="artist-section">
      <h2 id="artist-title" className="mb-6 text-center text-2xl text-gold-300 md:text-3xl">
        {t('eventPage.artist.title')}
      </h2>
      <ul className="artist-grid" data-testid="artist-list">
        {artists.map((a) => (
          <ArtistFigure key={a.id} artist={a} name={a.name[lang]} alt={t('eventPage.artist.alt', { name: a.name[lang], event: a.caption?.[lang] ?? event })} />
        ))}
      </ul>
      <p className="m-0 mt-5 text-center text-ivory-300" data-testid="artist-caption">
        {caption}
      </p>
    </section>
  );
}

function ArtistFigure({ artist, name, alt }: { artist: Artist; name: string; alt: string }) {
  const asset = artistAssets[artist.id];
  const largest = asset?.variants[asset.variants.length - 1];
  return (
    <li className="artist-item" data-testid={`artist-${artist.id}`}>
      <figure className="m-0">
        <DarbarFrame className="artist-frame">
          {asset && largest && (
            <img
              src={largest.src}
              srcSet={asset.variants.map((v) => `${v.src} ${v.w}w`).join(', ')}
              sizes={ARTIST_IMG_SIZES}
              width={asset.width}
              height={asset.height}
              // Only the name and the event — never a description of the person.
              alt={alt}
              loading="lazy"
              decoding="async"
              style={artist.focus ? { objectPosition: artist.focus } : undefined}
              data-testid="artist-photo"
            />
          )}
        </DarbarFrame>
        <figcaption className="mt-4 text-center">
          <p className="m-0 font-display text-2xl text-gold-300 text-glow" data-testid="artist-name">
            {name}
          </p>
        </figcaption>
      </figure>
    </li>
  );
}
