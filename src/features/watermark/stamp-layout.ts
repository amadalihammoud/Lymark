import type { BrandPart, WatermarkPosition, WatermarkPreferences } from '@/types';

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
import {
  BRAND_CAP_TOP_FROM_BASELINE,
  BRAND_DESCENDER_FROM_BASELINE,
  DIGIT_INK_TOP_FROM_BASELINE,
} from './skia-typography';
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
  /** Raio dos cantos. Só o cartão de fundo arredonda. */
  radius?: number;
  /** De 0 a 1. Só a faixa de fundo usa; o resto é opaco. */
  opacity?: number;
};

/**
 * O logotipo da empresa, num retângulo de destino já resolvido.
 *
 * A geometria não decodifica imagem nenhuma: entrega o caminho e o retângulo,
 * e quem desenha é que resolve os bytes. É o que mantém este módulo testável
 * sem motor gráfico — e o que permite ao preview e à exportação partilharem a
 * mesma conta com um logotipo de resolução diferente em cada um.
 */
export type StampImage = {
  /** Caminho relativo gerido pelo app — ver `logo-file.ts`. */
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StampGeometry = {
  texts: StampText[];
  rects: StampRect[];
  images: StampImage[];
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

/**
 * O cabeçalho da marca — logotipo à esquerda, nome e complemento à direita.
 *
 * A regra de alinhamento é a mesma da barra âmbar, e foi ela que definiu este
 * bloco: a barra vai do **topo da tinta** dos algarismos até a **base da tinta**
 * deles, e não da caixa de linha. Aqui o logotipo vai do topo da tinta do nome
 * até a base da tinta do complemento. É o que faz o conjunto parecer desenhado
 * junto em vez de empilhado.
 *
 * Os limites saem da fonte, e não do texto digitado — `HEITOSGQ` e `gyp`, medidos
 * em `skia-typography.ts`. Ancorar no texto de fato faria o logotipo mudar de
 * tamanho conforme a empresa se chamasse "LIMA" ou "LOGOS", que é o mesmo defeito
 * que a hora teria se fosse medida em `11:11`.
 */
const HEADER_NAME_SIZE_RATIO = 1.6;
const HEADER_COMPLEMENT_SIZE_RATIO = 0.44;
/** Ar entre a base da tinta do nome e o topo da tinta do complemento. */
const HEADER_LEADING_RATIO = 0.24;
/** Vão entre o logotipo e o texto, em frações da altura do conjunto. */
const HEADER_LOGO_GAP_RATIO = 0.2;
/**
 * Quanto o logotipo pode ser mais largo que alto.
 *
 * Com a altura amarrada ao texto, uma assinatura horizontal muito comprida
 * atravessaria a foto. Passando daqui ela é reduzida — perde altura em vez de
 * invadir a imagem.
 */
const HEADER_LOGO_MAX_ASPECT = 2.4;
/** Largura máxima do conjunto, em frações do quadro. */
const HEADER_MAX_WIDTH_RATIO = 0.7;
/** Vão entre o cabeçalho da marca e a linha da hora. */
const HEADER_BOTTOM_GAP_RATIO = 0.42;

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
 * As partes do nome, já sem as vazias.
 *
 * O que está gravado é o que é carimbado — não há mais um modo em que o texto
 * digitado fica guardado sem aparecer. O padrão de fábrica reproduz a marca do
 * próprio app, uma palavra em duas cores, e serve de exemplo do que a marca da
 * empresa pode fazer.
 */
function brandParts(preferences: WatermarkPreferences): BrandPart[] {
  return (
    preferences.brandParts
      // A marca não passa por `buildWatermarkContent`, então normaliza aqui —
      // uma razão social digitada com acento decomposto sairia com o sinal ao
      // lado da letra, e não sobre ela.
      .map((part) => ({ ...part, text: stampText(part.text) }))
      .filter((part) => part.text.trim().length > 0)
  );
}

/**
 * O cabeçalho da marca resolvido, com as posições internas relativas ao canto
 * superior esquerdo do conjunto.
 *
 * Medir e emitir são passos separados porque a largura entra na conta do bloco
 * inteiro — é ela que decide onde o bloco começa quando ancorado à direita —,
 * e nessa hora ainda não se sabe o `x` final.
 */
type BrandLockup = {
  width: number;
  /**
   * O espaço que o conjunto ocupa, descendentes incluídas.
   *
   * Maior que `anchorHeight`: um complemento com "g" ou "p" desce abaixo da
   * linha de base, e sem contar isso a perna da letra encostaria no relógio.
   */
  height: number;
  /**
   * Do topo da tinta do nome à **linha de base** do complemento.
   *
   * É a altura do logotipo. A linha de base, e não a base das descendentes:
   * é nela que o texto se apoia, e um complemento sem nenhuma perna descendo —
   * "Vidros e vistorias" — deixaria o logotipo terminando abaixo de tudo que
   * se vê, como se estivesse afundado no conjunto.
   */
  anchorHeight: number;
  nameSize: number;
  nameBaseline: number;
  complementSize: number;
  complementBaseline: number | null;
  letterSpacing: number;
  /** Onde o texto começa: depois do logotipo, quando existe. */
  textX: number;
  logoWidth: number;
  /**
   * Altura do logotipo, e o quanto ele desce dentro do conjunto.
   *
   * Iguais a `anchorHeight` e a zero no caso comum. Uma assinatura muito
   * horizontal perde altura para não atravessar a foto, e aí é centrada na
   * faixa que o texto ocupa — encostada no topo, ela pareceria solta.
   */
  logoHeight: number;
  logoOffsetY: number;
  parts: BrandPart[];
  complement: string;
};

/**
 * Resolve o conjunto logotipo + nome + complemento.
 *
 * @returns `null` quando não há nada a desenhar — sem nome, sem complemento e
 *   sem logotipo o cabeçalho não existe, em vez de reservar um vão vazio acima
 *   do relógio.
 */
function measureBrandLockup({
  preferences,
  metrics,
  measure,
  maxWidth,
}: {
  preferences: WatermarkPreferences;
  metrics: ScaleMetrics;
  measure: MeasureText;
  maxWidth: number;
}): BrandLockup | null {
  const parts = brandParts(preferences);
  // Mesma normalização das partes: o complemento também é digitado.
  const complement = stampText(preferences.brandComplement).trim();
  const hasLogo = preferences.brandLogoPath !== null;

  if (parts.length === 0 && complement.length === 0 && !hasLogo) return null;

  const at = (nameSize: number): BrandLockup => {
    const complementSize =
      complement.length > 0
        ? Math.max(1, Math.round(nameSize * HEADER_COMPLEMENT_SIZE_RATIO))
        : 0;

    const letterSpacing = nameSize * BRAND_LETTER_SPACING_RATIO;

    // A tinta do nome começa no topo do conjunto: é este ponto que o logotipo
    // acompanha.
    const nameBaseline = Math.round(nameSize * -BRAND_CAP_TOP_FROM_BASELINE);

    const complementBaseline =
      complementSize > 0
        ? nameBaseline +
          Math.round(nameSize * BRAND_DESCENDER_FROM_BASELINE) +
          Math.round(complementSize * HEADER_LEADING_RATIO) +
          Math.round(complementSize * -BRAND_CAP_TOP_FROM_BASELINE)
        : null;

    // O logotipo termina na linha de base da última linha de texto — onde o
    // texto se apoia —, e não onde as descendentes chegam.
    const anchorHeight = complementBaseline ?? nameBaseline;

    // O espaço reservado, esse sim, conta as descendentes: sem isso a perna de
    // um "g" no complemento encostaria no relógio logo abaixo.
    const lastSize = complementBaseline === null ? nameSize : complementSize;
    const height = anchorHeight + Math.round(lastSize * BRAND_DESCENDER_FROM_BASELINE);

    // Uma assinatura muito horizontal **perde altura**, e não largura: limitar
    // só a largura a espremeria, entregando ao cliente uma foto com o logotipo
    // da empresa deformado. A proporção do arquivo é preservada sempre.
    const aspect = Math.max(0.01, preferences.brandLogoAspect);
    const logoHeight = hasLogo
      ? Math.max(1, Math.round(anchorHeight * Math.min(1, HEADER_LOGO_MAX_ASPECT / aspect)))
      : 0;
    const logoWidth = hasLogo ? Math.max(1, Math.round(logoHeight * aspect)) : 0;
    // Encolhido, o logotipo é centrado na faixa do texto; encostado no topo
    // ele pareceria solto acima do nome.
    const logoOffsetY = Math.round((anchorHeight - logoHeight) / 2);

    const textX = hasLogo
      ? logoWidth + Math.max(1, Math.round(anchorHeight * HEADER_LOGO_GAP_RATIO))
      : 0;

    const nameWidth = parts.reduce(
      (total, part) => total + widthOf(part.text, nameSize, 'medium', measure, letterSpacing),
      0,
    );
    const complementWidth =
      complementSize > 0
        ? widthOf(complement, complementSize, 'medium', measure, complementSize * BRAND_LETTER_SPACING_RATIO)
        : 0;

    return {
      width: textX + Math.max(nameWidth, complementWidth),
      height,
      anchorHeight,
      nameSize,
      nameBaseline,
      complementSize,
      complementBaseline,
      letterSpacing,
      textX,
      logoWidth,
      logoHeight,
      logoOffsetY,
      parts,
      complement,
    };
  };

  const base = Math.max(1, Math.round(metrics.address * HEADER_NAME_SIZE_RATIO));
  const first = at(base);
  if (first.width <= maxWidth || first.width === 0) return first;

  // Não cabendo, o conjunto **inteiro** encolhe — logotipo junto —, e nunca é
  // cortado: cortar o nome de uma empresa na foto que ela entrega ao cliente é
  // pior do que uma letra menor. O piso evita que uma razão social comprida
  // vire um fio ilegível; a partir dele o cabeçalho passa da largura reservada,
  // que ainda é melhor do que sumir.
  const floor = Math.max(1, Math.round(metrics.code * 0.9));
  return at(Math.max(floor, Math.floor((base * maxWidth) / first.width)));
}

/** Escreve o conjunto já resolvido na posição final. */
function emitBrandLockup({
  lockup,
  preferences,
  measure,
  x,
  top,
  texts,
  images,
}: {
  lockup: BrandLockup;
  preferences: WatermarkPreferences;
  measure: MeasureText;
  x: number;
  top: number;
  texts: StampText[];
  images: StampImage[];
}) {
  if (preferences.brandLogoPath !== null && lockup.logoWidth > 0) {
    images.push({
      path: preferences.brandLogoPath,
      x,
      y: top + lockup.logoOffsetY,
      width: lockup.logoWidth,
      height: lockup.logoHeight,
    });
  }

  let cursor = x + lockup.textX;

  for (const part of lockup.parts) {
    texts.push({
      text: part.text,
      x: cursor,
      baseline: top + lockup.nameBaseline,
      size: lockup.nameSize,
      font: 'medium',
      color: part.color,
      letterSpacing: lockup.letterSpacing,
    });
    cursor += widthOf(part.text, lockup.nameSize, 'medium', measure, lockup.letterSpacing);
  }

  if (lockup.complementBaseline !== null) {
    texts.push({
      text: lockup.complement,
      x: x + lockup.textX,
      baseline: top + lockup.complementBaseline,
      size: lockup.complementSize,
      font: 'medium',
      color: preferences.brandComplementColor,
      letterSpacing: lockup.complementSize * BRAND_LETTER_SPACING_RATIO,
    });
  }
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
  measure,
  allowGrowth = false,
}: {
  content: WatermarkContent;
  preferences: WatermarkPreferences;
  frame: StampFrame;
    measure: MeasureText;
  allowGrowth?: boolean;
}): StampGeometry {
  const texts: StampText[] = [];
  const rects: StampRect[] = [];
  const images: StampImage[] = [];

  const metrics = metricsForFrame(SCALE_METRICS[preferences.scale], frame, { allowGrowth });
  const empty: StampGeometry = {
    texts,
    rects,
    images,
    shadow: {
      color: 'rgba(0, 0, 0, 0.85)',
      offsetY: Math.max(1, Math.round(metrics.address * SHADOW_OFFSET_RATIO)),
      blur: Math.max(1, Math.round(metrics.address * SHADOW_BLUR_RATIO)),
    },
  };

  const { brandPlacement } = preferences;

  if (content.isEmpty && brandPlacement === 'none') return empty;
  if (!(frame.width > 0) || !(frame.height > 0)) return empty;
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return empty;

  // O recuo acompanha o quadro, e não o corpo da hora: derivá-lo das métricas
  // faria "texto pequeno" também aproximar o bloco da borda da foto.
  const factor = frameScaleFactor(frame, { allowGrowth });
  const inset = Math.max(1, Math.round(WATERMARK_INSET * factor));

  // O cabeçalho vive **dentro** do bloco de dados: é o que faz o conjunto ficar
  // alinhado com o relógio, com a mesma âncora e a mesma faixa de fundo. No
  // canto, a marca é um elemento solto, com âncora própria.
  const lockup =
    brandPlacement === 'header'
      ? measureBrandLockup({
          preferences,
          metrics,
          measure,
          maxWidth: frame.width * HEADER_MAX_WIDTH_RATIO,
        })
      : null;

  if (!content.isEmpty || lockup) {
    layoutDataBlock({
      content, preferences, frame, measure, metrics, inset, lockup, texts, rects, images,
    });
  }

  if (brandPlacement === 'corner') {
    layoutBrand({ preferences, frame, measure, metrics, inset, texts });
  }

  if (content.code !== null && preferences.codePlacement === 'side') {
    layoutSideCode({ code: content.code, preferences, frame, measure, metrics, inset, texts });
  }

  return { ...empty, texts, rects, images };
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
  measure,
  metrics,
  inset,
  lockup,
  texts,
  rects,
  images,
}: {
  content: WatermarkContent;
  preferences: WatermarkPreferences;
  frame: StampFrame;
  measure: MeasureText;
  metrics: ScaleMetrics;
  inset: number;
  /** O cabeçalho da marca, quando ele é o formato escolhido. */
  lockup: BrandLockup | null;
  texts: StampText[];
  rects: StampRect[];
  images: StampImage[];
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

  // O vão sai da altura do próprio conjunto, e não das métricas do carimbo: é
  // ele que define o quanto a marca e o relógio parecem separados, e um nome
  // grande precisa de mais ar do que um pequeno.
  const gapAfterLockup =
    lockup && header.height + addressHeight + codeHeight > 0
      ? Math.max(1, Math.round(lockup.height * HEADER_BOTTOM_GAP_RATIO))
      : 0;
  const lockupHeight = lockup ? lockup.height + gapAfterLockup : 0;

  const blockHeight =
    lockupHeight + header.height + gapAfterHeader + addressHeight + gapBeforeCode + codeHeight;

  // A largura do cabeçalho entra sempre, e não só quando há hora: data e dia
  // da semana continuam sendo desenhados sem ela, e ficavam de fora da conta
  // — com a âncora à direita, saíam da foto.
  const widths: number[] = [headerWidth(content, metrics, measure)];
  if (lockup) widths.push(lockup.width);
  for (const line of addressLines) widths.push(widthOf(line, metrics.address, 'body', measure));
  if (codeInBlock && content.code) {
    widths.push(widthOf(content.code, metrics.code, 'medium', measure, codeSpacing));
  }
  const blockWidth = Math.max(0, ...widths);

  const { backdropStyle } = preferences;

  // O arredondamento é do cartão, e não da faixa contínua. Uma tarja que
  // atravessa a foto e encosta nas bordas é reta em cima e embaixo: arredondada
  // ela vira um painel, que é meio-termo entre as duas opções e embaralha a
  // escolha entre elas.
  //
  // O valor escolhido é em pontos de tela; num arquivo de 4000 px ele precisa
  // crescer junto, senão o canto fica reto.
  const radius =
    backdropStyle === 'block'
      ? Math.max(0, Math.round(preferences.backdropRadius * (metrics.paddingHorizontal / 4)))
      : 0;

  // Um canto arredondado come o espaço da própria curva: com o cartão ligado e
  // o raio no máximo, o texto encostava na volta do canto. A folga cresce com
  // o raio, e o raio zero devolve exatamente a geometria de antes — que é o que
  // mantém o carimbo sem fundo idêntico à referência.
  const padX = metrics.paddingHorizontal + Math.round(radius / 2);
  const padY = metrics.paddingVertical + Math.round(radius / 2);

  const edge = inset + padX;
  const rawLeft = left ? edge : frame.width - edge - blockWidth;
  const rawTop = isTop(position)
    ? inset + padY
    : frame.height - inset - padY - blockHeight;

  // Nada é desenhado fora da foto, mesmo num quadro menor que o bloco.
  const blockLeft = clamp(rawLeft, 0, frame.width - blockWidth);
  const top = clamp(rawTop, 0, frame.height - blockHeight);

  if (backdropStyle !== 'none' && blockWidth > 0) {
    const fill = {
      color: preferences.backdropColor,
      opacity: preferences.backdropOpacity,
      radius,
    };

    if (backdropStyle === 'block') {
      rects.push({
        x: blockLeft - padX,
        y: top - padY,
        width: blockWidth + padX * 2,
        height: blockHeight + padY * 2,
        ...fill,
      });
    } else {
      // A faixa vai de borda a borda e **encosta** na borda em que o carimbo
      // está ancorado. Parar antes dela deixaria um fio da foto embaixo, que lê
      // como erro de alinhamento, não como escolha.
      const innerEdge = isTop(position) ? top + blockHeight + padY : top - padY;

      rects.push({
        x: 0,
        y: isTop(position) ? 0 : innerEdge,
        width: frame.width,
        height: isTop(position) ? innerEdge : frame.height - innerEdge,
        ...fill,
      });
    }
  }

  let cursor = top;

  if (lockup) {
    emitBrandLockup({
      lockup,
      preferences,
      measure,
      // Ancorado à direita, o conjunto acompanha a borda direita do bloco. O
      // logotipo continua à esquerda do nome: isso é a assinatura, não o
      // alinhamento.
      x: left ? blockLeft : blockLeft + blockWidth - lockup.width,
      top: cursor,
      texts,
      images,
    });
    cursor += lockupHeight;
  }

  if (header.height > 0) {
    layoutHeader({
      content, preferences, metrics, measure, texts, rects, header, top: cursor,
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
      color: preferences.stampTextColor,
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
      color: preferences.stampTextColor,
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
  content, preferences, metrics, measure, texts, rects, x, top, header,
}: {
  content: WatermarkContent;
  preferences: WatermarkPreferences;
  metrics: ScaleMetrics;
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
      color: preferences.stampTextColor,
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
      color: preferences.stampAccent,
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
      color: preferences.stampTextColor,
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
      color: preferences.stampTextColor,
    });
  }
}

function layoutBrand({
  preferences, frame, measure, metrics, inset, texts,
}: {
  preferences: WatermarkPreferences;
  frame: StampFrame;
    measure: MeasureText;
  metrics: ScaleMetrics;
  inset: number;
  texts: StampText[];
}) {
  const { brandPosition } = preferences;

  const parts = brandParts(preferences);

  // Marca ligada mas sem texto nenhum: não desenha nada, em vez de carimbar
  // um espaço em branco. O logotipo e o complemento não aparecem aqui — no
  // canto não há altura para eles, e é justamente essa a diferença entre os
  // dois formatos.
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
      color: part.color,
      letterSpacing: spacing,
    });
    cursor += widthOf(part.text, size, 'medium', measure, spacing) + spacing;
  }
}

function layoutSideCode({
  code, preferences, frame, measure, metrics, inset, texts,
}: {
  code: string;
  preferences: WatermarkPreferences;
  frame: StampFrame;
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
    color: preferences.stampTextColor,
    letterSpacing: spacing,
    rotate: -90,
  });
}
