import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ApiError } from '../../lib/api';
import { Button, LinkButton } from '../ui/Button';
import { messageKey } from './submitMessage';

const RETRYABLE = new Set(['NETWORK', 'SERVER', 'FORM']);

interface Props {
  error: ApiError;
  onRetry: () => void;
  retrying: boolean;
}

export function SubmitAlert({ error, onRetry, retrying }: Props) {
  const { t } = useTranslation();
  const key = messageKey(error);
  const kind = key.slice('submit.'.length);
  const canRetry = RETRYABLE.has(kind) || kind === 'BUSY';

  return (
    <div role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-4" data-testid="submit-error" data-code={error.code}>
      <p className="flex items-start gap-2">
        <AlertTriangle size={20} className="mt-0.5 flex-none text-danger" aria-hidden="true" />
        <span>{t(key)}</span>
      </p>
      {error.code === 'DUPLICATE' && error.regId && (
        <p className="mt-3">
          <span className="text-ivory-300">{t('submit.existingId')}: </span>
          <strong className="whitespace-nowrap font-mono text-lg tracking-wide text-gold-300" lang="en" data-testid="existing-reg-id">
            {error.regId}
          </strong>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {canRetry && (
          <Button variant="maroon" onClick={onRetry} loading={retrying} data-testid="retry">
            {!retrying && <RotateCcw size={18} aria-hidden="true" />}
            {t('common.retry')}
          </Button>
        )}
        {error.code === 'DUPLICATE' && (
          <LinkButton to="/register/success?lookup=1" variant="primary">
            {t('submit.findPass')}
          </LinkButton>
        )}
        {(error.code === 'FULL' || error.code === 'CLOSED') && (
          <LinkButton to="/competitions" variant="ghost">
            {t('submit.otherEvents')}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
