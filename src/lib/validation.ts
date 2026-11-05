/**
 * Client-side registration rules. Mirrors validate_() in apps-script/Code.gs — both read the same
 * RULES (src/lib/rules.ts) and site.json lists, and `npm run test:server` checks the normalisers match.
 * Error messages are i18n keys (rendered in the current language by the form).
 */
import { z } from 'zod';
import { OTHER_DEPARTMENT, RULES } from './rules';
import type { CompetitionEvent, SiteConfig } from './schemas';

// ---------- normalisers (identical to normText_/normId_/normPhone_/normEmail_ in Code.gs) ----------
export const normText = (v: unknown) => String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
export const normId = (v: unknown) => normText(v).replace(/\s+/g, '').toUpperCase();
export function normPhone(v: unknown) {
  let s = String(v ?? '').replace(/[^\d+]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.length === 12 && s.startsWith('91')) s = s.slice(2);
  else if (s.length === 11 && s.startsWith('0')) s = s.slice(1);
  return s;
}
export const normEmail = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase();

// ---------- single-field checks ----------
const test = (pattern: string, s: string) => new RegExp(pattern).test(s);
export const isValidName = (s: string) =>
  s.length >= RULES.name.min && s.length <= RULES.name.max && test(RULES.name.pattern, s);
export const isValidPhone = (s: string) => test(RULES.phone.pattern, s);
export const isValidEmail = (s: string) => s.length <= RULES.email.max && test(RULES.email.pattern, s);
export function isValidId(s: string, category: CompetitionEvent['category']) {
  if (category === 'students') return s.length >= 1 && s.length <= RULES.usn.max;
  return s.length >= 1 && s.length <= RULES.empId.max && test(RULES.empId.pattern, s);
}
export function semestersFor(site: SiteConfig, department: string): number[] {
  return site.semesters.byDepartment[department] ?? site.semesters.default;
}

// ---------- form shape ----------
export interface MemberValues {
  name: string;
  id: string;
  phone: string;
}

export interface RegistrationValues {
  eventId: string;
  name: string;
  id: string;
  department: string;
  departmentOther: string;
  semester: string;
  phone: string;
  email: string;
  teamName: string;
  members: MemberValues[];
  consentRules: boolean;
  consentPhoto: boolean;
  /** Honeypot — real users never see or fill it. */
  website: string;
}

export const emptyMember = (): MemberValues => ({ name: '', id: '', phone: '' });

export function emptyRegistration(eventId = ''): RegistrationValues {
  return {
    eventId,
    name: '',
    id: '',
    department: '',
    departmentOther: '',
    semester: '',
    phone: '',
    email: '',
    teamName: '',
    members: [],
    consentRules: false,
    consentPhoto: false,
    website: '',
  };
}

const memberShape = z.object({ name: z.string(), id: z.string(), phone: z.string() });
const shape = z.object({
  eventId: z.string(),
  name: z.string(),
  id: z.string(),
  department: z.string(),
  departmentOther: z.string(),
  semester: z.string(),
  phone: z.string(),
  email: z.string(),
  teamName: z.string(),
  members: z.array(memberShape),
  consentRules: z.boolean(),
  consentPhoto: z.boolean(),
  website: z.string(),
});

/** Builds the schema for the chosen event (category + team size change the rules). */
export function registrationSchema(event: CompetitionEvent | undefined, site: SiteConfig) {
  return shape.superRefine((v, ctx) => {
    const add = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    if (!event) return add(['eventId'], 'errors.event');

    const required = (path: string, raw: string, ok: boolean, key: string) => {
      if (!normText(raw)) add([path], 'errors.required');
      else if (!ok) add([path], key);
    };
    required('name', v.name, isValidName(normText(v.name)), 'errors.name');
    required('id', v.id, isValidId(normId(v.id), event.category), event.category === 'students' ? 'errors.usn' : 'errors.empId');

    const dept = normText(v.department);
    if (!dept) add(['department'], 'errors.department');
    else if (dept === OTHER_DEPARTMENT) {
      const o = normText(v.departmentOther);
      if (o.length < RULES.departmentOther.min || o.length > RULES.departmentOther.max || !test(RULES.name.pattern, o)) {
        add(['departmentOther'], 'errors.departmentOther');
      }
    } else if (!site.departments.includes(dept)) add(['department'], 'errors.department');

    if (event.category === 'students' && !semestersFor(site, dept).includes(Number(v.semester))) {
      add(['semester'], 'errors.semester');
    }
    required('phone', v.phone, isValidPhone(normPhone(v.phone)), 'errors.phone');
    required('email', v.email, isValidEmail(normEmail(v.email)), 'errors.email');

    if (event.teamSize.max > 1) {
      const tn = normText(v.teamName);
      if (tn.length < RULES.teamName.min || tn.length > RULES.teamName.max || !test(RULES.teamName.pattern, tn)) {
        add(['teamName'], 'errors.teamName');
      }
      const total = v.members.length + 1;
      if (total < event.teamSize.min || total > event.teamSize.max) add(['members'], 'errors.teamSize');
      const seen = new Set([normId(v.id)]);
      v.members.forEach((m, i) => {
        required(`members.${i}.name`, m.name, isValidName(normText(m.name)), 'errors.name');
        const mid = normId(m.id);
        if (!mid) add(['members', i, 'id'], 'errors.required');
        else if (!isValidId(mid, event.category)) {
          add(['members', i, 'id'], event.category === 'students' ? 'errors.usn' : 'errors.empId');
        } else if (seen.has(mid)) add(['members', i, 'id'], 'errors.memberDuplicate');
        seen.add(mid);
        required(`members.${i}.phone`, m.phone, isValidPhone(normPhone(m.phone)), 'errors.phone');
      });
    }

    if (!v.consentRules) add(['consentRules'], 'errors.consentRules');
  });
}

// ---------- payload ----------
export interface RegisterPayload {
  action: 'register';
  eventId: string;
  name: string;
  id: string;
  department: string;
  departmentOther: string;
  semester: number | null;
  phone: string;
  email: string;
  teamName: string;
  members: MemberValues[];
  consentRules: boolean;
  consentPhoto: boolean;
  website: string;
  elapsedMs: number;
  lang: 'kn' | 'en';
}

export function toPayload(v: RegistrationValues, event: CompetitionEvent, elapsedMs: number, lang: 'kn' | 'en'): RegisterPayload {
  const team = event.teamSize.max > 1;
  const dept = normText(v.department);
  return {
    action: 'register',
    eventId: event.id,
    name: normText(v.name),
    id: normId(v.id),
    department: dept,
    departmentOther: dept === OTHER_DEPARTMENT ? normText(v.departmentOther) : '',
    semester: event.category === 'students' ? Number(v.semester) : null,
    phone: normPhone(v.phone),
    email: normEmail(v.email),
    teamName: team ? normText(v.teamName) : '',
    members: team ? v.members.map((m) => ({ name: normText(m.name), id: normId(m.id), phone: normPhone(m.phone) })) : [],
    consentRules: v.consentRules,
    consentPhoto: v.consentPhoto,
    website: v.website,
    elapsedMs: Math.round(elapsedMs),
    lang,
  };
}
