import { useLocalePreference } from '@/contexts/locale-context';
import { isRtl } from '@i18n/locales';

/**
 * Direção de leitura da interface.
 *
 * Quase nada precisa disto. O layout inteiro é flexbox, e `flexDirection: 'row'`
 * já espelha sozinho quando a direção do documento é `rtl` — foi o que
 * `applyDocumentLanguage` passou a fazer. Margens e recuos usam as propriedades
 * lógicas (`marginStart`, `paddingStart`), que também viram sozinhas.
 *
 * Sobra o que **não** tem versão lógica, e é aí que este módulo serve:
 *
 * - `textAlign` no React Native aceita `left` e `right`, mas não `end`. Um
 *   valor encostado no fim da linha precisa saber para que lado é o fim.
 * - Ícones que apontam. Uma seta de "avançar" aponta para a direita em
 *   português e para a **esquerda** em árabe; mantida à direita, ela diz
 *   "voltar" para quem lê da direita para a esquerda.
 *
 * O que NÃO deve usar isto: qualquer coisa que seja a mesma em toda língua.
 * A marca desenhada do Lymark é o exemplo — um logotipo não espelha, e por
 * isso o `left`/`right` de `wordmark.tsx` é físico de propósito.
 */
export function useIsRtl(): boolean {
  const { locale } = useLocalePreference();
  return isRtl(locale);
}
