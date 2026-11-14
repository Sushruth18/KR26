import type { RegistrationValues } from '../../lib/validation';
import type { CompetitionEvent } from '../../lib/schemas';

export type StepId = 'event' | 'details' | 'team' | 'review';

export function stepsFor(event: CompetitionEvent | undefined): StepId[] {
  return event && event.teamSize.max > 1 ? ['event', 'details', 'team', 'review'] : ['event', 'details', 'review'];
}

type FieldName = keyof RegistrationValues;

export const STEP_FIELDS: Record<StepId, FieldName[]> = {
  event: ['eventId'],
  details: ['name', 'id', 'department', 'departmentOther', 'semester', 'phone', 'email'],
  team: ['teamName', 'members'],
  review: ['eligibilityConfirmed', 'consentRules'],
};

/** Which step owns a field path such as "phone" or "members.2.id" (from client or server errors). */
export function stepOfField(path: string): StepId {
  const root = path.split('.')[0] as FieldName;
  for (const step of Object.keys(STEP_FIELDS) as StepId[]) {
    if (STEP_FIELDS[step].includes(root)) return step;
  }
  return 'review';
}
