import { DEFAULT_WATERMARK_PREFERENCES, mergeWithDefaults } from '../preferences';

/**
 * Esta mescla é a compatibilidade entre versões do app: o que está gravado no
 * aparelho de um usuário foi escrito por uma versão anterior, que pode não ter
 * conhecido todos os campos.
 */
describe('mergeWithDefaults', () => {
  it('devolve o padrão quando não há nada gravado', () => {
    expect(mergeWithDefaults({})).toEqual(DEFAULT_WATERMARK_PREFERENCES);
  });

  it('preserva o que foi gravado', () => {
    const merged = mergeWithDefaults({ position: 'top-right', scale: 'large' });

    expect(merged.position).toBe('top-right');
    expect(merged.scale).toBe('large');
  });

  it('completa campos que a versão antiga não conhecia', () => {
    const merged = mergeWithDefaults({ visibleFields: { time: false } as never });

    expect(merged.visibleFields.time).toBe(false);
    expect(merged.visibleFields.address).toBe(true);
    expect(merged.visibleFields.code).toBe(true);
  });

  it('preserva `false`, que é valor legítimo e não ausência', () => {
    const merged = mergeWithDefaults({ showBackdrop: false });

    expect(merged.showBackdrop).toBe(false);
  });

  it('ignora valores de tipo errado vindos de dado corrompido', () => {
    const merged = mergeWithDefaults({
      visibleFields: { weekday: 'sim' } as never,
    });

    expect(merged.visibleFields.weekday).toBe(true);
  });

  it('não devolve a mesma referência do padrão — mutação não pode vazar', () => {
    const merged = mergeWithDefaults({});

    expect(merged).not.toBe(DEFAULT_WATERMARK_PREFERENCES);
    expect(merged.visibleFields).not.toBe(DEFAULT_WATERMARK_PREFERENCES.visibleFields);
  });
});
