import type { WatermarkPosition, WatermarkPreferences } from '@/types';

import type { WatermarkContent } from './build-content';
import {
  ADDRESS_LINE_HEIGHT_RATIO,
  BRAND_SIZE_RATIO,
  RULE_SPACE_AFTER_RATIO,
  RULE_SPACE_BEFORE_RATIO,
  SCALE_METRICS,
  SIDE_CODE_CENTER_RATIO,
  SIDE_CODE_INSET,
  SIDE_CODE_SIZE_RATIO,
  WATERMARK_INSET,
  metricsForFrame,
  type ScaleMetrics,
} from './layout';
import { DIGIT_INK_HEIGHT, DIGIT_INK_TOP_FROM_BASELINE } from './skia-typography';

/**
 * A geometria do carimbo, separada de quem a desenha.
 *
 * O carimbo hoje existe como componentes do React Native, o que o prende à
 * tela: para exportar, o app fotografa a própria interface, e o arquivo sai
 * com a resolução do telefone em vez da resolução da fotografia.
 *
 * Este módulo resolve o mesmo layout como **posições absolutas** — sem View,
 * sem flexbox, sem unidade de tela. O resultado serve para desenhar no
 * preview, para compor sobre o bitmap original em 4000 px e para sobrepor à
 * câmera ao vivo. É a mesma conta, com um número de largura diferente.
 *
 * Nada aqui importa Skia. A medição de texto entra como função, o que torna o
 * layout testável sem aparelho e sem motor gráfico.
 */

export type StampFont = 'clock' | 'body' | 'medium';

/** Mede a largura de um texto. O motor gráfico fornece a implementação. */
export type MeasureText = (text: string, size: number, font: StampFont) => number;

export type StampText = {
  text: string;
  /** Origem horizontal do texto — sempre a borda esquerda do traçado. */
  x: number;
  /** Linha de base, e não o topo: é como todo motor gráfico posiciona texto. */
  baseline: number;
  size: number;
  font: StampFont;
  color: string;
  /** Giro em graus, em torno de (`x`, `baseline`). */
  rotate?: number;
};

export type StampRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type StampGeometry = {
  texts: StampText[];
  rects: StampRect[];
};

export type StampColors = {
  text: string;
  accent: string;
  backdrop: string;
};

export type StampFrame = { width: number; height: number };

/**
 * Onde fica a linha de base da primeira linha de um texto, contando do topo
 * da caixa que ele ocupa.
 *
 * Para os algarismos da hora a resposta é medida: a tinta começa 0,715 do
 * corpo acima da linha de base. Para os textos corridos, aproximar por 0,8 do
 * corpo é o suficiente — eles não têm nada alinhado à tinta.
 */
const BODY_BASELINE_RATIO = 0.8;

