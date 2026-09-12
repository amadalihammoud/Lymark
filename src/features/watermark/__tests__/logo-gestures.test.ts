import type { StampImage } from '../stamp-layout';
import { freeFromRect, hitLogo, hitsHandle, movedBy, resizedBy, scaledBy } from '../logo-gestures';

const frame = { width: 400, height: 300 };
const rect: StampImage = { path: 'brand/a.png', logo: 0, x: 100, y: 50, width: 80, height: 40 };

describe('gestos do logotipo', () => {
  it('traduz o retângulo desenhado para centro e largura em frações', () => {
    expect(freeFromRect(rect, frame)).toEqual({
      placement: 'free',
      x: 140 / 400,
      y: 70 / 300,
      width: 0.2,
    });
  });

  it('acha o logotipo sob o dedo, com folga, e o de cima ganha', () => {
    const above: StampImage = { ...rect, logo: 1, x: 150, y: 70 };
    const images = [rect, above];
    expect(hitLogo(images, { x: 160, y: 80 })?.logo).toBe(1);
    expect(hitLogo(images, { x: 105, y: 55 })?.logo).toBe(0);
    // Dentro da folga de 12 px ainda pega; fora, não.
    expect(hitLogo([rect], { x: 92, y: 45 })?.logo).toBe(0);
    expect(hitLogo([rect], { x: 80, y: 45 })).toBeNull();
  });

  it('a alça fica no canto inferior direito', () => {
    expect(hitsHandle(rect, { x: 180, y: 90 })).toBe(true);
    expect(hitsHandle(rect, { x: 100, y: 50 })).toBe(false);
  });

  it('mover desloca o centro e para na borda', () => {
    const moved = movedBy(rect, 30, -10, frame);
    expect(moved.x).toBeCloseTo(170 / 400);
    expect(moved.y).toBeCloseTo(60 / 300);
    expect(moved.width).toBe(0.2);

    const stuck = movedBy(rect, 10_000, 10_000, frame);
    expect(stuck.x).toBeCloseTo((400 - 40) / 400);
    expect(stuck.y).toBeCloseTo((300 - 20) / 300);
  });

  it('a alça redimensiona mantendo o canto superior esquerdo e a proporção', () => {
    const bigger = resizedBy(rect, 80, frame);
    expect(bigger.width).toBe(0.4);
    // Largura 160, altura 80: o centro anda metade do crescimento.
    expect(bigger.x).toBeCloseTo((100 + 80) / 400);
    expect(bigger.y).toBeCloseTo((50 + 40) / 300);
  });

  it('a pinça escala em volta do centro, com piso e teto', () => {
    const doubled = scaledBy(rect, 2, frame);
    expect(doubled.width).toBe(0.4);
    expect(doubled.x).toBeCloseTo(140 / 400);
    expect(doubled.y).toBeCloseTo(70 / 300);

    expect(scaledBy(rect, 0.001, frame).width).toBe(0.04);
    expect(scaledBy(rect, 100, frame).width).toBe(1);
  });
});
