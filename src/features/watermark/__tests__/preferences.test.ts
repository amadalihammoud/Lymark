import {
  DEFAULT_WATERMARK_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  mergeWithDefaults,
} from '../preferences';

/**
 * Esta mescla é a compatibilidade entre versões do app: o que está gravado no
 * aparelho de um usuário foi escrito por uma versão anterior, que pode não ter
 * conhecido todos os campos — ou ter gravado um padrão que mudou desde então.
 */
describe('mergeWithDefaults', () => {
  const current = { schemaVersion: PREFERENCES_SCHEMA_VERSION };

  it('devolve o padrão quando não há nada gravado', () => {
    expect(mergeWithDefaults({})).toEqual(DEFAULT_WATERMARK_PREFERENCES);
  });

  it('preserva o que foi gravado na versão atual', () => {
    const merged = mergeWithDefaults({ ...current, position: 'top-right', scale: 'large' });

    expect(merged.position).toBe('top-right');
    expect(merged.scale).toBe('large');
  });

  it('completa campos que a versão antiga não conhecia', () => {
    const merged = mergeWithDefaults({
      ...current,
      visibleFields: { time: false } as never,
    });

    expect(merged.visibleFields.time).toBe(false);
    expect(merged.visibleFields.address).toBe(true);
  });

  it('preserva `false`, que é valor legítimo e não ausência', () => {
    const merged = mergeWithDefaults({ ...current, showBackdrop: false });

    expect(merged.showBackdrop).toBe(false);
  });

  it('ignora valores de tipo errado vindos de dado corrompido', () => {
    const merged = mergeWithDefaults({
      ...current,
      visibleFields: { weekday: 'sim' } as never,
    });

    expect(merged.visibleFields.weekday).toBe(true);
  });

  it('recusa `scale` fora do conjunto conhecido', () => {
    // Sem esta validação, SCALE_METRICS[scale] devolveria undefined e a tela
    // quebraria a cada abertura, sem conserto possível dentro do app.
    const merged = mergeWithDefaults({ ...current, scale: 'xlarge' as never });

    expect(merged.scale).toBe(DEFAULT_WATERMARK_PREFERENCES.scale);
  });

  it('recusa `position` fora do conjunto conhecido', () => {
    expect(mergeWithDefaults({ ...current, position: 'middle' as never }).position).toBe(
      DEFAULT_WATERMARK_PREFERENCES.position,
    );
  });

  it('recusa posição de marca e local de código fora do conjunto', () => {
    const merged = mergeWithDefaults({
      ...current,
      brandPosition: 'meio' as never,
      codePlacement: 'flutuante' as never,
    });

    expect(merged.brandPosition).toBe(DEFAULT_WATERMARK_PREFERENCES.brandPosition);
    expect(merged.codePlacement).toBe(DEFAULT_WATERMARK_PREFERENCES.codePlacement);
  });

  it('preserva posição de marca e local de código válidos', () => {
    const merged = mergeWithDefaults({
      ...current,
      brandPosition: 'bottom-right',
      codePlacement: 'block',
    });

    expect(merged.brandPosition).toBe('bottom-right');
    expect(merged.codePlacement).toBe('block');
  });

  it('recusa valores que nem string são', () => {
    const merged = mergeWithDefaults({
      ...current,
      scale: 42 as never,
      position: null as never,
    });

    expect(merged.scale).toBe(DEFAULT_WATERMARK_PREFERENCES.scale);
    expect(merged.position).toBe(DEFAULT_WATERMARK_PREFERENCES.position);
  });

  it('não devolve a mesma referência do padrão — mutação não pode vazar', () => {
    const merged = mergeWithDefaults({});

    expect(merged).not.toBe(DEFAULT_WATERMARK_PREFERENCES);
    expect(merged.visibleFields).not.toBe(DEFAULT_WATERMARK_PREFERENCES.visibleFields);
  });
});

/**
 * Padrões antigos não são escolha de ninguém: quem atualiza precisa receber o
 * layout novo em vez de herdar o anterior para sempre. Vale tanto para a
 * faixa escura, que a versão 1 ligava, quanto para o código, que a versão 2
 * desligou por um erro de leitura da referência.
 */
describe('migração de formatos antigos', () => {
  const legacy = {
    visibleFields: { time: true, date: true, weekday: true, address: true, code: true },
    position: 'top-right',
    scale: 'large',
    showBackdrop: true,
  } as const;

  it('desliga a faixa escura herdada do formato antigo', () => {
    expect(mergeWithDefaults(legacy).showBackdrop).toBe(false);
  });

  it('religa o código, que uma versão anterior desligou por engano', () => {
    expect(mergeWithDefaults({ ...legacy, visibleFields: { ...legacy.visibleFields, code: false } })
      .visibleFields.code).toBe(true);
  });

  it('preserva o que era escolha real do usuário', () => {
    const merged = mergeWithDefaults(legacy);

    expect(merged.position).toBe('top-right');
    expect(merged.scale).toBe('large');
    expect(merged.visibleFields.weekday).toBe(true);
  });

  it('não migra de novo depois que a versão foi gravada', () => {
    const migrated = mergeWithDefaults({
      ...legacy,
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
    });

    // Agora `true` significa escolha deliberada, e precisa ser respeitada.
    expect(migrated.showBackdrop).toBe(true);
    expect(migrated.visibleFields.code).toBe(true);
  });

  it('completa as preferências que o formato antigo nem conhecia', () => {
    const merged = mergeWithDefaults(legacy);

    expect(merged.showBrand).toBe(DEFAULT_WATERMARK_PREFERENCES.showBrand);
    expect(merged.brandPosition).toBe(DEFAULT_WATERMARK_PREFERENCES.brandPosition);
    expect(merged.codePlacement).toBe(DEFAULT_WATERMARK_PREFERENCES.codePlacement);
  });

  it('trata ausência de versão como formato antigo', () => {
    expect(mergeWithDefaults({ showBackdrop: true }).showBackdrop).toBe(false);
  });
});

/**
 * O que está no disco pode não ser um objeto. Uma gravação interrompida deixa
 * `"null"` na chave, e `JSON.parse` devolve `null` — que o leitor classifica
 * como dado encontrado. Ler `.schemaVersion` daí lançava dentro da hidratação
 * e travava a persistência das preferências para sempre.
 */
describe('dado corrompido na raiz', () => {
  it('devolve o padrão em vez de lançar quando o gravado é `null`', () => {
    expect(mergeWithDefaults(null as never)).toEqual(DEFAULT_WATERMARK_PREFERENCES);
  });

  it('devolve o padrão para valores que nem objeto são', () => {
    for (const value of [0, '', 'texto', 42, true, undefined]) {
      expect(mergeWithDefaults(value as never)).toEqual(DEFAULT_WATERMARK_PREFERENCES);
    }
  });

  it('trata array como formato antigo, sem quebrar', () => {
    expect(mergeWithDefaults([] as never).showBackdrop).toBe(false);
  });
});
