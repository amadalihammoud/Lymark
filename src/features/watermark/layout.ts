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

/**
 * Proporções medidas na referência, em resolução cheia (1920×2560):
 * hora ÷ endereço = 3,0 · endereço ÷ data = 1,3 · entrelinha do endereço =
 * 1,42 × o corpo. É o que faz o horário ser lido de relance numa foto de
 * vistoria sem que o endereço vire miudinho.
 */
export const SCALE_METRICS: Record<WatermarkScale, ScaleMetrics> = {
  small: {
    time: 30,
    secondary: 8,
    address: 10,
    code: 9,
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  medium: {
    time: 39,
    secondary: 10,
    address: 13,
    code: 11,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  large: {
    time: 48,
    secondary: 13,
    address: 16,
    code: 13,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
};

/** Entrelinha do endereço, medida na referência. */
export const ADDRESS_LINE_HEIGHT_RATIO = 1.42;

/**
 * Respiros do bloco superior, proporcionais ao tamanho da hora.
 *
 * Na referência o vão entre a hora e a barra é quase o dobro do vão entre a
 * barra e a data — é o que faz a barra parecer pertencer ao bloco da direita.
 */
export const RULE_SPACE_BEFORE_RATIO = 0.3;
export const RULE_SPACE_AFTER_RATIO = 0.18;

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
    // 65% e não 85%: na referência o endereço quebra bem antes da metade da
    // foto. Ocupar a largura toda faria o carimbo competir com a imagem.
    maxWidth: '65%',
    maxHeight: '70%',
    ...vertical,
    ...horizontal,
  };
}

export function resolveTextAlign(position: WatermarkPosition): 'left' | 'right' {
  return position.endsWith('left') ? 'left' : 'right';
}
