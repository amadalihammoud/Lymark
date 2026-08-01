import type { ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import type { WatermarkPosition, WatermarkScale } from '@/types';

/**
 * Geometria e escala tipográfica da marca d'água.
 *
 * Isolado do componente porque estes números são regra de produto, não
 * estilo de tela: são eles que definem como o carimbo sai na foto exportada.
 *
 * A proporção entre os tamanhos vem do layout de referência — a hora pesa
 * cerca de 2,8 vezes o endereço, e é isso que faz o horário ser lido de
 * relance numa foto de vistoria.
 */

export type ScaleMetrics = {
  /** Hora, o elemento dominante. */
  time: number;
  /** Data e dia da semana, no bloco ao lado da barra. */
  secondary: number;
  address: number;
  code: number;
  /** Espaço entre o bloco superior e o endereço. */
  gap: number;
  paddingVertical: number;
  paddingHorizontal: number;
};

export const SCALE_METRICS: Record<WatermarkScale, ScaleMetrics> = {
  small: {
    time: 26,
    secondary: 9,
    address: 10,
    code: 9,
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  medium: {
    time: 36,
    secondary: 11,
    address: 13,
    code: 11,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  large: {
    time: 46,
    secondary: 14,
    address: 16,
    code: 13,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
};

/**
 * Converte o canto escolhido em posicionamento absoluto.
 *
 * `maxWidth` impede que um endereço longo atravesse a foto inteira, e o
 * alinhamento acompanha o lado em que o bloco está ancorado.
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
