/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF, BOM) — no dependency needed for one form export. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // drop a BOM
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export interface FormRow {
  /** 1-based line in the CSV (for messages — never printed with personal data). */
  line: number;
  name: string;
  role: string;
  email: string;
  photoUrl: string;
  /** undefined when the form has no such column. */
  consent: string | undefined;
  linkedin: string;
  instagram: string;
}

export interface ParsedForm {
  rows: FormRow[];
  /** Which optional columns the form export has — the report says so when one is missing. */
  columns: { consent: boolean; linkedin: boolean; instagram: boolean };
}

const pick = (header: string[], re: RegExp, not?: RegExp) =>
  header.findIndex((h) => re.test(h) && !(not && not.test(h)));

/** Finds the columns by their header text, so reordered or extra columns in a new export still work. */
export function parseTeamForm(text: string): ParsedForm {
  const table = parseCsv(text);
  const header = (table[0] ?? []).map((h) => h.trim());
  const col = {
    name: pick(header, /name/i, /user/i),
    role: pick(header, /role/i),
    email: pick(header, /e-?mail/i),
    photo: pick(header, /photo|picture|image/i),
    consent: pick(header, /consent|agree|permission/i),
    linkedin: pick(header, /linked\s*in/i),
    instagram: pick(header, /insta/i),
  };
  for (const need of ['name', 'role'] as const) {
    if (col[need] === -1) throw new Error(`The CSV has no "${need}" column (headers: ${header.join(' | ')})`);
  }
  const cell = (r: string[], i: number) => (i === -1 ? '' : (r[i] ?? '').trim());
  const rows = table.slice(1).map<FormRow>((r, i) => ({
    line: i + 2,
    name: cell(r, col.name).replace(/\s+/g, ' '),
    role: cell(r, col.role),
    email: cell(r, col.email).toLowerCase(),
    photoUrl: cell(r, col.photo),
    consent: col.consent === -1 ? undefined : cell(r, col.consent),
    linkedin: cell(r, col.linkedin),
    instagram: cell(r, col.instagram),
  }));
  return { rows, columns: { consent: col.consent !== -1, linkedin: col.linkedin !== -1, instagram: col.instagram !== -1 } };
}

/** A ticked consent box exports its option text; an empty cell or an explicit no/false means "not given". */
export function hasConsent(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v !== '' && !/^(no|n|false|0|unchecked|not? .*|i do not.*|i don't.*|disagree.*)$/.test(v);
}
