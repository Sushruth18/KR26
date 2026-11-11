import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { site } from '../lib/data';

function setMeta(selector: string, create: () => HTMLElement, attr: 'content' | 'href', value: string) {
  let el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const metaTag = (key: 'name' | 'property', value: string) => () => {
  const m = document.createElement('meta');
  m.setAttribute(key, value);
  return m;
};

/**
 * Sets <title>, the meta description, canonical, og:url and the social title/description for the current
 * route, in the current language. The static tags in index.html cover crawlers that do not run JS; this
 * keeps the live DOM right for the browser tab, bookmarks and in-app shares.
 * `noindex` is for pages that must stay out of search (the personal pass page, the 404).
 */
export function useDocumentMeta(titleKey: string, descriptionKey: string, options: { noindex?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const title = t(titleKey);
  const description = t(descriptionKey);
  const wordmark = t('brand.wordmark');
  const noindex = options.noindex ?? false;

  useEffect(() => {
    const fullTitle = title.includes(wordmark) ? title : `${title} | ${wordmark}`;
    const url = `${site.siteUrl}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
    document.title = fullTitle;
    setMeta('meta[name="description"]', metaTag('name', 'description'), 'content', description);
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url);
    setMeta('meta[property="og:url"]', metaTag('property', 'og:url'), 'content', url);
    setMeta('meta[property="og:title"]', metaTag('property', 'og:title'), 'content', fullTitle);
    setMeta('meta[property="og:description"]', metaTag('property', 'og:description'), 'content', description);
    setMeta('meta[name="twitter:title"]', metaTag('name', 'twitter:title'), 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', metaTag('name', 'twitter:description'), 'content', description);
    setMeta('meta[property="og:locale"]', metaTag('property', 'og:locale'), 'content', i18n.language === 'en' ? 'en_IN' : 'kn_IN');
    const robots = document.querySelector('meta[name="robots"]');
    if (noindex) setMeta('meta[name="robots"]', metaTag('name', 'robots'), 'content', 'noindex');
    else robots?.remove();
  }, [title, description, wordmark, pathname, noindex, i18n.language]);
}
