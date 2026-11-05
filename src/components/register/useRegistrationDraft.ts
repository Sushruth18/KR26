import { getItem, removeItem, setItem } from '../../lib/storage';
import { emptyRegistration, type RegistrationValues } from '../../lib/validation';

const KEY = 'kr26.regDraft';

export interface Draft {
  values: RegistrationValues;
  step: number;
  /** ms epoch when the form was first opened (for the server's minimum-time check) */
  startedAt: number;
}

export function loadDraft(): Draft | null {
  const raw = getItem('session', KEY);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    if (!d.values || typeof d.startedAt !== 'number') return null;
    // Merge onto an empty form so a draft from an older build never lacks a field.
    const values = { ...emptyRegistration(), ...d.values, website: '' };
    if (!Array.isArray(values.members)) values.members = [];
    return { values, step: typeof d.step === 'number' ? d.step : 0, startedAt: d.startedAt };
  } catch {
    return null;
  }
}

export function saveDraft(d: Draft) {
  // The honeypot is never persisted.
  setItem('session', KEY, JSON.stringify({ ...d, values: { ...d.values, website: '' } }));
}

export function clearDraft() {
  removeItem('session', KEY);
}