/** Quebra o endereço em linhas que caibam na largura disponível. */
function wrapText(
  text: string,
  size: number,
  font: StampFont,
  maxWidth: number,
  measure: MeasureText,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (measure(candidate, size, font) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  lines.push(current);
  return lines;
}

function isTop(position: WatermarkPosition) {
  return position.startsWith('top');
}

function isLeft(position: WatermarkPosition) {
  return position.endsWith('left');
}

/**
 * Resolve o carimbo inteiro em posições absolutas dentro do quadro.
 *
 * @param allowGrowth `true` na exportação, onde o carimbo acompanha a
 *   resolução do arquivo em vez de parar no tamanho da tela.
 */
export function buildStampGeometry({
  content,
  preferences,
  frame,
  colors,
  measure,
  allowGrowth = false,
}: {
  content: WatermarkContent;
  preferences: WatermarkPreferences;
  frame: StampFrame;
  colors: StampColors;
  measure: MeasureText;
  allowGrowth?: boolean;
}): StampGeometry {
  const texts: StampText[] = [];
  const rects: StampRect[] = [];

  if (content.isEmpty && !preferences.showBrand) return { texts, rects };
  if (frame.width <= 0 || frame.height <= 0) return { texts, rects };

  const metrics = metricsForFrame(SCALE_METRICS[preferences.scale], frame, { allowGrowth });
  const inset = scaleInset(WATERMARK_INSET, frame, metrics);

  const codeOnSide = content.code !== null && preferences.codePlacement === 'side';

  if (!content.isEmpty) {
    layoutDataBlock({ content, preferences, frame, colors, measure, metrics, inset, texts, rects });
  }

  if (preferences.showBrand) {
    layoutBrand({ preferences, frame, colors, measure, metrics, inset, texts });
  }

  if (codeOnSide && content.code) {
    layoutSideCode({ code: content.code, frame, colors, measure, metrics, inset, texts });
  }

  return { texts, rects };
}

/**
 * O recuo é uma medida de tela, como as métricas. Cresce junto com elas para
 * que a margem do carimbo seja proporcional à foto, e não a um número de
 * pontos que sumiria numa imagem de 4000 px.
 */
function scaleInset(base: number, frame: StampFrame, metrics: ScaleMetrics) {
  const reference = SCALE_METRICS.medium.time;
  return Math.round((base * metrics.time) / reference);
}

function layoutDataBlock({
  content,
  preferences,
  frame,
  colors,
  measure,
  metrics,
  inset,
  texts,
  rects,
}: {
  content: WatermarkContent;
  preferences: WatermarkPreferences;
  frame: StampFrame;
  colors: StampColors;
  measure: MeasureText;
  metrics: ScaleMetrics;
  inset: number;
  texts: StampText[];
  rects: StampRect[];
}) {
  const { position } = preferences;
  const left = isLeft(position);
  const maxWidth = frame.width * 0.58;

  const headerHeight = content.time ? Math.round(metrics.time * DIGIT_INK_HEIGHT) : 0;

  const addressLines = content.address
    ? wrapText(content.address, metrics.address, 'body', maxWidth, measure)
    : [];
  const addressLineHeight = Math.round(metrics.address * ADDRESS_LINE_HEIGHT_RATIO);
  const addressHeight = addressLines.length * addressLineHeight;

  const codeInBlock = content.code !== null && preferences.codePlacement === 'block';
  const codeHeight = codeInBlock ? Math.round(metrics.code * ADDRESS_LINE_HEIGHT_RATIO) : 0;

  const gapAfterHeader = headerHeight > 0 && addressHeight > 0 ? metrics.gap : 0;
  const gapBeforeCode = codeInBlock ? Math.round(metrics.gap / 2) : 0;
  const blockHeight = headerHeight + gapAfterHeader + addressHeight + gapBeforeCode + codeHeight;

  const top = isTop(position)
    ? inset + metrics.paddingVertical
    : frame.height - inset - metrics.paddingVertical - blockHeight;

  // A faixa de fundo cobre o bloco inteiro, e por isso é calculada antes de
  // qualquer texto: ela precisa da largura final, que só se conhece aqui.
  const widths: number[] = [];
  if (content.time) widths.push(headerWidth(content, metrics, measure));
  for (const line of addressLines) widths.push(measure(line, metrics.address, 'body'));
  if (codeInBlock && content.code) widths.push(measure(content.code, metrics.code, 'medium'));
  const blockWidth = widths.length ? Math.max(...widths) : 0;

  // O recuo medido na referência é de 2,9% da largura, e no layout antigo
  // vinha da soma do recuo da âncora com o respiro interno do bloco. Aqui não
  // existe container: o texto precisa carregar os dois, ou encosta na borda.
  const edge = inset + metrics.paddingHorizontal;
  const blockLeft = left ? edge : frame.width - edge - blockWidth;

  if (preferences.showBackdrop && blockWidth > 0) {
    rects.push({
      x: blockLeft - metrics.paddingHorizontal,
      y: top - metrics.paddingVertical,
      width: blockWidth + metrics.paddingHorizontal * 2,
      height: blockHeight + metrics.paddingVertical * 2,
      color: colors.backdrop,
    });
  }

  let cursor = top;

  if (content.time || content.showRule || content.date || content.weekday) {
    layoutHeader({
      content, metrics, colors, measure, texts, rects,
      x: blockLeft, top: cursor, headerHeight,
    });
    cursor += headerHeight + gapAfterHeader;
  }

  for (const line of addressLines) {
    const width = measure(line, metrics.address, 'body');
    texts.push({
      text: line,
      x: left ? blockLeft : blockLeft + blockWidth - width,
      baseline: cursor + Math.round(metrics.address * BODY_BASELINE_RATIO),
      size: metrics.address,
      font: 'body',
      color: colors.text,
    });
    cursor += addressLineHeight;
  }

  if (codeInBlock && content.code) {
    const width = measure(content.code, metrics.code, 'medium');
    texts.push({
      text: content.code,
      x: left ? blockLeft : blockLeft + blockWidth - width,
      baseline: cursor + gapBeforeCode + Math.round(metrics.code * BODY_BASELINE_RATIO),
      size: metrics.code,
      font: 'medium',
      color: colors.text,
    });
  }
}

/** Largura da primeira linha: hora, barra e o bloco de data ao lado. */
function headerWidth(
  content: WatermarkContent,
  metrics: ScaleMetrics,
  measure: MeasureText,
): number {
  let width = content.time ? measure(content.time, metrics.time, 'clock') : 0;

  if (content.showRule) {
    width += Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO);
    width += 2;
    width += Math.round(metrics.time * RULE_SPACE_AFTER_RATIO);
  }

  const secondary = Math.max(
    content.date ? measure(content.date, metrics.secondary, 'body') : 0,
    content.weekday ? measure(content.weekday, metrics.secondary, 'body') : 0,
  );

  return width + secondary;
}

