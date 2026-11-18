import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { guests } from '../../lib/data';
import { DarbarFrame } from './DarbarFrame';

/** Chief guests, one Darbar frame each. Until guests.json has entries: a single "Announcing soon" frame. */
export function ChiefGuests() {
  const { t } = useTranslation();
  const lang = useLang();

  return (
    <section aria-labelledby="guests-title" className="container-page py-8">
      <h2 id="guests-title" className="mb-6 text-center text-2xl text-gold-300 md:text-3xl">
        {t('eventPage.guests.title')}
      </h2>
      {guests.length === 0 ? (
        <figure className="m-0" data-testid="guests-soon">
          <DarbarFrame>
            <div className="darbar-empty">
              <Sparkles size={30} className="mx-auto" aria-hidden="true" />
              <p className="m-0 font-display text-xl">{t('eventPage.guests.soon')}</p>
              <p className="m-0 text-sm text-ivory-300">{t('eventPage.guests.soonText')}</p>
            </div>
          </DarbarFrame>
        </figure>
      ) : (
        <ul className="guest-grid" data-testid="guest-list">
          {guests.map((g) => (
            <li key={g.name.en} className="guest-item" data-testid="guest-card">
              <figure className="m-0">
                <DarbarFrame className="guest-frame">
                  <img
                    src={g.photo}
                    width={g.width}
                    height={g.height}
                    alt={t('eventPage.guests.alt', { name: g.name[lang] })}
                    loading="lazy"
                    decoding="async"
                    data-testid="guest-photo"
                  />
                </DarbarFrame>
                <figcaption className="guest-caption">
                  <p className="guest-name" data-testid="guest-name">
                    {g.name[lang]}
                  </p>
                  <p className="guest-title" data-testid="guest-title">
                    {g.title[lang]}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
