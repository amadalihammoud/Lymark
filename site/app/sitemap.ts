import type { MetadataRoute } from 'next';

import { DEFAULT_LOCALE, LOCALES } from '../../i18n/locales';
import { ROUTES, alternatesFor, urlFor } from '../i18n/urls';

/**
 * O mapa do site.
 *
 * Existe porque as versões prefixadas não são alcançáveis por link a partir do
 * português: o seletor de idioma é um `<select>` acionado por JavaScript, e um
 * rastreador não o aciona. Sem o mapa, onze idiomas dependeriam de o buscador
 * adivinhar a URL.
 *
 * Só entram os endereços que devem ser indexados. A landing page entra doze
 * vezes, uma por idioma, cada uma declarando as outras onze como tradução. A
 * Política de Privacidade e os Termos entram **uma** vez, em português: é a
 * única versão que existe, e listar `/de/privacidade` seria pedir a indexação
 * de um endereço que devolve texto português.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.flatMap(({ path, translated }) => {
    const idiomas = translated ? LOCALES : [DEFAULT_LOCALE];
    const languages = alternatesFor(path);

    return idiomas.map((locale) => ({
      url: urlFor(path, locale),
      // A raiz é a porta de entrada; as políticas mudam raramente e não
      // competem por posição.
      priority: path === '/' ? 1 : 0.5,
      changeFrequency: (path === '/' ? 'weekly' : 'yearly') as 'weekly' | 'yearly',
      ...(languages ? { alternates: { languages } } : {}),
    }));
  });
}
