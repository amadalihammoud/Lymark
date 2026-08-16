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
 * Só entram os endereços que devem ser indexados, e quantas vezes cada rota
 * entra vem do `translated` de `i18n/urls.ts` — não de uma lista escrita aqui.
 * As três rotas existem nas doze línguas, então as três entram doze vezes, cada
 * uma declarando as outras onze como tradução.
 *
 * Foi diferente até a tradução dos documentos jurídicos: enquanto eles só
 * existiam em português, entravam uma vez, porque listar `/de/privacidade`
 * seria pedir a indexação de um endereço que devolvia texto português. O mapa
 * não precisou mudar para acompanhar — é o que se ganha em derivá-lo do
 * `translated` em vez de repetir a decisão.
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
