import { createElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Drama, Flag, Music, Navigation, Shirt, Sparkles, type LucideIcon } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { useLang } from '../../hooks/useLang';
import { artist, attractions } from '../../lib/data';
import { formatTime } from '../../lib/format';
import { day2Stops } from '../../lib/schedule';

const ICONS: Record<string, LucideIcon> = { flag: Flag, navigation: Navigation, shirt: Shirt, music: Music, drama: Drama };

/** Special attractions as banners hanging from a rope. Times and club names come from the Day 2 schedule. */
export function Attractions() {
  const { t } = useTranslation();
  const lang = useLang();

  return (
    <section aria-labelledby="attractions-title" className="container-page py-8">
      <h2 id="attractions-title" className="mb-8 text-center text-2xl text-gold-300 md:text-3xl">
        {t('eventPage.attractions.title')}
      </h2>
      <ul className="banners m-0 list-none p-0" data-testid="attractions">
        {attractions.map((a, i) => {
          const stops = a.starts.flatMap((start) => day2Stops.find((s) => s.start === start) ?? []);
          return (
            <li key={a.id} className="banner-wrap">
              <Reveal index={i} className="flex min-w-0 flex-1">
                <article className="banner" data-headline={a.headline || undefined} data-testid={`attraction-${a.id}`}>
                  <span className="text-gold-300" aria-hidden="true">
                    {createElement(ICONS[a.icon] ?? Sparkles, { size: 30, strokeWidth: 1.6 })}
                  </span>
                  <h3 className="m-0 text-xl text-gold-300">{a.title[lang]}</h3>
                  {a.headline && (
                    <span className="route-pill" data-kind="headline">
                      {t('eventPage.attractions.headline')}
                    </span>
                  )}
                  <p className="m-0 text-ivory-50">{a.text[lang]}</p>
                  {a.headline && (
                    <p className="m-0 font-display text-lg text-gold-300" data-testid="attraction-artist">
                      {artist.name[lang]}
                    </p>
                  )}
                  {stops.length === 1 ? (
                    <p className="m-0 text-ivory-300">{formatTime(stops[0]!.start, lang)}</p>
                  ) : (
                    <ul className="m-0 mt-1 w-full list-none space-y-1 p-0 text-sm text-ivory-300">
                      {stops.map((s) => (
                        <li key={s.start}>
                          <span className="text-ivory-50">{s.title[lang]}</span>
                          {s.description && <span> ({s.description[lang]})</span>} · {formatTime(s.start, lang)}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
