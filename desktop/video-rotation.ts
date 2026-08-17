/**
 * A rotação declarada num vídeo, lida da saída do ffmpeg.
 *
 * Vídeo de celular em pé quase sempre é gravado deitado — 1920x1080 — com
 * uma instrução de girar 90° na hora de exibir. As dimensões que aparecem na
 * linha `Video:` são as CODIFICADAS; o ffmpeg, ao filtrar, já entrega o
 * quadro girado (1080x1920). Quem desenha o carimbo precisa do segundo par:
 * com o primeiro, o overlay sai em paisagem sobre um quadro em retrato —
 * ancorado no meio da imagem e cortado na largura.
 *
 * Duas grafias no mundo real: `displaymatrix: rotation of -90.00 degrees`
 * (o que o ffmpeg atual imprime) e `rotate: 90` nos metadados de arquivos
 * mais antigos. Sem nenhuma das duas, não há rotação.
 *
 * Vive fora de `main.ts` para poder ser testado sem Electron nem ffmpeg —
 * o mesmo motivo de `image-dimensions.ts`.
 */

const DIMENSIONS = /Video:.*?\s(\d{2,5})x(\d{2,5})/;
const DISPLAY_MATRIX = /displaymatrix:\s*rotation of\s*(-?\d+(?:\.\d+)?)\s*degrees/i;
const LEGACY_ROTATE = /^\s*rotate\s*:\s*(-?\d+)/im;

/** Graus declarados no vídeo, ou 0 quando não há rotação. */
export function rotationDegrees(stderr: string): number {
  const matrix = DISPLAY_MATRIX.exec(stderr);
  if (matrix) return Number(matrix[1]);

  const legacy = LEGACY_ROTATE.exec(stderr);
  return legacy ? Number(legacy[1]) : 0;
}

/** A rotação troca os eixos? (90° e 270°, em qualquer sinal.) */
export function swapsAxes(degrees: number): boolean {
  return Math.abs(Math.round(degrees / 90)) % 2 === 1;
}

/**
 * As dimensões de EXIBIÇÃO — as mesmas que o filtro do ffmpeg recebe.
 *
 * `null` quando a saída não traz um par de dimensões reconhecível, que é o
 * sinal de "não é um vídeo que sabemos ler".
 */
export function displayDimensions(stderr: string): { width: number; height: number } | null {
  const dimensions = DIMENSIONS.exec(stderr);
  if (!dimensions) return null;

  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);

  return swapsAxes(rotationDegrees(stderr))
    ? { width: height, height: width }
    : { width, height };
}
