import { createTranslator } from 'next-intl';

import type { Locale } from '../../i18n/locales';

/**
 * O texto da Política de Privacidade e dos Termos de Uso.
 *
 * **Por que num catálogo separado.** Os dois documentos somam mais texto que
 * todo o resto da interface junto, e são lidos por duas páginas do site — mais
 * nada. Deixá-los no catálogo principal cobraria esse peso duas vezes, nos dois
 * lugares onde ele mais dói:
 *
 * - `src/i18n/messages.ts` importa os **doze** idiomas estaticamente para o
 *   bundle do aplicativo. Texto acrescentado ao catálogo principal viaja no
 *   celular doze vezes, e o aplicativo não mostra nenhum destes documentos.
 * - O `NextIntlClientProvider` do layout serializa o catálogo do idioma no HTML
 *   de **toda** página. Hoje já é possível ler `app.about.privacyOnDevice` no
 *   HTML de `/privacidade`; somar os documentos jurídicos a isso dobraria o
 *   peso da landing page para entregar texto que ela não usa.
 *
 * Continua sendo um arquivo por idioma, na mesma raiz, com a mesma guarda de
 * paridade de chaves — o que a regra do catálogo único proíbe é vocabulário
 * duplicado divergindo em silêncio, e isso aqui não acontece: cada chave existe
 * num lugar só.
 *
 * Por isso também `createTranslator` em vez de `getTranslations`: o segundo lê
 * a configuração da requisição, que é exatamente o caminho que serializa para
 * o cliente. Este carrega o idioma pedido, no servidor, e nada disso chega ao
 * navegador além do HTML já renderizado.
 */
export async function getLegalTranslator<N extends 'privacy' | 'terms'>(
  locale: Locale,
  namespace: N,
) {
  const messages = (await import(`../../i18n/messages/legal/${locale}.json`)).default;

  return createTranslator({ locale, messages, namespace });
}
