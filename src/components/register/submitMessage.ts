import type { ApiError } from '../../lib/api';

/** Maps a backend error to the i18n key shown to the user. */
export function messageKey(e: ApiError): string {
  if (e.code === 'CLOSED') return e.reason === 'DEADLINE' ? 'submit.DEADLINE' : 'submit.NOT_OPEN';
  if (e.code === 'SERVER' && e.reason === 'BUSY') return 'submit.BUSY';
  if (e.code === 'VALIDATION' && (!e.field || e.field === 'form' || e.field === 'body')) return 'submit.FORM';
  if (['NETWORK', 'SERVER', 'DUPLICATE', 'VALIDATION', 'CONFIG'].includes(e.code)) return `submit.${e.code}`;
  return 'submit.SERVER';
}
