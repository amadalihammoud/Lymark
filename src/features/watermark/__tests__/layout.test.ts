import { WATERMARK_POSITIONS } from '@/types';

import { SCALE_METRICS, resolveAnchorStyle, resolveTextAlign } from '../layout';

describe('resolveAnchorStyle', () => {
  it('ancora no topo ou na base conforme a posição', () => {
    expect(resolveAnchorStyle('top-left')).toMatchObject({ top: expect.any(Number) });
    expect(resolveAnchorStyle('bottom-right')).toMatchObject({
      bottom: expect.any(Number),
    });
  });

  it('nunca fixa os dois lados verticais ao mesmo tempo', () => {
    for (const position of WATERMARK_POSITIONS) {
      const style = resolveAnchorStyle(position);
      expect(style.top === undefined || style.bottom === undefined).toBe(true);
      expect(style.left === undefined || style.right === undefined).toBe(true);
    }
  });

  it('alinha o conteúdo para o lado em que está ancorado', () => {
    expect(resolveAnchorStyle('top-left').alignItems).toBe('flex-start');
    expect(resolveAnchorStyle('top-right').alignItems).toBe('flex-end');
  });

  it('limita a largura para um endereço longo não atravessar a foto', () => {
    for (const position of WATERMARK_POSITIONS) {
      expect(resolveAnchorStyle(position).maxWidth).toBe('85%');
    }
  });
});

describe('resolveTextAlign', () => {
  it('acompanha o lado da âncora', () => {
    expect(resolveTextAlign('top-left')).toBe('left');
    expect(resolveTextAlign('bottom-left')).toBe('left');
    expect(resolveTextAlign('top-right')).toBe('right');
    expect(resolveTextAlign('bottom-right')).toBe('right');
  });
});

describe('SCALE_METRICS', () => {
  it('cresce de forma monotônica do pequeno ao grande', () => {
    expect(SCALE_METRICS.small.fontSize).toBeLessThan(SCALE_METRICS.medium.fontSize);
    expect(SCALE_METRICS.medium.fontSize).toBeLessThan(SCALE_METRICS.large.fontSize);
  });

  it('mantém a altura de linha maior que a fonte, para o texto respirar', () => {
    for (const metrics of Object.values(SCALE_METRICS)) {
      expect(metrics.lineHeight).toBeGreaterThan(metrics.fontSize);
    }
  });
});
