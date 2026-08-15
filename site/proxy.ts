import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  /**
   * Só as páginas. `_next` e `_vercel` são infraestrutura, e qualquer caminho
   * com ponto é arquivo estático — passar o `favicon.ico` pelo negociador de
   * idioma só gastaria tempo.
   */
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
