import {
  arSA,
  bgBG,
  bnIN,
  csCZ,
  elGR,
  enUS,
  esES,
  faIR,
  frFR,
  heIL,
  hiIN,
  huHU,
  idID,
  itIT,
  jaJP,
  kkKZ,
  koKR,
  msMY,
  nlNL,
  plPL,
  ptBR,
  roRO,
  ruRU,
  srRS,
  svSE,
  thTH,
  trTR,
  ukUA,
  viVN,
  zhCN,
  zhTW,
  deDE,
  daDK,
  fiFI,
  skSK,
  hrHR,
  mnMN,
  beBY,
  caES,
  isIS,
} from '@clerk/localizations';

import type { Locale } from '../../i18n/locales';

/**
 * A interface do Clerk — telas de entrar, cadastrar e conta — no idioma do
 * site.
 *
 * O Clerk traz a maior parte dos idiomas prontos; o que este arquivo faz é
 * amarrar cada código do catálogo à variante que ele mantém. Não há tradução
 * nossa aqui, e é de propósito: os textos das telas de autenticação mudam a
 * cada versão do componente, e traduzir por fora seria correr atrás deles.
 *
 * `ptBR` e não `ptPT` pela mesma razão dos documentos legais: o produto é
 * brasileiro, e o português do catálogo também.
 *
 * Fase 1: `sw`, `ur` e `am` não existem em `@clerk/localizations` — caem no
 * inglês (`enUS`) até o Clerk publicar esses pacotes.
 *
 * Fase 2: `my`, `uz`, `ne`, `ps`, `so`, `az`, `mg`, `si`, `km`, `rw`, `ht`
 * também caem no inglês; `hu`, `kk`, `sv` e `bg` usam o pacote nativo.
 *
 * Fase 3: `da`, `fi`, `sk`, `hr` e `mn` usam o pacote nativo; `ka`, `lo`, `hy`,
 * `lt`, `sq`, `sl`, `ti`, `lv`, `bs` e `rn` caem no inglês.
 *
 * Fase 4: `be`, `ca` e `is` usam o pacote nativo; `et`, `tg`, `mk`, `tk`, `ky`,
 * `nn`, `lb`, `dz`, `mt` e `dv` caem no inglês.
 *
 * Variantes V1: `zh-Hant` usa `zhTW` (Traditional Chinese / Taiwan).
 */
export const CLERK_LOCALIZATIONS: Record<Locale, typeof ptBR> = {
  pt: ptBR,
  en: enUS,
  es: esES,
  fr: frFR,
  it: itIT,
  de: deDE,
  nl: nlNL,
  ru: ruRU,
  zh: zhCN,
  'zh-Hant': zhTW,
  ja: jaJP,
  ko: koKR,
  ar: arSA,
  hi: hiIN,
  sw: enUS, // Clerk sem Kiswahili — fallback EN
  id: idID,
  ms: msMY,
  bn: bnIN,
  ur: enUS, // Clerk sem Urdu — fallback EN
  tr: trTR,
  vi: viVN,
  ro: roRO,
  uk: ukUA,
  el: elGR,
  pl: plPL,
  th: thTH,
  fa: faIR,
  sr: srRS,
  am: enUS, // Clerk sem Amárico — fallback EN
  cs: csCZ,
  he: heIL,
  my: enUS, // Clerk sem Burmese — fallback EN
  uz: enUS, // Clerk sem Uzbek — fallback EN
  ne: enUS, // Clerk sem Nepali — fallback EN
  hu: huHU,
  kk: kkKZ,
  ps: enUS, // Clerk sem Pashto — fallback EN
  so: enUS, // Clerk sem Somali — fallback EN
  sv: svSE,
  az: enUS, // Clerk sem Azerbaijani — fallback EN
  mg: enUS, // Clerk sem Malagasy — fallback EN
  si: enUS, // Clerk sem Sinhala — fallback EN
  km: enUS, // Clerk sem Khmer — fallback EN
  rw: enUS, // Clerk sem Kinyarwanda — fallback EN
  ht: enUS, // Clerk sem Haitian Creole — fallback EN
  bg: bgBG,
  da: daDK,
  fi: fiFI,
  sk: skSK,
  hr: hrHR,
  ka: enUS, // Clerk sem Georgian — fallback EN
  mn: mnMN,
  lo: enUS, // Clerk sem Lao — fallback EN
  hy: enUS, // Clerk sem Armenian — fallback EN
  lt: enUS, // Clerk sem Lithuanian — fallback EN
  sq: enUS, // Clerk sem Albanian — fallback EN
  sl: enUS, // Clerk sem Slovenian — fallback EN
  ti: enUS, // Clerk sem Tigrinya — fallback EN
  lv: enUS, // Clerk sem Latvian — fallback EN
  bs: enUS, // Clerk sem Bosnian — fallback EN
  rn: enUS, // Clerk sem Kirundi — fallback EN
  et: enUS, // Clerk sem Estonian — fallback EN
  tg: enUS, // Clerk sem Tajik — fallback EN
  mk: enUS, // Clerk sem Macedonian — fallback EN
  be: beBY,
  tk: enUS, // Clerk sem Turkmen — fallback EN
  ky: enUS, // Clerk sem Kyrgyz — fallback EN
  nn: enUS, // Clerk sem Norwegian Nynorsk — fallback EN
  lb: enUS, // Clerk sem Luxembourgish — fallback EN
  dz: enUS, // Clerk sem Dzongkha — fallback EN
  mt: enUS, // Clerk sem Maltese — fallback EN
  is: isIS,
  dv: enUS, // Clerk sem Divehi — fallback EN
  ca: caES,
};

/**
 * As cores da marca dentro dos componentes do Clerk. Os valores são os do
 * `globals.css`; o Clerk não lê variáveis de CSS do site, então vão por aqui.
 */
export const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#f5b60d',
    colorForeground: '#ffffff',
    colorBackground: '#122b44',
    colorInput: '#0d2137',
    colorInputForeground: '#ffffff',
    colorMutedForeground: '#93a9c0',
    colorNeutral: '#ffffff',
    colorDanger: '#e5645b',
    colorSuccess: '#4fb477',
    borderRadius: '0.6rem',
    fontFamily: 'var(--font-body), system-ui, sans-serif',
  },
} as const;
