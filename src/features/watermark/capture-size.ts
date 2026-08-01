/**
 * Resolução da imagem exportada.
 *
 * O `view-shot` captura a árvore de views no tamanho em que ela está na
 * tela — algo como 1200 px de largura. Uma foto de celular tem 3000 ou 4000.
 * Exportar sem pedir tamanho jogaria fora dois terços da resolução da foto
 * original, e o registro fotográfico perderia justamente o detalhe que
 * justifica tirá-lo.
 *
 * Pedimos a captura na resolução da foto, com teto: acima disso o bitmap
 * intermediário fica grande demais e aparelhos modestos derrubam o app por
 * falta de memória.
 */

/** Maior lado aceito na exportação, em pixels. */
export const MAX_EXPORT_EDGE = 2560;

export type PixelSize = { width: number; height: number };

/**
 * @returns o tamanho a pedir ao `view-shot`, ou `undefined` para deixar que
 * ele capture no tamanho da tela — o caminho para quando as dimensões da
 * foto são desconhecidas ou inválidas.
 */
export function resolveCaptureSize(source: PixelSize | null | undefined): PixelSize | undefined {
  if (!source) return undefined;

  const { width, height } = source;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width <= 0 || height <= 0) return undefined;

  const longestEdge = Math.max(width, height);
  if (longestEdge <= MAX_EXPORT_EDGE) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  // Reduz proporcionalmente: a proporção precisa continuar igual à do preview,
  // senão a captura sai esticada.
  const factor = MAX_EXPORT_EDGE / longestEdge;
  return {
    width: Math.round(width * factor),
    height: Math.round(height * factor),
  };
}
