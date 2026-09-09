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
 *
 * As Fases 1 (hi…he), 2 (my…bg) e 3 (da…rn) ampliam o catálogo sem reordenar
 * os doze originais.
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
  'hi',
  'sw',
  'id',
  'ms',
  'bn',
  'ur',
  'tr',
  'vi',
  'ro',
  'uk',
  'el',
  'pl',
  'th',
  'fa',
  'sr',
  'am',
  'cs',
  'he',
  'my',
  'uz',
  'ne',
  'hu',
  'kk',
  'ps',
  'so',
  'sv',
  'az',
  'mg',
  'si',
  'km',
  'rw',
  'ht',
  'bg',
  'da',
  'fi',
  'sk',
  'hr',
  'ka',
  'mn',
  'lo',
  'hy',
  'lt',
  'sq',
  'sl',
  'ti',
  'lv',
  'bs',
  'rn',
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
  hi: 'हिन्दी',
  sw: 'Kiswahili',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  bn: 'বাংলা',
  ur: 'اردو',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  ro: 'Română',
  uk: 'Українська',
  el: 'Ελληνικά',
  pl: 'Polski',
  th: 'ไทย',
  fa: 'فارسی',
  sr: 'Српски',
  am: 'አማርኛ',
  cs: 'Čeština',
  he: 'עברית',
  my: 'မြန်မာ',
  uz: 'Oʻzbekcha',
  ne: 'नेपाली',
  hu: 'Magyar',
  kk: 'Қазақша',
  ps: 'پښتو',
  so: 'Soomaali',
  sv: 'Svenska',
  az: 'Azərbaycan',
  mg: 'Malagasy',
  si: 'සිංහල',
  km: 'ខ្មែរ',
  rw: 'Ikinyarwanda',
  ht: 'Kreyòl ayisyen',
  bg: 'Български',
  da: 'Dansk',
  fi: 'Suomi',
  sk: 'Slovenčina',
  hr: 'Hrvatski',
  ka: 'ქართული',
  mn: 'Монгол',
  lo: 'ລາວ',
  hy: 'Հայերեն',
  lt: 'Lietuvių',
  sq: 'Shqip',
  sl: 'Slovenščina',
  ti: 'ትግርኛ',
  lv: 'Latviešu',
  bs: 'Bosanski',
  rn: 'Ikirundi',
};

/**
 * A ordem em que os idiomas se oferecem para escolha — no seletor do site e na
 * tela de idioma do aplicativo.
 *
 * Separada de `LOCALES` porque as duas ordens respondem a perguntas diferentes.
 * `LOCALES` é a ordem canônica do catálogo, e a de `hreflang` e do mapa do
 * site, onde ordem nenhuma é lida por gente. Esta é lida por gente, e a única
 * propriedade que ajuda quem procura o próprio idioma numa lista é
 * poder parar de procurar: em ordem alfabética, quem busca "Nederlands" sabe
 * onde olhar sem ler as outras. A ordem por alcance decrescente, que era a
 * usada, obriga a ler a lista inteira.
 *
 * Ordenada pelo nome que cada idioma dá a si mesmo, comparando **ponto de
 * código** e não com `localeCompare`: o `Intl` varia com o ICU embarcado em
 * cada build, e a lista sairia numa ordem em um aparelho e noutra em outro. A
 * comparação crua é estável em qualquer motor — e, como os alfabetos ocupam
 * faixas contíguas do Unicode, ela agrupa por escrita de graça: primeiro o
 * latim, depois cirílico, árabe e as três do Extremo Oriente.
 *
 * Derivada de `LOCALES` em vez de escrita à mão para não poder divergir dela.
 * Uma lista paralela é uma lista que um dia esquece um idioma — e o idioma
 * esquecido não apareceria no seletor, sem nada acusar.
 */
export const LOCALES_BY_NAME: readonly Locale[] = [...LOCALES].sort((a, b) =>
  LOCALE_NAMES[a] < LOCALE_NAMES[b] ? -1 : 1,
);

/**
 * Idiomas escritos da direita para a esquerda.
 *
 * O árabe não precisa apenas de tradução: precisa que o layout inteiro
 * espelhe. Onde isso está, hoje:
 *
 * - **Site, web e desktop: feito.** O documento recebe `dir="rtl"`, e a partir
 *   dele o navegador espelha sozinho todo `flexDirection: 'row'` e as
 *   propriedades lógicas (`marginStart`, `paddingStart`). Verificado com o
 *   navegador em `ar-SA`: ícones à direita, valores à esquerda, seta de
 *   navegação apontando para a esquerda.
 * - **Android e iOS: pendente.** O React Native não olha a direção do
 *   documento — quem decide é o `I18nManager`. Ele já respeita o aparelho
 *   configurado em árabe, que é o caso comum; o que falta é trocar para árabe
 *   **dentro** do app num aparelho configurado em outra língua. `forceRTL`
 *   resolve, mas só passa a valer depois de reiniciar o aplicativo, e isso é
 *   decisão de produto: pedir "feche e abra de novo" no meio de uma vistoria
 *   é diferente de pedir na tela de idioma.
 *
 * Fase 1 acrescenta hebraico (`he`), urdu (`ur`) e persa (`fa`); a Fase 2
 * acrescenta pashto (`ps`) — a mesma regra de `dir="rtl"` no documento.
 * A Fase 3 não acrescenta RTL: o tigrínia (`ti`) usa escrita etíope LTR.
 *
 * O que NÃO deve espelhar, e por isso não usa propriedade lógica: a marca
 * desenhada em `wordmark.tsx`. Um logotipo é o mesmo em toda língua.
 */
export const RTL_LOCALES: readonly Locale[] = ['ar', 'he', 'ur', 'fa', 'ps'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
