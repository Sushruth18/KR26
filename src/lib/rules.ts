/**
 * Validation rules shared by the browser (src/lib/validation.ts), the Apps Script server
 * (copied into the generated apps-script/Config.gs) and the local mock. Change them here only.
 * Patterns are strings so they can be embedded in Config.gs verbatim.
 */
export const RULES = {
  /** Letters (Latin or Kannada, incl. vowel signs and ZWJ/ZWNJ used in conjuncts), spaces and "." */
  name: { pattern: '^[A-Za-z\\u0C80-\\u0CFF\\u200C\\u200D. ]+$', min: 2, max: 60 },
  /** Employee ID after normalising (spaces removed, upper-cased). */
  empId: { pattern: '^[A-Z0-9]+$', max: 20 },
  phone: { pattern: '^[6-9]\\d{9}$' },
  email: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$', max: 100 },
  teamName: { pattern: "^[A-Za-z0-9\\u0C80-\\u0CFF\\u200C\\u200D.&' -]+$", min: 2, max: 40 },
  /** Free-text department when "Other" is chosen; uses the name pattern. */
  departmentOther: { min: 2, max: 40 },
} as const;

export const OTHER_DEPARTMENT = 'Other';
