/**
 * Replaces %SITE_URL% in index.html with site.json → siteUrl (dev and build), so canonical, og:url and
 * the absolute og:image/twitter:image URLs live in the static HTML that crawlers read without running JS.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { siteSchema } from '../src/lib/schemas';

export function siteUrl(): Plugin {
  const url = siteSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/site.json'), 'utf8'))).siteUrl;
  return {
    name: 'kr26-site-url',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', url) },
  };
}
