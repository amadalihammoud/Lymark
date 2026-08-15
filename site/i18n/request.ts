import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

/**
 * Carrega o catálogo do idioma pedido, a partir da fonte única na raiz do
 * repositório. O site não guarda cópia própria das mensagens — foi justamente
 * a cópia paralela que fez os catálogos divergirem antes.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../i18n/messages/${locale}.json`)).default,
  };
});
