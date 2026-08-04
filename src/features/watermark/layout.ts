import type { WatermarkScale } from '@/types';

import { REFERENCE_FRAME_WIDTH as SKIA_REFERENCE_FRAME_WIDTH } from './skia-typography';

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
 * Onde a tinta dos dígitos fica dentro da caixa de texto da hora.
 *
 * Na referência, a barra âmbar começa e termina exatamente nos limites dos
 * **glifos** — não da caixa de linha, que é maior. Alinhar pela caixa faz a
 * barra sobrar acima e abaixo dos dígitos.
 *
 * Medido renderizando "21:55" em Pathway Gothic One com `lineHeight` igual ao
 * corpo: a tinta começa a 16,33% do topo da caixa e ocupa 72,67% da altura
 * dela. São propriedades desta fonte — trocar a fonte da hora obriga a medir
 * de novo.
 */
export const TIME_INK_TOP_RATIO = 0.1633;
export const TIME_INK_HEIGHT_RATIO = 0.7267;

/**
 * Altura de preview para a qual `SCALE_METRICS` foi calibrado: uma foto
 * retrato 3:4 ocupando a largura de um telefone comum.
 */
const REFERENCE_FRAME_HEIGHT = 440;

/**
 * A largura correspondente — medida, não deduzida do formato da foto.
 *
 * A dedução ingênua seria 440 × 3/4 = 330, tratando o quadro como um retrato
 * 3:4 exato. Medir a fonte dentro do Skia mostrou que os pontos de
 * `SCALE_METRICS` implicam 355,4: ver `skia-typography.ts`.
 */
const REFERENCE_FRAME_WIDTH = SKIA_REFERENCE_FRAME_WIDTH;

/** Piso do fator de escala — abaixo disso o carimbo fica ilegível. */
const MIN_SCALE_FACTOR = 0.45;

export type FrameSize = { width: number; height: number };

/**
 * O carimbo em função do tamanho do destino, e não de pontos de tela.
 *
 * `SCALE_METRICS` está em pontos porque foi calibrado contra um preview de
 * telefone. Isso amarra o carimbo ao tamanho da tela — é a razão de a foto
 * exportada sair com a resolução da tela e não com a da fotografia.
 * Expressar tudo como fração do quadro desamarra os dois: o mesmo carimbo
 * serve para um preview de 330 px e para um arquivo de 4000 px.
 *
 * O fator é o **menor** entre as duas proporções. Escalar só pela altura
 * deixa o bloco transbordar na horizontal num quadro alto e estreito;
 * escalar só pela largura o faz transbordar na vertical numa panorâmica.
 *
 * @param allowGrowth `false` no preview — o carimbo nunca passa do tamanho
 *   calibrado. `true` na exportação, onde acompanhar a resolução real do
 *   arquivo é justamente o objetivo.
 */
/**
 * Quanto o quadro atual difere daquele para o qual tudo foi calibrado.
 *
 * Exposto porque o recuo do carimbo precisa do mesmo fator, e **não** pode ser
 * derivado do corpo da hora: isso faria a escolha de "texto pequeno" nas
 * preferências aproximar o bloco da borda da foto, que é outra coisa.
 */
export function frameScaleFactor(
  frame: FrameSize,
  { allowGrowth = false }: { allowGrowth?: boolean } = {},
): number {
  if (frame.width <= 0 || frame.height <= 0) return 1;
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return 1;

  const raw = Math.min(frame.width / REFERENCE_FRAME_WIDTH, frame.height / REFERENCE_FRAME_HEIGHT);

  return allowGrowth ? raw : Math.min(1, Math.max(MIN_SCALE_FACTOR, raw));
}

export function metricsForFrame(
  metrics: ScaleMetrics,
  frame: FrameSize,
  { allowGrowth = false }: { allowGrowth?: boolean } = {},
): ScaleMetrics {
  if (frame.width <= 0 || frame.height <= 0) return metrics;
  // `NaN` passaria pelo teste acima e contaminaria toda a geometria em
  // silêncio: cada posição viraria `NaN` e o carimbo simplesmente não seria
  // desenhado, sem erro.
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return metrics;

  const raw = Math.min(
    frame.width / REFERENCE_FRAME_WIDTH,
    frame.height / REFERENCE_FRAME_HEIGHT,
  );

  // O piso de legibilidade protege a tela. Numa exportação, encolher além da
  // conta é o defeito — não a proteção.
  const factor = allowGrowth ? raw : Math.min(1, Math.max(MIN_SCALE_FACTOR, raw));
  if (factor === 1) return metrics;

  // Os pisos em pontos também são de tela: ao crescer nunca são alcançados.
  const apply = (value: number, floor: number) =>
    Math.max(allowGrowth ? 1 : floor, Math.round(value * factor));

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
 * Corpo da marca, proporcional ao endereço.
 *
 * Medido: na referência a marca tem 25,9 px de altura de caixa alta contra
 * 30 px que a estimativa anterior produzia — os dois textos acabam no mesmo
 * corpo, e a marca só *parece* maior por ser uma palavra curta e isolada.
 */
export const BRAND_SIZE_RATIO = 1;

/**
 * O código girado na lateral.
 *
 * Todos os três números vêm de medição na referência, normalizada à mesma
 * largura: corpo 19,4 px (0,85 do corpo do código no bloco), margem direita
 * 11,8 px, e centro do texto a 38% da altura da foto — não no meio.
 */
export const SIDE_CODE_INSET = 2;
export const SIDE_CODE_SIZE_RATIO = 0.85;
/** Onde o centro do texto girado fica, em fração da altura da foto. */
export const SIDE_CODE_CENTER_RATIO = 0.38;
