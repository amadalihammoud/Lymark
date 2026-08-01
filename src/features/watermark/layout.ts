import type { ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import type { WatermarkPosition, WatermarkScale } from '@/types';

/**
 * Geometria da marca d'água.
 *
 * Isolado do componente porque estes números são regra de produto, não
 * estilo de tela: são eles que definem como o carimbo sai na foto exportada.
 */

export type ScaleMetrics = {
  fontSize: number;
  lineHeight: number;
  paddingVertical: number;
  paddingHorizontal: number;
};

export const SCALE_METRICS: Record<WatermarkScale, ScaleMetrics> = {
  small: { fontSize: 10, lineHeight: 14, paddingVertical: 6, paddingHorizontal: 8 },
  medium: { fontSize: 13, lineHeight: 18, paddingVertical: 8, paddingHorizontal: 10 },
  large: { fontSize: 16, lineHeight: 22, paddingVertical: 10, paddingHorizontal: 12 },
};

/**
 * Converte o canto escolhido em posicionamento absoluto.
 *
 * `maxWidth` impede que um endereço longo atravesse a foto inteira, e o
 * alinhamento de texto acompanha o lado em que o bloco está ancorado.
 */
export function resolveAnchorStyle(position: WatermarkPosition): ViewStyle {
  const vertical: ViewStyle =
    position.startsWith('top') ? { top: spacing.md } : { bottom: spacing.md };

  const horizontal: ViewStyle = position.endsWith('left')
    ? { left: spacing.md, alignItems: 'flex-start' }
    : { right: spacing.md, alignItems: 'flex-end' };

  return { position: 'absolute', maxWidth: '85%', ...vertical, ...horizontal };
}

export function resolveTextAlign(position: WatermarkPosition): 'left' | 'right' {
  return position.endsWith('left') ? 'left' : 'right';
}
