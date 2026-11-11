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
        <ul className="m-0 flex list-none flex-wrap justify-center gap-10 p-0">
          {guests.map((g) => (
            <li key={g.name.en} className="w-full max-w-[17.5rem]">
              <figure className="m-0">
                <DarbarFrame>
                  <img src={g.photo} alt={g.name[lang]} loading="lazy" decoding="async" />
                </DarbarFrame>
                <figcaption className="mt-4 text-center">
                  <p className="m-0 font-display text-xl text-gold-300">{g.name[lang]}</p>
                  <p className="m-0 text-ivory-300">{g.title[lang]}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
