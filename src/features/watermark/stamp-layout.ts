import type {
  BrandPart,
  StampColorKey,
  WatermarkPosition,
  WatermarkPreferences,
} from '@/types';

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
  TIME_INK_HEIGHT_RATIO,
  TIME_INK_TOP_RATIO,
  WATERMARK_INSET,
  frameScaleFactor,
  metricsForFrame,
  type ScaleMetrics,
} from './layout';
import { DIGIT_INK_TOP_FROM_BASELINE } from './skia-typography';
import { stampText } from './stamp-script';

/**
 * A geometria do carimbo, separada de quem a desenha.
 *
 * O carimbo existe hoje como componentes do React Native, o que o prende à
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

/**
 * Mede o **avanço** de um texto — a distância até onde o próximo glifo
 * começaria, e não a largura da tinta. É o avanço que determina posição.
 */
export type MeasureText = (text: string, size: number, font: StampFont) => number;

export type StampText = {
  text: string;
  /** Origem horizontal do texto. */
  x: number;
  /** Linha de base, e não o topo: é como todo motor gráfico posiciona texto. */
  baseline: number;
  size: number;
  font: StampFont;
  color: string;
  /** Espaçamento entre caracteres, em pontos do destino. */
  letterSpacing?: number;
  /** Giro em graus, em torno de (`x`, `baseline`). */
  rotate?: number;
};

export type StampRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  /** Raio dos cantos. A faixa de fundo é arredondada. */
  radius?: number;
};

export type StampGeometry = {
  texts: StampText[];
  rects: StampRect[];
  /**
   * Sombra aplicada a **todo** texto do carimbo.
   *
   * Sem a faixa de fundo — que vem desligada por padrão — é a sombra que
   * mantém o texto branco legível sobre céu, areia ou parede clara. Sai da
   * geometria, e não do renderizador, porque é parte do desenho e não estilo
   * de tela.
   */
  shadow: { color: string; offsetY: number; blur: number };
};

export type StampColors = {
  text: string;
  accent: string;
  backdrop: string;
  /** Cores nomeadas que a marca própria pode usar. */
  palette: Record<StampColorKey, string>;
};

export type StampFrame = { width: number; height: number };

/** Proporções da sombra, relativas ao corpo do endereço. */
const SHADOW_OFFSET_RATIO = 0.077;
const SHADOW_BLUR_RATIO = 0.23;

/**
 * Onde fica a linha de base de um texto corrido, contando do topo da caixa.
 *
 * O React Native centraliza a caixa: `(lineHeight − (ascent + descent))/2 +
 * ascent`. Com Barlow (ascent 1,0 em, descent 0,2 em) e a entrelinha do
 * endereço, isso dá 1,093 do corpo. Reproduzir esse número é o que mantém o
 * espaçamento igual ao do renderizador antigo.
 */
const BODY_BASELINE_RATIO = 1.093;

/** Entre a base da caixa da hora e a base da tinta dos algarismos. */
const TIME_INK_BOTTOM_GAP = 1 - TIME_INK_TOP_RATIO - TIME_INK_HEIGHT_RATIO;

/**
 * Fração da largura da foto reservada à marca.
 *
 * Era `maxWidth: '45%'` na âncora antiga. Um nome que não couber aqui é
 * reduzido de corpo, e não cortado: cortar o nome de uma empresa na foto que
 * ela entrega ao cliente é pior do que uma letra menor.
 */
const BRAND_MAX_WIDTH_RATIO = 0.45;

/** `letterSpacing` de cada papel, em frações do corpo. Medido no antigo. */
const CODE_LETTER_SPACING_RATIO = 0.055;
const SIDE_CODE_LETTER_SPACING_RATIO = 0.107;
const BRAND_LETTER_SPACING_RATIO = 0.023;

/** Largura de um texto já contando o espaçamento entre caracteres. */
function widthOf(
  text: string,
  size: number,
  font: StampFont,
  measure: MeasureText,
  letterSpacing = 0,
): number {
  return measure(text, size, font) + letterSpacing * Math.max(0, text.length - 1);
}

