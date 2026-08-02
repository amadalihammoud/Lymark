import type { ViewStyle } from 'react-native';

import type { WatermarkPosition, WatermarkScale } from '@/types';

/**
 * Geometria e escala tipográfica da marca d'água.
 *
 * Isolado do componente porque estes números são regra de produto, não
 * estilo de tela: são eles que definem como o carimbo sai na foto exportada.
 *
 * Os tamanhos foram calibrados medindo a referência em resolução cheia e
 * comparando com o resultado renderizado deste componente, e não estimados
 * no olho.
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
 * Calibrado contra a referência, e não estimado.
 *
 * O método: medir a largura que cada trecho ocupa na foto de referência
 * (normalizada para 1128 px) e descobrir em que corpo a nossa fonte
 * reproduz a mesma largura. Comparar tamanho de fonte diretamente não
 * funcionaria — famílias diferentes desenham o mesmo corpo com larguras
 * diferentes.
 *
 * Alvos medidos e resultado com estes valores:
 *   "21:55"                              219 px → 219 px
 *   "01 ago. 2026"                       207 px → 207 px
 *   "R. Casper Líbero, 24 - José Menino," 607 px → 590 px
 *
 * Achado que contraria a intuição: na referência **data e endereço têm o
 * mesmo corpo**. A data parece menor por conter dígitos, que são estreitos.
 */
export const SCALE_METRICS: Record<WatermarkScale, ScaleMetrics> = {
  small: {
    time: 36,
    secondary: 10,
    address: 10,
    code: 8,
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  medium: {
    time: 47,
    secondary: 13,
    address: 13,
    code: 11,
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  large: {
    time: 59,
    secondary: 16,
    address: 16,
    code: 14,
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
};

/**
 * Recuo do bloco até a borda da foto.
 *
 * Não usa o espaçamento genérico da interface: este número foi medido na
 * referência (2,9% da largura da imagem, somando recuo e respiro interno) e
 * responde a uma pergunta diferente — quanto o carimbo respeita a moldura da
 * foto, não como os elementos da tela se separam.
 */
export const WATERMARK_INSET = 6;

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
    position.startsWith('top') ? { top: WATERMARK_INSET } : { bottom: WATERMARK_INSET };

  const horizontal: ViewStyle = position.endsWith('left')
    ? { left: WATERMARK_INSET, alignItems: 'flex-start' }
    : { right: WATERMARK_INSET, alignItems: 'flex-end' };

  return {
    position: 'absolute',
    // 58%: calibrado para o endereço quebrar a linha no mesmo ponto que a
    // referência. Ocupar a largura toda faria o carimbo competir com a imagem.
    maxWidth: '58%',
    maxHeight: '70%',
    ...vertical,
    ...horizontal,
  };
}

export function resolveTextAlign(position: WatermarkPosition): 'left' | 'right' {
  return position.endsWith('left') ? 'left' : 'right';
}
