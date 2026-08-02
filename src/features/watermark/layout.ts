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
 * Altura de preview para a qual `SCALE_METRICS` foi calibrado: uma foto
 * retrato 3:4 ocupando a largura de um telefone comum.
 */
const REFERENCE_FRAME_HEIGHT = 440;

/** Piso do fator de escala — abaixo disso o carimbo fica ilegível. */
const MIN_SCALE_FACTOR = 0.45;

/**
 * Ajusta o carimbo à altura real da foto.
 *
 * Tamanhos fixos em pontos assumem uma foto retrato. Numa panorâmica 4,4:1 o
 * frame tem cerca de 70 px de altura enquanto o bloco ocupa 160: com
 * `overflow: hidden`, a hora é cortada para fora da imagem — no preview e no
 * arquivo exportado. O bloco encolhe junto com a foto.
 *
 * @param frameHeight altura medida do preview; `0` antes da medição.
 */
export function scaleMetricsToFrame(metrics: ScaleMetrics, frameHeight: number): ScaleMetrics {
  if (frameHeight <= 0) return metrics;

  const factor = Math.min(1, Math.max(MIN_SCALE_FACTOR, frameHeight / REFERENCE_FRAME_HEIGHT));
  if (factor === 1) return metrics;

  const apply = (value: number, floor: number) => Math.max(floor, Math.round(value * factor));

  return {
    time: apply(metrics.time, 12),
    secondary: apply(metrics.secondary, 7),
    address: apply(metrics.address, 8),
    code: apply(metrics.code, 7),
    gap: apply(metrics.gap, 2),
    paddingVertical: apply(metrics.paddingVertical, 3),
    paddingHorizontal: apply(metrics.paddingHorizontal, 4),
  };
}

/**
 * Converte o canto escolhido em posicionamento absoluto.
 *
 * `maxWidth` impede que um endereço longo atravesse a foto inteira, `maxHeight`
 * impede que o bloco engula a imagem, e o alinhamento acompanha o lado em que
 * ele está ancorado.
 */
export function resolveAnchorStyle(position: WatermarkPosition): ViewStyle {
  const vertical: ViewStyle =
    position.startsWith('top') ? { top: spacing.md } : { bottom: spacing.md };

  const horizontal: ViewStyle = position.endsWith('left')
    ? { left: spacing.md, alignItems: 'flex-start' }
    : { right: spacing.md, alignItems: 'flex-end' };

  return {
    position: 'absolute',
    maxWidth: '85%',
    maxHeight: '70%',
    ...vertical,
    ...horizontal,
  };
}

export function resolveTextAlign(position: WatermarkPosition): 'left' | 'right' {
  return position.endsWith('left') ? 'left' : 'right';
}
