import type { BrandLogo } from '@/types';

import { FREE_LOGO_WIDTH_MAX, FREE_LOGO_WIDTH_MIN } from './preferences';
import type { StampFrame, StampImage } from './stamp-layout';

/**
 * A conta por trás de mover e redimensionar um logotipo com o dedo.
 *
 * Pura de propósito, sem gesto nem tela: recebe o retângulo que a geometria
 * desenhou e o deslocamento do dedo, devolve o logotipo livre resultante em
 * frações do quadro. É o que se testa — e o que o preview de 355 px e o
 * arquivo de 4000 têm de concordar.
 */

/** O ajuste que um gesto produz. Sempre livre: mexer no logo é soltá-lo. */
export type FreeLogoPatch = Pick<BrandLogo, 'placement' | 'x' | 'y' | 'width'>;

/** Folga de toque em volta de um logotipo pequeno, em pontos de tela. */
export const HIT_SLOP = 12;

/** Diâmetro da alça de redimensionar, em pontos de tela. */
export const HANDLE_SIZE = 22;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** O retângulo desenhado, traduzido para as frações que o modelo guarda. */
export function freeFromRect(rect: StampImage, frame: StampFrame): FreeLogoPatch {
  return {
    placement: 'free',
    x: clamp((rect.x + rect.width / 2) / frame.width, 0, 1),
    y: clamp((rect.y + rect.height / 2) / frame.height, 0, 1),
    width: clamp(rect.width / frame.width, FREE_LOGO_WIDTH_MIN, FREE_LOGO_WIDTH_MAX),
  };
}

/**
 * Qual logotipo está sob o ponto — o último desenhado ganha, porque é o que
 * está por cima. `null` sem nenhum.
 */
export function hitLogo(images: readonly StampImage[], point: { x: number; y: number }): StampImage | null {
  for (let i = images.length - 1; i >= 0; i -= 1) {
    const rect = images[i];
    if (
      point.x >= rect.x - HIT_SLOP &&
      point.x <= rect.x + rect.width + HIT_SLOP &&
      point.y >= rect.y - HIT_SLOP &&
      point.y <= rect.y + rect.height + HIT_SLOP
    ) {
      return rect;
    }
  }
  return null;
}

/** Se o ponto está sobre a alça do canto inferior direito do retângulo. */
export function hitsHandle(rect: StampImage, point: { x: number; y: number }): boolean {
  const cx = rect.x + rect.width;
  const cy = rect.y + rect.height;
  const r = HANDLE_SIZE / 2 + HIT_SLOP / 2;
  return Math.abs(point.x - cx) <= r && Math.abs(point.y - cy) <= r;
}

/** O retângulo deslocado pelo dedo, ainda contido no quadro. */
export function movedBy(rect: StampImage, dx: number, dy: number, frame: StampFrame): FreeLogoPatch {
  return freeFromRect(
    {
      ...rect,
      x: clamp(rect.x + dx, 0, Math.max(0, frame.width - rect.width)),
      y: clamp(rect.y + dy, 0, Math.max(0, frame.height - rect.height)),
    },
    frame,
  );
}

/**
 * O retângulo redimensionado pela alça: o canto superior esquerdo fica onde
 * está e o inferior direito acompanha o dedo, sem deformar — a largura manda
 * e a altura vem da proporção.
 */
export function resizedBy(rect: StampImage, dx: number, frame: StampFrame): FreeLogoPatch {
  const aspect = rect.width / Math.max(1, rect.height);
  const minWidth = FREE_LOGO_WIDTH_MIN * frame.width;
  const width = clamp(rect.width + dx, minWidth, frame.width);
  return freeFromRect({ ...rect, width, height: width / aspect }, frame);
}

/** O retângulo escalado pela pinça, em volta do próprio centro. */
export function scaledBy(rect: StampImage, factor: number, frame: StampFrame): FreeLogoPatch {
  const aspect = rect.width / Math.max(1, rect.height);
  const minWidth = FREE_LOGO_WIDTH_MIN * frame.width;
  const width = clamp(rect.width * factor, minWidth, frame.width);
  const height = width / aspect;
  return freeFromRect(
    {
      ...rect,
      x: rect.x + (rect.width - width) / 2,
      y: rect.y + (rect.height - height) / 2,
      width,
      height,
    },
    frame,
  );
}
