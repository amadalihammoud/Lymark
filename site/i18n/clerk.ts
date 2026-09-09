import {
  arSA,
  bnIN,
  csCZ,
  elGR,
  enUS,
  esES,
  faIR,
  frFR,
  heIL,
  hiIN,
  idID,
  itIT,
  jaJP,
  koKR,
  msMY,
  nlNL,
  plPL,
  ptBR,
  roRO,
  ruRU,
  srRS,
  thTH,
  trTR,
  ukUA,
  viVN,
  zhCN,
  deDE,
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
