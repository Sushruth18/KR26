import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import kn from './kn.json';
import en from './en.json';
import { getItem, setItem } from '../lib/storage';
import type { Lang } from '../lib/format';

export const LANG_KEY = 'kr26.lang';

function initialLang(): Lang {
  return getItem('local', LANG_KEY) === 'en' ? 'en' : 'kn';
}

function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
}

const start = initialLang();

void i18n.use(initReactI18next).init({
  resources: { kn: { translation: kn }, en: { translation: en } },
  lng: start,
  fallbackLng: 'kn',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyLang(start);

export function setLanguage(lang: Lang) {
  setItem('local', LANG_KEY, lang);
  applyLang(lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
