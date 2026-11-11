import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { generalRules } from 'virtual:competition-rules';
import { useLang } from '../../hooks/useLang';
import { Disclosure, RuleList } from '../ui/Disclosure';

/** "General instructions" that apply to every competition (site.json → generalRules). */
export function GeneralInstructions({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const lang = useLang();

  return (
    <Disclosure
      panelId="general-rules"
      label={t('competitions.generalRules')}
      icon={<Info size={18} aria-hidden="true" />}
      testId="general-rules-toggle"
      panelTestId="general-rules"
      className={className}
    >
      <RuleList items={generalRules[lang]} />
    </Disclosure>
  );
}