/**
 * Quebra o texto em linhas que caibam na largura disponível.
 *
 * Quebra **dentro** da palavra quando ela sozinha não cabe. Sem isso, um
 * endereço sem espaços — ou uma palavra muito longa — viraria uma linha maior
 * que a foto, e com o bloco ancorado à direita a posição de início ficaria
 * negativa: o carimbo desenhado fora da imagem.
 */
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
  let current = '';

  const flush = () => {
    if (current) lines.push(current);
    current = '';
  };

  const breakLongWord = (word: string) => {
    let chunk = '';
    for (const char of word) {
      if (chunk && measure(chunk + char, size, font) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (measure(candidate, size, font) <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();

    if (measure(word, size, font) > maxWidth) {
      breakLongWord(word);
    } else {
      current = word;
    }
  }

  flush();
  return lines;
}

function isTop(position: WatermarkPosition) {
  return position.startsWith('top');
}

function isLeft(position: WatermarkPosition) {
  return position.endsWith('left');
}

/** Mantém um valor dentro do quadro, para nada ser desenhado fora da foto. */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
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

  const metrics = metricsForFrame(SCALE_METRICS[preferences.scale], frame, { allowGrowth });
  const empty: StampGeometry = {
    texts,
    rects,
    shadow: {
      color: 'rgba(0, 0, 0, 0.85)',
      offsetY: Math.max(1, Math.round(metrics.address * SHADOW_OFFSET_RATIO)),
      blur: Math.max(1, Math.round(metrics.address * SHADOW_BLUR_RATIO)),
    },
  };

  if (content.isEmpty && !preferences.showBrand) return empty;
  if (!(frame.width > 0) || !(frame.height > 0)) return empty;
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return empty;

  // O recuo acompanha o quadro, e não o corpo da hora: derivá-lo das métricas
  // faria "texto pequeno" também aproximar o bloco da borda da foto.
  const factor = frameScaleFactor(frame, { allowGrowth });
  const inset = Math.max(1, Math.round(WATERMARK_INSET * factor));

  if (!content.isEmpty) {
    layoutDataBlock({ content, preferences, frame, colors, measure, metrics, inset, texts, rects });
  }

  if (preferences.showBrand) {
    layoutBrand({ preferences, frame, colors, measure, metrics, inset, texts });
  }

  if (content.code !== null && preferences.codePlacement === 'side') {
    layoutSideCode({ code: content.code, frame, colors, measure, metrics, inset, texts });
  }

  return { ...empty, texts, rects };
}

/** Altura da caixa do bloco superior, e onde a tinta dos algarismos cai nela. */
function headerBox(content: WatermarkContent, metrics: ScaleMetrics) {
  if (content.time) {
    // A caixa é a **linha** da hora, não a tinta. Reservar só a tinta apertava
    // o endereço contra os algarismos: o vão caía de 15 px para 6 px.
    return {
      height: metrics.time,
      inkTop: Math.round(metrics.time * TIME_INK_TOP_RATIO),
      inkHeight: Math.round(metrics.time * TIME_INK_HEIGHT_RATIO),
    };
  }

  // Sem hora, o bloco superior ainda existe se houver data ou dia da semana —
  // e precisa de altura própria. Sem isso, data e endereço eram desenhados na
  // mesma linha de base, um sobre o outro.
  const lines = (content.date ? 1 : 0) + (content.weekday ? 1 : 0);
  const lineHeight = Math.round(metrics.secondary * ADDRESS_LINE_HEIGHT_RATIO);

  return { height: lines * lineHeight, inkTop: 0, inkHeight: lines * lineHeight };
}

/** Largura da barra âmbar. Uma só definição, usada na conta e no desenho. */
function ruleWidth(metrics: ScaleMetrics) {
  return Math.max(2, Math.round(metrics.time / 23));
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
  const codeSpacing = metrics.code * CODE_LETTER_SPACING_RATIO;

  // A largura útil desconta o respiro interno, como no container antigo: os
  // 58% eram da âncora, que continha o padding.
  const maxWidth = Math.max(
    metrics.address,
    frame.width * 0.58 - metrics.paddingHorizontal * 2,
  );

  const header = headerBox(content, metrics);

  const addressLines = content.address
    ? wrapText(content.address, metrics.address, 'body', maxWidth, measure)
    : [];
  const addressLineHeight = Math.round(metrics.address * ADDRESS_LINE_HEIGHT_RATIO);
  const addressHeight = addressLines.length * addressLineHeight;

  const codeInBlock = content.code !== null && preferences.codePlacement === 'block';
  const codeHeight = codeInBlock ? Math.round(metrics.code * ADDRESS_LINE_HEIGHT_RATIO) : 0;

  const gapAfterHeader = header.height > 0 && addressHeight > 0 ? metrics.gap : 0;
  const gapBeforeCode = codeInBlock ? Math.round(metrics.gap / 2) : 0;
  const blockHeight = header.height + gapAfterHeader + addressHeight + gapBeforeCode + codeHeight;

  // A largura do cabeçalho entra sempre, e não só quando há hora: data e dia
  // da semana continuam sendo desenhados sem ela, e ficavam de fora da conta
  // — com a âncora à direita, saíam da foto.
  const widths: number[] = [headerWidth(content, metrics, measure)];
  for (const line of addressLines) widths.push(widthOf(line, metrics.address, 'body', measure));
  if (codeInBlock && content.code) {
    widths.push(widthOf(content.code, metrics.code, 'medium', measure, codeSpacing));
  }
  const blockWidth = Math.max(0, ...widths);

  const edge = inset + metrics.paddingHorizontal;
  const rawLeft = left ? edge : frame.width - edge - blockWidth;
  const rawTop = isTop(position)
    ? inset + metrics.paddingVertical
    : frame.height - inset - metrics.paddingVertical - blockHeight;

  // Nada é desenhado fora da foto, mesmo num quadro menor que o bloco.
  const blockLeft = clamp(rawLeft, 0, frame.width - blockWidth);
  const top = clamp(rawTop, 0, frame.height - blockHeight);

  if (preferences.showBackdrop && blockWidth > 0) {
    rects.push({
      x: blockLeft - metrics.paddingHorizontal,
      y: top - metrics.paddingVertical,
      width: blockWidth + metrics.paddingHorizontal * 2,
      height: blockHeight + metrics.paddingVertical * 2,
      color: colors.backdrop,
      radius: Math.round(metrics.paddingHorizontal),
    });
  }

  let cursor = top;

  if (header.height > 0) {
    layoutHeader({
      content, metrics, colors, measure, texts, rects, header, top: cursor,
      // Ancorado à direita, o cabeçalho acompanha a borda direita do bloco —
      // antes ele ficava alinhado à esquerda enquanto o resto ia para a direita.
      x: left
        ? blockLeft
        : blockLeft + blockWidth - headerWidth(content, metrics, measure),
    });
    cursor += header.height + gapAfterHeader;
  }

  for (const line of addressLines) {
    const width = widthOf(line, metrics.address, 'body', measure);
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
    const width = widthOf(content.code, metrics.code, 'medium', measure, codeSpacing);
    texts.push({
      text: content.code,
      x: left ? blockLeft : blockLeft + blockWidth - width,
      baseline: cursor + gapBeforeCode + Math.round(metrics.code * BODY_BASELINE_RATIO),
      size: metrics.code,
      font: 'medium',
      color: colors.text,
      letterSpacing: codeSpacing,
    });
  }
}

/** Largura da primeira linha: hora, barra e o bloco de data ao lado. */
function headerWidth(
  content: WatermarkContent,
  metrics: ScaleMetrics,
  measure: MeasureText,
): number {
  let width = content.time ? widthOf(content.time, metrics.time, 'clock', measure) : 0;

  if (content.showRule) {
    width += Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO);
    width += ruleWidth(metrics);
    width += Math.round(metrics.time * RULE_SPACE_AFTER_RATIO);
  }

  const secondary = Math.max(
    content.date ? widthOf(content.date, metrics.secondary, 'body', measure) : 0,
    content.weekday ? widthOf(content.weekday, metrics.secondary, 'body', measure) : 0,
  );

  return width + secondary;
}

