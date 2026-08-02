import { SCALE_METRICS, scaleMetricsToFrame } from '../layout';

/**
 * Tamanhos fixos em pontos assumem foto retrato. Numa panorâmica o frame tem
 * ~70 px de altura e o carimbo ocuparia 160: com `overflow: hidden`, a hora
 * seria cortada para fora da imagem exportada.
 */
describe('scaleMetricsToFrame', () => {
  const base = SCALE_METRICS.medium;

  it('não mexe enquanto a altura não foi medida', () => {
    expect(scaleMetricsToFrame(base, 0)).toBe(base);
    expect(scaleMetricsToFrame(base, -10)).toBe(base);
  });

  it('mantém o tamanho cheio numa foto retrato', () => {
    expect(scaleMetricsToFrame(base, 440)).toBe(base);
    expect(scaleMetricsToFrame(base, 900)).toBe(base);
  });

  it('encolhe o carimbo numa foto baixa e larga', () => {
    const panorama = scaleMetricsToFrame(base, 100);

    expect(panorama.time).toBeLessThan(base.time);
    expect(panorama.address).toBeLessThan(base.address);
  });

  it('nunca encolhe além do piso de legibilidade', () => {
    const extreme = scaleMetricsToFrame(base, 5);

    expect(extreme.time).toBeGreaterThanOrEqual(12);
    expect(extreme.address).toBeGreaterThanOrEqual(8);
    expect(extreme.secondary).toBeGreaterThanOrEqual(7);
  });

  it('preserva a hierarquia: a hora continua dominante depois de encolher', () => {
    for (const height of [60, 120, 200, 320]) {
      const scaled = scaleMetricsToFrame(base, height);
      expect(scaled.time).toBeGreaterThan(scaled.address);
      expect(scaled.address).toBeGreaterThanOrEqual(scaled.secondary);
    }
  });

  it('devolve inteiros — meio pixel de fonte não existe', () => {
    const scaled = scaleMetricsToFrame(base, 137);

    for (const value of Object.values(scaled)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
