import { useTranslation } from 'react-i18next';
import { ScrollText } from 'lucide-react';
import { eventRules } from 'virtual:competition-rules';
import { useLang } from '../../hooks/useLang';
import { isTodo } from '../../lib/format';
import { Disclosure, RuleList } from '../ui/Disclosure';

/** The event's rules (events.json → rules) in a disclosure. TODO rules → "announced soon". */
export function RulesDisclosure({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const known = (eventRules[eventId]?.[lang] ?? []).filter((r) => !isTodo(r));

  return (
    <Disclosure
      panelId={`rules-${eventId}`}
      label={t('competitions.rules')}
      icon={<ScrollText size={18} aria-hidden="true" />}
      testId={`rules-toggle-${eventId}`}
      panelTestId={`rules-${eventId}`}
    >
      {known.length ? <RuleList items={known} /> : <p className="text-ivory-300">{t('competitions.rulesTba')}</p>}
    </Disclosure>
  );
}