function layoutHeader({
  content, metrics, colors, measure, texts, rects, x, top, header,
}: {
  content: WatermarkContent;
  metrics: ScaleMetrics;
  colors: StampColors;
  measure: MeasureText;
  texts: StampText[];
  rects: StampRect[];
  x: number;
  top: number;
  header: { height: number; inkTop: number; inkHeight: number };
}) {
  let cursor = x;
  const inkTopY = top + header.inkTop;

  if (content.time) {
    // A tinta dos algarismos começa 0,715 do corpo acima da linha de base —
    // medido no próprio Skia. É daí que sai a posição da linha de base.
    texts.push({
      text: content.time,
      x: cursor,
      baseline: inkTopY - Math.round(metrics.time * DIGIT_INK_TOP_FROM_BASELINE),
      size: metrics.time,
      font: 'clock',
      color: colors.text,
    });
    cursor += widthOf(content.time, metrics.time, 'clock', measure);
  }

  if (content.showRule) {
    cursor += Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO);
    // A barra vai do topo à base da tinta dos algarismos — não da caixa de
    // texto, que é maior. É a diferença que se enxerga a olho nu.
    rects.push({
      x: cursor,
      y: inkTopY,
      width: ruleWidth(metrics),
      height: header.inkHeight,
      color: colors.accent,
    });
    cursor += ruleWidth(metrics) + Math.round(metrics.time * RULE_SPACE_AFTER_RATIO);
  }

  // Data encostada no topo da tinta, dia da semana na base: é essa
  // distribuição que reproduz a referência. Com um só dos dois, ele fica no
  // topo — que é o que o `space-between` do layout antigo faz com um filho.
  if (content.date) {
    texts.push({
      text: content.date,
      x: cursor,
      baseline: inkTopY + Math.round(metrics.secondary * BODY_BASELINE_RATIO * 0.73),
      size: metrics.secondary,
      font: 'body',
      color: colors.text,
    });
  }

  if (content.weekday) {
    texts.push({
      text: content.weekday,
      x: cursor,
      baseline: content.date
        ? inkTopY + header.inkHeight
        : inkTopY + Math.round(metrics.secondary * BODY_BASELINE_RATIO * 0.73),
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
  const { brandPosition } = preferences;

  const parts: BrandPart[] = (
    preferences.brandMode === 'custom'
      ? preferences.brandParts
      : ([
          { text: 'Ly', color: 'white' },
          { text: 'mark', color: 'amber' },
        ] as const)
  )
    // A marca não passa por `buildWatermarkContent`, então normaliza aqui —
    // uma razão social digitada com acento decomposto sairia com o sinal ao
    // lado da letra, e não sobre ela.
    .map((part) => ({ ...part, text: stampText(part.text) }))
    .filter((part) => part.text.trim().length > 0);

  // Marca ligada mas sem texto nenhum: não desenha nada, em vez de carimbar
  // um espaço em branco.
  if (parts.length === 0) return;

  const base = Math.round(metrics.address * BRAND_SIZE_RATIO);
  const spacingFor = (size: number) => size * BRAND_LETTER_SPACING_RATIO;

  const widthAt = (size: number) =>
    parts.reduce(
      (total, part) => total + widthOf(part.text, size, 'medium', measure, spacingFor(size)),
      0,
    ) +
    spacingFor(size) * (parts.length - 1);

  // Nome comprido encolhe até caber. O piso evita que uma razão social
  // inteira vire um fio ilegível — a partir dele, a marca invade um pouco a
  // largura reservada, o que ainda é melhor que sumir.
  const maxWidth = frame.width * BRAND_MAX_WIDTH_RATIO;
  const rawWidth = widthAt(base);
  const size =
    rawWidth > maxWidth
      ? Math.max(Math.round(metrics.code * 0.8), Math.floor((base * maxWidth) / rawWidth))
      : base;

  const spacing = spacingFor(size);
  const total = widthAt(size);

  // A âncora da marca usa só o recuo, sem respiro interno — é assim no layout
  // antigo, e somar o padding a deslocaria para dentro.
  const x = clamp(
    isLeft(brandPosition) ? inset : frame.width - inset - total,
    0,
    Math.max(0, frame.width - total),
  );
  const baseline = isTop(brandPosition)
    ? inset + Math.round(size * BODY_BASELINE_RATIO * 0.73)
    : frame.height - inset;

  let cursor = x;

  for (const part of parts) {
    texts.push({
      text: part.text,
      x: cursor,
      baseline,
      size,
      font: 'medium',
      color: colors.palette[part.color] ?? colors.text,
      letterSpacing: spacing,
    });
    cursor += widthOf(part.text, size, 'medium', measure, spacing) + spacing;
  }
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
  const spacing = size * SIDE_CODE_LETTER_SPACING_RATIO;
  const width = widthOf(code, size, 'medium', measure, spacing);

  // Girado −90°, o comprimento do texto corre ao longo da altura da foto. O
  // centro cai a 38% da altura, medido na referência — não na metade.
  const center = frame.height * SIDE_CODE_CENTER_RATIO;

  // Margem proporcional, como todo o resto: em pontos fixos ela sumiria numa
  // imagem de 4000 px.
  const margin = Math.max(1, Math.round((SIDE_CODE_INSET * inset) / WATERMARK_INSET));

  texts.push({
    text: code,
    x: frame.width - margin - Math.round(size * TIME_INK_BOTTOM_GAP * 2),
    baseline: clamp(center + width / 2, width, frame.height),
    size,
    font: 'medium',
    color: colors.text,
    letterSpacing: spacing,
    rotate: -90,
  });
}
