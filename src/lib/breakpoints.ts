import { useWindowDimensions } from 'react-native';

/**
 * Os três arranjos possíveis da tela de captura.
 *
 * O aplicativo nasceu para o celular, e esse continua sendo o caso principal:
 * `phone` não é o degrau menor, é o desenho de origem. Os outros dois existem
 * porque a mesma tela, esticada num monitor, vira um telefone gigante — a foto
 * herdava a largura da janela e empurrava tudo para fora.
 */
export type LayoutMode = 'phone' | 'wide' | 'ultra';

/**
 * A partir daqui cabem duas colunas: foto e dados, lado a lado.
 *
 * Abaixo disso não há largura para dividir sem espremer o formulário.
 */
export const WIDE_LAYOUT_MIN_WIDTH = 900;

/**
 * A partir daqui cabem três: foto, dados e as preferências da marca d'água.
 *
 * O número não é redondo por acaso — é o que sobra depois de reservar largura
 * de leitura para as duas colunas de controles. Num tablet em retrato, três
 * colunas ficariam piores que duas, e por isso o degrau existe.
 */
export const THREE_COLUMN_MIN_WIDTH = 1280;

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();

  if (width >= THREE_COLUMN_MIN_WIDTH) return 'ultra';
  if (width >= WIDE_LAYOUT_MIN_WIDTH) return 'wide';
  return 'phone';
}
