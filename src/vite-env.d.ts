/// <reference types="vite/client" />

/** Rule lists split out of events.json / site.json by scripts/vite-plugin-split-rules.ts (lazy, not in the entry). */
declare module 'virtual:competition-rules' {
  type BilingualList = { kn: string[]; en: string[] };
  /** events.json → rules, by event id. */
  export const eventRules: Record<string, BilingualList>;
  /** site.json → generalRules. */
  export const generalRules: BilingualList;
}
