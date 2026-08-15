/**
 * Qual fonte o carimbo precisa para desenhar um texto.
 *
 * O texto que vai para a foto não vem todo do mesmo lugar: a data segue o
 * idioma escolhido, mas o endereço vem do geocodificador no alfabeto do país
 * onde a foto foi tirada. Um técnico brasileiro trabalhando na Rússia tem a
 * interface em português e um endereço em cirílico — o idioma da interface não
 * diz nada sobre o que precisa ser desenhado.
 *
 * Por isso a escolha olha o **conteúdo**, e não a preferência. E olha o
 * conteúdo do jeito literal: cada caractere, contra a lista do que cada fonte
 * de fato tem. `canvas.drawText` desenha com um typeface só, sem cadeia de
 * reserva — o que a fonte não tem vira `.notdef`, o retângulo vazio.
 */

import { WATERMARK_FIELD_KEYS, type CaptureMetadata, type WatermarkPreferences } from '@/types';

import { FONT_COVERAGE } from './font-coverage';

/** Um intervalo fechado de pontos de código. */
export type CodeRange = readonly [start: number, end: number];

/** As famílias embarcadas, na ordem em que o carimbo as prefere. */
export const STAMP_FONT_SCRIPTS = ['latin', 'cyrillic'] as const;

export type StampFontScript = (typeof STAMP_FONT_SCRIPTS)[number];

/** A fonte que um texto exige — ou o aviso de que nenhuma serve. */
export type StampScript =
  | StampFontScript
  /**
   * Nenhuma fonte embarcada desenha este texto: árabe, hebraico, CJK,
   * tailandês, índico.
   *
   * A **data** nunca chega aqui, porque `STAMP_LOCALE` já a faz cair para o
   * inglês. Sobram os dois textos que não passam por aquele mapa — o endereço,
   * que vem do geocodificador no alfabeto do país, e a razão social, que a
   * pessoa digita.
   */
  | 'unsupported';

/**
 * O texto na forma em que o carimbo o desenha.
 *
 * Normaliza para NFC — a forma em que o acento é **um** caractere ("ü"), e não
 * a letra seguida de um sinal combinante ("u" + U+0308). As duas escrevem a
 * mesma palavra e o geocodificador pode devolver qualquer uma delas.
 *
 * Para o carimbo a diferença é grave. `canvas.drawText` mapeia caractere a
 * caractere e não faz *shaping*: um sinal combinante não é posicionado sobre a
 * letra anterior, é desenhado **ao lado**, avançando o cursor. "Müller"
 * decomposto sairia impresso como "Mu¨ller". Junto disso, o sinal combinante
 * também não existe na Roboto Condensed, então a forma decomposta ainda
 * derrubaria o texto inteiro para `unsupported` sem necessidade.
 *
 * Fica aqui, e não em cada chamador, porque a decisão de fonte e o desenho
 * precisam olhar exatamente a mesma cadeia de caracteres.
 */
export function stampText(value: string): string {
  return value.normalize('NFC');
}

/**
 * Busca binária: o ponto de código está em alguma das faixas?
 *
 * As faixas de `font-coverage.ts` vêm ordenadas e sem sobreposição — é assim
 * que o gerador as produz —, então dá para cortar pela metade em vez de
 * percorrer as 77. Importa porque isto roda a cada tecla digitada no endereço.
 */
function contains(ranges: readonly CodeRange[], code: number): boolean {
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const [start, end] = ranges[mid]!;

    if (code < start) high = mid - 1;
    else if (code > end) low = mid + 1;
    else return true;
  }

  return false;
}

/** `true` quando aquela família desenha o texto inteiro, sem um buraco. */
function draws(script: StampFontScript, text: string): boolean {
  const coverage = FONT_COVERAGE[script];

  for (const char of text) {
    if (!contains(coverage, char.codePointAt(0)!)) return false;
  }

  return true;
}

/**
 * A fonte que um conjunto de textos exige.
 *
 * A ordem de `STAMP_FONT_SCRIPTS` é a regra: usa a Barlow se ela desenhar
 * tudo; senão a Roboto Condensed, que traz cirílico, grego e o "№" dos
 * endereços russos; senão avisa que não há fonte.
 *
 * A decisão é sobre o conjunto inteiro, e não texto a texto, porque o carimbo
 * desenha tudo com um typeface só. Um caractere fora do alcance da Barlow
 * arrasta as outras linhas para a Roboto Condensed — o que é seguro, porque a
 * medição que escolheu essa fonte comparou justamente a largura do bloco.
 */
export function scriptFor(...texts: (string | null | undefined)[]): StampScript {
  const joined = stampText(texts.filter(Boolean).join(' '));

  for (const script of STAMP_FONT_SCRIPTS) {
    if (draws(script, joined)) return script;
  }

  return 'unsupported';
}

/**
 * A fonte que **esta foto** exige, olhando tudo que vai ser desenhado.
 *
 * Existe para que a decisão fique num lugar só. Os campos escondidos não
 * contam — texto que não chega à foto não deve trocar a fonte do que chega — e
 * a marca própria conta, porque é digitada pela pessoa e sai no mesmo typeface
 * dos dados: uma razão social em cirílico com endereço em latim ficaria em
 * quadradinhos se só os metadados fossem consultados.
 */
export function scriptForStamp(
  metadata: CaptureMetadata,
  preferences: WatermarkPreferences,
): StampScript {
  const campos = WATERMARK_FIELD_KEYS.filter((key) => preferences.visibleFields[key]).map(
    (key) => metadata[key],
  );

  // A marca do Lymark é latina por definição; só a própria pode trazer outro
  // alfabeto.
  const marca =
    preferences.showBrand && preferences.brandMode === 'custom'
      ? preferences.brandParts.map((part) => part.text)
      : [];

  return scriptFor(...campos, ...marca);
}
