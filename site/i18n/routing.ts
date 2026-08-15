import { defineRouting } from 'next-intl/routing';

import { DEFAULT_LOCALE, LOCALES } from '../../i18n/locales';

/**
 * O roteamento por idioma do site.
 *
 * `localePrefix: 'as-needed'` mantém o português na raiz (`/privacidade`) e
 * prefixa apenas os demais (`/en/privacy`). O site nasceu em português e já
 * tem endereços em circulação; prefixar tudo quebraria esses links e mandaria
 * o histórico de busca para o começo.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});
