import { useTranslation } from 'react-i18next';
import { Phone, UserRound } from 'lucide-react';
import { isTodo } from '../../lib/format';
import type { CompetitionEvent } from '../../lib/schemas';

/** Coordinator name + tel: link. The link is not rendered at all until a real number is set. */
export function Coordinator({ coordinator }: { coordinator: CompetitionEvent['coordinator'] }) {
  const { t } = useTranslation();
  const nameKnown = !isTodo(coordinator.name);
  const name = nameKnown ? coordinator.name : t('common.tba');
  const digits = isTodo(coordinator.phone) ? '' : coordinator.phone.replace(/[^\d+]/g, '');

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
      <p className="m-0 inline-flex min-w-0 items-center gap-2">
        <UserRound size={16} aria-hidden="true" className="flex-none text-gold-400" />
        <span className="text-ivory-300">{t('competitions.coordinator')}:</span>
        <span className={nameKnown ? 'text-ivory-50' : 'text-ivory-300'}>{name}</span>
      </p>
      {digits && (
        <a
          href={`tel:${digits}`}
          className="btn btn-ghost !min-h-[44px] !px-3 !py-1 text-sm"
          aria-label={t('competitions.call', { name, phone: coordinator.phone })}
          lang="en"
        >
          <Phone size={16} aria-hidden="true" />
          {coordinator.phone}
        </a>
      )}
    </div>
  );
}
