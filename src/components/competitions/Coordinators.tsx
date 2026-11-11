import { useTranslation } from 'react-i18next';
import { Phone, UserRound } from 'lucide-react';
import { RULES } from '../../lib/rules';
import type { CompetitionEvent } from '../../lib/schemas';

const PHONE = new RegExp(RULES.phone.pattern);

/** "98450 12345" — easier to read and dial by hand than ten digits in a row. Phone numbers stay Latin in both languages. */
const spaced = (digits: string) => `${digits.slice(0, 5)} ${digits.slice(5)}`;

/**
 * The event's coordinators (1–3): each name with its own tel: link. A link is only rendered for a valid
 * 10-digit number (validate-data enforces that at build time too), so there is never a dead link.
 */
export function Coordinators({ eventId, people }: { eventId: string; people: CompetitionEvent['coordinators'] }) {
  const { t } = useTranslation();
  const labelId = `coordinators-${eventId}`;

  return (
    <div className="text-sm" data-testid={`coordinators-${eventId}`}>
      <p id={labelId} className="m-0 inline-flex items-center gap-2 text-ivory-300">
        <UserRound size={16} aria-hidden="true" className="flex-none text-gold-400" />
        {t('competitions.coordinator', { count: people.length })}
      </p>
      <ul aria-labelledby={labelId} className="m-0 mt-1 list-none space-y-1 p-0">
        {people.map(({ name, phone }) => (
          <li key={phone} className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="min-w-0 break-words text-ivory-50">{name}</span>
            {PHONE.test(phone) && (
              <a
                href={`tel:+91${phone}`}
                className="btn btn-ghost !min-h-[44px] !px-3 !py-1 text-sm"
                aria-label={t('competitions.call', { name, phone: spaced(phone) })}
                lang="en"
              >
                <Phone size={16} aria-hidden="true" />
                <span className="whitespace-nowrap">{spaced(phone)}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
