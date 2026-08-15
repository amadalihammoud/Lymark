/**
 * Fonte única dos idiomas do Lymark.
 *
 * Antes existiam três catálogos independentes — um no site (next-intl), um no
 * mobile (i18n-js) e um no desktop — com vocabulários diferentes: 97, 45 e 51
 * chaves. Textos compartilhados já divergiam entre eles, e vários idiomas
 * tinham perdido a acentuação em uma das cópias. Agora há um catálogo só, em
 * `i18n/messages/`, e as três plataformas leem dele.
 *
 * Os namespaces separam o que é de quem:
 *   site.*    — a landing page
 *   app.*     — telas compartilhadas por mobile, web e desktop
 *   desktop.* — o que só existe no Electron (o menu nativo)
 */

/** `pt` é o idioma de origem: é nele que o texto é escrito primeiro. */
export const DEFAULT_LOCALE = 'pt' as const;

/**
 * A ordem é a de exibição no seletor de idioma, não alfabética: primeiro o
 * idioma de origem, depois o alcance decrescente.
 */
export const LOCALES = [
  'pt',
  'en',
  'es',
  'fr',
  'it',
  'de',
  'nl',
  'ru',
  'zh',
  'ja',
  'ko',
  'ar',
] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * O nome de cada idioma escrito no próprio idioma. Quem procura a própria
 * língua numa lista procura pela palavra que conhece — "Deutsch", não "Alemão".
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  nl: 'Nederlands',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
};

/**
 * Idiomas escritos da direita para a esquerda. O árabe não precisa apenas de
 * tradução: precisa que o layout inteiro espelhe. Enquanto isso não estiver
 * feito, esta lista é o que marca a dívida.
 */
export const RTL_LOCALES: readonly Locale[] = ['ar'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
