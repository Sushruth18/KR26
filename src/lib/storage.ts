type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getItem(kind: Kind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setItem(kind: Kind, key: string, value: string): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    /* storage unavailable or full — the app must work without it */
  }
}

export function removeItem(kind: Kind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
