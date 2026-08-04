/**
 * Onde a tinta de um logotipo realmente começa e termina.
 *
 * O carimbo ancora o logotipo entre o topo da caixa alta do nome e a linha de
 * base do complemento. Esse alinhamento é exato — mas só do **retângulo**. Quem
 * decide onde a tinta cai dentro do retângulo é o arquivo, e quase todo PNG de
 * logotipo que uma empresa exporta traz folga transparente em volta: a marca
 * aparece deslocada para baixo e menor do que deveria, e o alinhamento pelo
 * qual todo o resto foi medido não se enxerga.
 *
 * Aparar essa folga na importação resolve de uma vez, para qualquer arquivo.
 *
 * Aqui fica só a conta — varrer os pixels e devolver a caixa. Sem Skia, para
 * poder ser testada sem motor gráfico e sem aparelho.
 */

export type InkBounds = { x: number; y: number; width: number; height: number };

/**
 * Limiar de alfa abaixo do qual o pixel conta como vazio.
 *
 * Não é zero: exportadores deixam resíduo de antialiasing e sombras quase
 * apagadas nas bordas, e uma varredura em zero absoluto acharia "tinta" numa
 * fileira que ninguém vê — o recorte não recortaria nada.
 */
const ALPHA_THRESHOLD = 12;

/**
 * A caixa da tinta dentro de um bitmap RGBA.
 *
 * @param pixels RGBA de 8 bits, quatro bytes por pixel, sem premultiplicação.
 * @returns `null` quando a imagem é inteiramente transparente — não há o que
 *   recortar, e recortar mesmo assim daria uma imagem de tamanho zero.
 */
export function findInkBounds(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): InkBounds | null {
  if (width <= 0 || height <= 0) return null;
  if (pixels.length < width * height * 4) return null;

  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;

  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (pixels[row + x * 4 + 3] <= ALPHA_THRESHOLD) continue;

      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  if (bottom < top || right < left) return null;

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * O tamanho de destino, limitado no lado maior.
 *
 * Um logotipo é desenhado com algumas centenas de pixels de largura mesmo numa
 * foto de 4000. Guardar o arquivo original de 4000 px custaria memória a cada
 * exportação sem melhorar nada do que se vê — e alguém vai escolher uma
 * fotografia inteira por engano.
 */
export function fitWithin(
  bounds: { width: number; height: number },
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(bounds.width, bounds.height);
  if (longest <= maxEdge) return { width: bounds.width, height: bounds.height };

  const factor = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(bounds.width * factor)),
    height: Math.max(1, Math.round(bounds.height * factor)),
  };
}