function layoutHeader({
  content, metrics, colors, measure, texts, rects, x, top, headerHeight,
}: {
  content: WatermarkContent;
  metrics: ScaleMetrics;
  colors: StampColors;
  measure: MeasureText;
  texts: StampText[];
  rects: StampRect[];
  x: number;
  top: number;
  headerHeight: number;
}) {
  let cursor = x;

  if (content.time) {
    // A linha de base sai da medição: a tinta dos algarismos começa 0,715 do
    // corpo acima dela. É isso que faz o topo dos dígitos cair exatamente em
    // `top`, e é o que a barra âmbar usa para casar com eles.
    texts.push({
      text: content.time,
      x: cursor,
      baseline: top - Math.round(metrics.time * DIGIT_INK_TOP_FROM_BASELINE),
      size: metrics.time,
      font: 'clock',
      color: colors.text,
    });
    cursor += measure(content.time, metrics.time, 'clock');
  }

  if (content.showRule) {
    cursor += Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO);
    // A barra vai do topo à base da tinta dos algarismos — não da caixa de
    // texto, que é maior. É a diferença que se enxerga a olho nu.
    rects.push({
      x: cursor,
      y: top,
      width: Math.max(2, Math.round(metrics.time / 23)),
      height: headerHeight,
      color: colors.accent,
    });
    cursor += Math.max(2, Math.round(metrics.time / 23));
    cursor += Math.round(metrics.time * RULE_SPACE_AFTER_RATIO);
  }

  // Data encostada no topo da tinta, dia da semana encostado na base: é essa
  // distribuição que reproduz a referência.
  if (content.date) {
    texts.push({
      text: content.date,
      x: cursor,
      baseline: top + Math.round(metrics.secondary * BODY_BASELINE_RATIO),
      size: metrics.secondary,
      font: 'body',
      color: colors.text,
    });
  }

  if (content.weekday) {
    texts.push({
      text: content.weekday,
      x: cursor,
      baseline: top + headerHeight,
      size: metrics.secondary,
      font: 'body',
      color: colors.text,
    });
  }
}

function layoutBrand({
  preferences, frame, colors, measure, metrics, inset, texts,
}: {
  preferences: WatermarkPreferences;
  frame: StampFrame;
  colors: StampColors;
  measure: MeasureText;
  metrics: ScaleMetrics;
  inset: number;
  texts: StampText[];
}) {
  const size = Math.round(metrics.address * BRAND_SIZE_RATIO);
  const { brandPosition } = preferences;
  const edge = inset + metrics.paddingHorizontal;

  // A marca é bicolor: "Ly" no branco do carimbo e "mark" no âmbar. São dois
  // traçados, não um — desenhar tudo numa cor só descaracteriza a assinatura.
  const headWidth = measure('Ly', size, 'medium');
  const total = headWidth + measure('mark', size, 'medium');

  const x = isLeft(brandPosition) ? edge : frame.width - edge - total;
  const baseline = isTop(brandPosition)
    ? inset + metrics.paddingVertical + Math.round(size * BODY_BASELINE_RATIO)
    : frame.height - inset - metrics.paddingVertical;

  texts.push({ text: 'Ly', x, baseline, size, font: 'medium', color: colors.text });
  texts.push({
    text: 'mark',
    x: x + headWidth,
    baseline,
    size,
    font: 'medium',
    color: colors.accent,
  });
}

function layoutSideCode({
  code, frame, colors, measure, metrics, inset, texts,
}: {
  code: string;
  frame: StampFrame;
  colors: StampColors;
  measure: MeasureText;
  metrics: ScaleMetrics;
  inset: number;
  texts: StampText[];
}) {
  const size = Math.round(metrics.code * SIDE_CODE_SIZE_RATIO);
  const width = measure(code, size, 'medium');

  // Girado −90°, o comprimento do texto corre ao longo da altura da foto. O
  // centro cai a 38% da altura, medido na referência — não na metade.
  const center = frame.height * SIDE_CODE_CENTER_RATIO;

  // A margem até a borda direita foi medida em 11,8 px numa imagem de 1128:
  // proporcional, como todo o resto, e não um número fixo de pontos.
  const margin = Math.round((SIDE_CODE_INSET * inset) / WATERMARK_INSET);

  texts.push({
    text: code,
    x: frame.width - margin - Math.round(size * 0.28),
    baseline: center + width / 2,
    size,
    font: 'medium',
    color: colors.text,
    rotate: -90,
  });
}
