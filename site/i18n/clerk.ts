import {
  arSA,
  deDE,
  enUS,
  esES,
  frFR,
  itIT,
  jaJP,
  koKR,
  nlNL,
  ptBR,
  ruRU,
  zhCN,
} from '@clerk/localizations';

import type { Locale } from '../../i18n/locales';

/**
 * A interface do Clerk — telas de entrar, cadastrar e conta — no idioma do
 * site.
 *
 * O Clerk traz os doze idiomas prontos; o que este arquivo faz é só amarrar
 * cada código do catálogo à variante que ele mantém. Não há tradução nossa
 * aqui, e é de propósito: os textos das telas de autenticação mudam a cada
 * versão do componente, e traduzir por fora seria correr atrás deles.
 *
 * `ptBR` e não `ptPT` pela mesma razão dos documentos legais: o produto é
 * brasileiro, e o português do catálogo também.
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
