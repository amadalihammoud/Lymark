// desktop/i18n/index.ts
import pt from './pt.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import de from './de.json';
import nl from './nl.json';
import ru from './ru.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import ar from './ar.json';

export const translations = {
  pt,
  en,
  es,
  fr,
  it,
  de,
  nl,
  ru,
  zh,
  ja,
  ko,
  ar,
} as const;

export const supportedLocales = Object.keys(translations) as Array<keyof typeof translations>;
export const defaultLocale = 'pt' as const;

export type Locale = keyof typeof translations;
export type TranslationKeys = keyof typeof translations[typeof defaultLocale];

export function getTranslation(locale: Locale, key: string): string {
  const lang = translations[locale];
  const keys = key.split('.') as Array<keyof typeof lang>;
  let value: any = lang;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  return value as string;
}

export function getCurrentLocale(): Locale {
  // No Electron, podemos pegar do localStorage ou do navigator.language
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lymark-locale') as Locale | null;
    if (saved && supportedLocales.includes(saved)) {
      return saved;
    }
    const browserLang = navigator.language.split('-')[0] as Locale;
    if (supportedLocales.includes(browserLang)) {
      return browserLang;
    }
  }
  return defaultLocale;
}

export function setCurrentLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lymark-locale', locale);
  }
}
