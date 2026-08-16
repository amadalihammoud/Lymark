import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/**
 * Dois negociadores, um por fora do outro.
 *
 * O Clerk vem por fora porque precisa ver **toda** requisição que carrega
 * sessão — inclusive `/api/*`, que o next-intl não deve tocar (uma resposta
 * JSON não tem idioma para negociar, e um redirecionamento de prefixo numa
 * chamada da API quebraria o aplicativo). Por dentro, o next-intl decide o
 * idioma só das páginas.
 *
 * Nada aqui exige login. A porta de entrada é decisão de cada tela — a landing
 * e os documentos legais são públicos por definição —, e a API confere o token
 * ela mesma, em `lib/entitlements.ts`.
 */
export default clerkMiddleware((_auth, request) => {
  if (request.nextUrl.pathname.startsWith('/api')) return;
  return intl(request);
});

export const config = {
  /**
   * Páginas e API. `_next` e `_vercel` são infraestrutura, e qualquer caminho
   * com ponto é arquivo estático — passar o `favicon.ico` pelos negociadores
   * só gastaria tempo.
   */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
