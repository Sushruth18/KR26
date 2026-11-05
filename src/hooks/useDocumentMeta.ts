import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Sets <title> and the meta description for the current route, in the current language. */
export function useDocumentMeta(titleKey: string, descriptionKey: string) {
  const { t, i18n } = useTranslation();
  const title = t(titleKey);
  const description = t(descriptionKey);
  const wordmark = t('brand.wordmark');

  useEffect(() => {
    document.title = title.includes(wordmark) ? title : `${title} | ${wordmark}`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
    const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (og) og.content = document.title;
    const ogd = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogd) ogd.content = description;
  }, [title, description, wordmark, i18n.language]);
}
