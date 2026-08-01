import { MAX_EXPORT_EDGE, resolveCaptureSize } from '../capture-size';

/**
 * O tamanho pedido ao `view-shot` é o que decide se a foto exportada mantém
 * o detalhe do original ou sai na resolução da tela.
 */
describe('resolveCaptureSize', () => {
  it('mantém a resolução quando a foto cabe no teto', () => {
    expect(resolveCaptureSize({ width: 1920, height: 1080 })).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('reduz proporcionalmente uma foto acima do teto', () => {
    const size = resolveCaptureSize({ width: 4000, height: 3000 });

    expect(size).toEqual({ width: MAX_EXPORT_EDGE, height: 1920 });
  });

  it('respeita o teto também em retrato', () => {
    const size = resolveCaptureSize({ width: 3000, height: 4000 });

    expect(size?.height).toBe(MAX_EXPORT_EDGE);
    expect(size?.width).toBe(1920);
  });

  it('preserva a proporção ao reduzir — captura esticada seria pior que pequena', () => {
    const source = { width: 4032, height: 3024 };
    const size = resolveCaptureSize(source)!;

    const original = source.width / source.height;
    const resulting = size.width / size.height;

    expect(Math.abs(original - resulting)).toBeLessThan(0.01);
  });

  it('devolve inteiros — pixel fracionário não existe', () => {
    const size = resolveCaptureSize({ width: 4001, height: 2999 })!;

    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });

  it('devolve undefined quando as dimensões são desconhecidas ou inválidas', () => {
    expect(resolveCaptureSize(null)).toBeUndefined();
    expect(resolveCaptureSize(undefined)).toBeUndefined();
    expect(resolveCaptureSize({ width: 0, height: 1080 })).toBeUndefined();
    expect(resolveCaptureSize({ width: -10, height: 20 })).toBeUndefined();
    expect(resolveCaptureSize({ width: Number.NaN, height: 100 })).toBeUndefined();
  });
});
