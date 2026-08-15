import type { Locale } from '../../i18n/locales';

/**
 * O código de idioma no formato que o Open Graph exige: `idioma_TERRITÓRIO`.
 *
 * Não é o mesmo código do `hreflang`, e a diferença é deliberada. O `hreflang`
 * declara para **quem** a página serve, e ali o código puro é o certo: a
 * tradução é para o idioma, não para um país. O Open Graph declara em que
 * variante o texto está escrito, e o formato dele não aceita idioma sozinho —
 * o Facebook descarta o valor e cai no padrão, que é `en_US`.
 *
 * O território escolhido é o da variante em que o texto foi de fato escrito, e
 * não o país mais populoso do idioma. `pt_BR` porque o texto é brasileiro;
 * `es_ES` porque o espanhol foi escrito na norma peninsular.
 */
export const OG_LOCALES: Record<Locale, string> = {
  pt: 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  de: 'de_DE',
  nl: 'nl_NL',
  ru: 'ru_RU',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  // O Facebook usa `ar_AR` para o árabe, sem território real — é o código que
  // ele reconhece.
  ar: 'ar_AR',
};
