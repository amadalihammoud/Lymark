import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '../i18n/urls';

/**
 * As regras para rastreadores.
 *
 * Tudo liberado: o site é uma landing page pública, e não há área restrita a
 * proteger. O que este arquivo existe para fazer é apontar o mapa do site —
 * é assim que um buscador descobre as onze versões prefixadas sem depender de
 * seguir o seletor de idioma, que é um `<select>` e ele não aciona.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', SITE_ORIGIN).toString(),
    host: SITE_ORIGIN,
  };
}
