/**
 * Build-only Vite plugin: starts the LCP-critical downloads during HTML parsing instead of after the
 * main bundle has run (measured on throttled 4G: the hero heading waited on a ~1.4 s chain otherwise).
 *  - Fonts: the display + body faces for the visitor's language (read from localStorage, default kn).
 *  - Home route: modulepreload the lazy Home chunk and its not-yet-loaded imports — only on "/", so a
 *    deep link to /register does not pay for it. Routes stay React.lazy (CLAUDE.md §4).
 */
import type { Plugin } from 'vite';

const FONTS = {
  kn: ['baloo-tamma-2-kannada-700-normal'],
  en: ['cinzel-latin-700-normal'],
};

export function preloadCritical(): Plugin {
  return {
    name: 'kr26-preload-critical',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.values(ctx.bundle ?? {});
        const url = (fileName: string) => `/${fileName}`;
        const font = (stem: string) => {
          const f = files.find((x) => x.type === 'asset' && x.fileName.includes(stem) && x.fileName.endsWith('.woff2'));
          if (!f) throw new Error(`[preload-critical] font not found in bundle: ${stem}`);
          return url(f.fileName);
        };
        const chunks = files.filter((x) => x.type === 'chunk');
        const entry = chunks.find((c) => c.isEntry);
        const home = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/pages/Home.tsx'));
        if (!entry || !home) throw new Error('[preload-critical] entry or Home chunk not found');
        // Everything Home pulls in (transitively) that the entry's own preloads don't already cover.
        const loaded = new Set([entry.fileName, ...entry.imports]);
        const byName = new Map(chunks.map((c) => [c.fileName, c]));
        const homeSet = new Set<string>();
        const walk = (name: string) => {
          if (loaded.has(name) || homeSet.has(name)) return;
          homeSet.add(name);
          byName.get(name)?.imports.forEach(walk);
        };
        walk(home.fileName);
        const homeFiles = [...homeSet].map(url);
        const config = JSON.stringify({ kn: FONTS.kn.map(font), en: FONTS.en.map(font), home: homeFiles });
        const script = `<script>(function(c){var en=false;try{en=localStorage.getItem('kr26.lang')==='en'}catch(e){}function add(h,m){var l=document.createElement('link');if(m){l.rel='modulepreload';l.crossOrigin=''}else{l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin=''}l.href=h;document.head.appendChild(l)}(en?c.en:c.kn).forEach(function(h){add(h,false)});if(location.pathname==='/')c.home.forEach(function(h){add(h,true)})})(${config})</script>`;
        return html.replace('<meta name="theme-color"', `${script}\n    <meta name="theme-color"`);
      },
    },
  };
}
