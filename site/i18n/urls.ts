import { DEFAULT_LOCALE, LOCALES, type Locale } from '../../i18n/locales';

import { getPathname } from './navigation';

/**
 * Os endereços absolutos do site, para o que precisa sair do navegador:
 * `canonical`, `hreflang` e o mapa do site.
 *
 * **De onde vem a origem.** Não fica escrita aqui. A Vercel publica o domínio
 * de produção do projeto em `VERCEL_PROJECT_PRODUCTION_URL` durante o build, e
 * é ele que vale — inclusive nas prévias, porque o canônico de uma prévia deve
 * apontar para a produção, e não para si mesma. `NEXT_PUBLIC_SITE_URL` existe
 * para fixar o valor à mão se um dia for preciso.
 *
 * Um domínio errado aqui é pior que domínio nenhum: um `canonical` apontando
 * para fora manda o buscador indexar outra página no lugar desta.
 */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

/**
 * As páginas do site, e em quantas línguas cada uma **existe de verdade**.
 *
 * A distinção não é burocracia. `hreflang` é uma afirmação: "esta é a versão
 * alemã desta página". Apontá-lo para um endereço que devolve português é
 * declarar algo falso — o buscador confere, descarta o grupo inteiro de
 * alternativas e a página perde também o que tinha de verdadeiro.
 *
 * As três existem nas doze. A landing page sempre passou pelo catálogo; a
 * Política de Privacidade e os Termos de Uso estavam escritos direto no JSX, em
 * português, e `/de/privacidade` devolvia o mesmo texto que `/privacidade` —
 * por isso declaravam `false` e apontavam todas para a versão portuguesa. Agora
 * o texto dos dois documentos vem de `i18n/messages/legal/`, um arquivo por
 * idioma, e a afirmação "esta é a versão alemã desta página" passou a ser
 * verdadeira.
 *
 * O que sustenta essa afirmação não é a boa vontade de quem traduziu: é
 * `i18n/__tests__/legal-messages.test.ts`, que reprova no CI se um idioma
 * perder uma chave ou deixar texto em português. Sem essa guarda, um documento
 * meio traduzido voltaria a declarar `hreflang` que não cumpre.
 */
export const ROUTES = [
  { path: '/', translated: true },
  { path: '/privacidade', translated: true },
  { path: '/termos', translated: true },
] as const;

export type Route = (typeof ROUTES)[number]['path'];

/**
 * O caminho de uma rota num idioma, com o prefixo que aquele idioma usa.
 *
 * Passa pelo `getPathname` do next-intl em vez de montar a string: a regra é
 * `localePrefix: 'as-needed'`, que deixa o português na raiz e prefixa os
 * outros. Reescrever isso aqui daria dois lugares para a mesma decisão, e o
 * segundo é sempre o que fica para trás.
 */
export function pathFor(route: Route, locale: Locale): string {
  return getPathname({ href: route, locale });
}

/** O endereço absoluto de uma rota num idioma. */
export function urlFor(route: Route, locale: Locale): string {
  return new URL(pathFor(route, locale), SITE_ORIGIN).toString();
}

/** `true` quando a rota existe em todos os idiomas, e não só em português. */
export function isTranslated(route: Route): boolean {
  return ROUTES.find((r) => r.path === route)?.translated ?? false;
}

/**
 * O endereço que deve ser indexado para esta rota neste idioma.
 *
 * Numa rota traduzida, cada idioma é canônico de si. Numa rota que só existe
 * em português, os doze prefixos servem o mesmo texto — e conteúdo idêntico em
 * doze endereços é duplicação. O canônico junta os doze num só.
 */
export function canonicalFor(route: Route, locale: Locale): string {
  return urlFor(route, isTranslated(route) ? locale : DEFAULT_LOCALE);
}

/**
 * O mapa `hreflang` de uma rota, ou `undefined` quando não há o que declarar.
 *
 * Usa o código puro (`en`, e não `en-US`) porque é o que o conteúdo promete —
 * a tradução é para o idioma, não para um país. Declarar `en-US` diria ao
 * buscador que a página é para os Estados Unidos e deixaria o resto do mundo
 * anglófono sem versão declarada.
 *
 * `x-default` aponta para o português, que é onde a raiz do site responde.
 */
export function alternatesFor(route: Route): Record<string, string> | undefined {
  if (!isTranslated(route)) return undefined;

  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[locale] = urlFor(route, locale);
  }

  languages['x-default'] = urlFor(route, DEFAULT_LOCALE);

  return languages;
}
