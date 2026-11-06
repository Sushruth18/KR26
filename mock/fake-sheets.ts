/**
 * Minimal in-memory stand-ins for the Google services Code.gs uses. They model the behaviour that
 * matters for correctness: number formats, numeric coercion, formula detection, the script lock.
 */

export type Cell = string | number | boolean | { formula: string };

function isFormula(c: Cell): c is { formula: string } {
  return typeof c === 'object' && c !== null && 'formula' in c;
}

export class FakeRange {
  constructor(
    private sheet: FakeSheet,
    private row: number,
    private col: number,
    private nr: number,
    private nc: number,
  ) {}

  private each<T>(fn: (r: number, c: number) => T): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < this.nr; i++) {
      const line: T[] = [];
      for (let j = 0; j < this.nc; j++) line.push(fn(this.row + i, this.col + j));
      out.push(line);
    }
    return out;
  }

  getValues(): unknown[][] {
    this.sheet.checkThrow();
    return this.each((r, c) => {
      const v = this.sheet.get(r, c);
      return isFormula(v) ? '#FORMULA' : v;
    });
  }

  getDisplayValues(): string[][] {
    this.sheet.checkThrow();
    return this.each((r, c) => {
      const v = this.sheet.get(r, c);
      if (isFormula(v)) return '#FORMULA';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return String(v);
    });
  }

  setValues(values: unknown[][]): this {
    this.sheet.checkThrow();
    if (values.length !== this.nr || values.some((r) => r.length !== this.nc)) {
      throw new Error('The number of rows/columns in the data does not match the range.');
    }
    values.forEach((line, i) => line.forEach((v, j) => this.sheet.write(this.row + i, this.col + j, v)));
    return this;
  }

  setNumberFormat(fmt: string): this {
    this.each((r, c) => this.sheet.setFormat(r, c, fmt));
    return this;
  }

  setFontWeight(): this {
    return this;
  }
}

export class FakeSheet {
  cells: Cell[][] = [];
  formats: string[][] = [];
  throwOnAccess = false;

  /** Rows in the grid, like a new Sheets tab (1000). Grows if more rows are written. */
  private maxRows = 1000;

  constructor(private name: string) {}

  getName() {
    return this.name;
  }

  /** Renaming a tab, as a coordinator does by double-clicking it. */
  setName(n: string) {
    this.name = n;
    return this;
  }

  getMaxRows() {
    return Math.max(this.maxRows, this.cells.length);
  }

  checkThrow() {
    if (this.throwOnAccess) throw new Error('Service Spreadsheets failed while accessing document (simulated).');
  }

  get(r: number, c: number): Cell {
    return this.cells[r - 1]?.[c - 1] ?? '';
  }

  setFormat(r: number, c: number, fmt: string) {
    (this.formats[r - 1] ??= [])[c - 1] = fmt;
  }

  /** Mimics how Sheets stores a written value. */
  write(r: number, c: number, v: unknown) {
    const fmt = this.formats[r - 1]?.[c - 1];
    let cell: Cell;
    if (typeof v === 'string') {
      if (v.startsWith("'")) cell = v.slice(1); // apostrophe = force text, not shown
      else if (v.startsWith('=')) cell = { formula: v }; // worst case: treat as formula even in text format
      else if (fmt !== '@' && /^-?\d+(\.\d+)?$/.test(v)) cell = Number(v); // numeric coercion (loses leading 0s)
      else cell = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      cell = v;
    } else {
      cell = v == null ? '' : String(v);
    }
    (this.cells[r - 1] ??= [])[c - 1] = cell;
  }

  getLastRow() {
    for (let i = this.cells.length - 1; i >= 0; i--) {
      if ((this.cells[i] ?? []).some((v) => v !== '' && v !== undefined)) return i + 1;
    }
    return 0;
  }

  getLastColumn() {
    return this.cells.reduce((m, row) => Math.max(m, row?.length ?? 0), 0);
  }

  getRange(row: number, col: number, nr = 1, nc = 1) {
    return new FakeRange(this, row, col, nr, nc);
  }

  getDataRange() {
    return new FakeRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  deleteRow(r: number) {
    this.cells.splice(r - 1, 1);
    this.formats.splice(r - 1, 1);
  }

  setFrozenRows() {
    return this;
  }

  hasFormula() {
    return this.cells.some((row) => row?.some((c) => isFormula(c)));
  }
}

export class FakeSpreadsheet {
  /** All tabs, in order. Looked up by their CURRENT name, so a renamed tab is found under its new name only. */
  sheets: FakeSheet[] = [];
  getSheetByName(n: string) {
    return this.sheets.find((s) => s.getName() === n) ?? null;
  }
  getSheets() {
    return [...this.sheets];
  }
  /** Like Sheets: inserting a tab whose name is already taken throws. */
  insertSheet(n: string) {
    if (this.getSheetByName(n)) throw new Error(`A sheet with the name "${n}" already exists. Please enter another name.`);
    const s = new FakeSheet(n);
    this.sheets.push(s);
    return s;
  }
  /** Test helper: every cell of every tab, for "nothing changed" comparisons. */
  snapshot() {
    return JSON.stringify(this.sheets.map((s) => [s.getName(), s.cells, s.formats]));
  }
}

export class FakeLock {
  held = false;
  acquired = 0;
  released = 0;
  /** Set true to simulate another execution holding the lock for longer than waitLock's timeout. */
  busy = false;
  waitLock() {
    if (this.busy || this.held) throw new Error('Lock timeout: another process was holding the lock for too long.');
    this.held = true;
    this.acquired++;
  }
  releaseLock() {
    if (this.held) this.released++;
    this.held = false;
  }
  hasLock() {
    return this.held;
  }
}

export class FakeCache {
  private m = new Map<string, { v: string; exp: number }>();
  get(k: string) {
    const e = this.m.get(k);
    if (!e) return null;
    if (Date.now() > e.exp) {
      this.m.delete(k);
      return null;
    }
    return e.v;
  }
  put(k: string, v: string, ttlS = 600) {
    this.m.set(k, { v, exp: Date.now() + ttlS * 1000 });
  }
  remove(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

export interface SentMail {
  to: string;
  subject: string;
  body: string;
}

export class FakeMail {
  sent: SentMail[] = [];
  fail = false;
  quota = 100;
  sendEmail(o: SentMail) {
    if (this.fail) throw new Error('Service invoked too many times for one day: email (simulated).');
    this.sent.push(o);
    this.quota--;
  }
  getRemainingDailyQuota() {
    return this.quota;
  }
}
