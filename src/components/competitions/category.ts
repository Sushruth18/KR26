import type { CompetitionEvent } from '../../lib/schemas';

export type Category = CompetitionEvent['category'];
export const CATEGORIES: readonly Category[] = ['students', 'faculty'];

/** `?for=` value → category; anything else falls back to students. */
export const parseCategory = (v: string | null): Category => (CATEGORIES.includes(v as Category) ? (v as Category) : 'students');
