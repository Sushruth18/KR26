import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock } from 'lucide-react';
import type { ResolvedEvent } from '../../lib/eventState';
import { Button, LinkButton } from '../ui/Button';

interface Props {
  eventId: string;
  name: string;
  resolved: ResolvedEvent;
  loading: boolean;
}

/** Register link when open; otherwise a disabled button with the reason underneath. Skeleton while status loads. */
export function RegisterAction({ eventId, name, resolved, loading }: Props) {
  const { t } = useTranslation();

  if (loading) return <span className="skeleton block h-11 w-full !rounded-full" aria-hidden="true" />;

  if (resolved.canRegister) {
    return (
      <LinkButton
        to={`/register?event=${eventId}`}
        variant="primary"
        className="w-full"
        aria-label={t('competitions.registerFor', { name })}
        data-testid={`register-${eventId}`}
      >
        {t('competitions.register')}
        <ArrowRight size={18} aria-hidden="true" />
      </LinkButton>
    );
  }

  const reasonId = `reason-${eventId}`;
  const reason = t(`competitions.reason.${resolved.state}`);
  return (
    <>
      <Button variant="ghost" className="w-full" disabled aria-describedby={reasonId} data-testid={`register-${eventId}`}>
        <Lock size={16} aria-hidden="true" />
        {t('competitions.register')}
      </Button>
      <p id={reasonId} className="mt-2 text-center text-sm text-ivory-300" data-testid={`reason-${eventId}`}>
        {reason}
      </p>
    </>
  );
}
