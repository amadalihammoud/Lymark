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

    expect(merged.backdropStyle).toBe('none');
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

  it('escala do logotipo: quem vem de versão antiga fica no automático', () => {
    // Um registro da versão 7 não conhece o campo — e o automático (1) é
    // exatamente a geometria de antes, então a foto de ninguém muda sozinha.
    expect(mergeWithDefaults({}).brandLogoScale).toBe(1);
    expect(mergeWithDefaults({ brandLogoScale: 2 }).brandLogoScale).toBe(2);
  });

  it('escala do logotipo: fora da faixa é contida; lixo cai no padrão', () => {
    expect(mergeWithDefaults({ brandLogoScale: 9 }).brandLogoScale).toBe(2.5);
    expect(mergeWithDefaults({ brandLogoScale: 0.01 }).brandLogoScale).toBe(0.5);
    expect(mergeWithDefaults({ brandLogoScale: Number.NaN }).brandLogoScale).toBe(1);
    expect(mergeWithDefaults({ brandLogoScale: '2' as never }).brandLogoScale).toBe(1);
  });

  it('canto do logotipo: quem vem de versão antiga fica junto ao carimbo', () => {
    // `block` é exatamente o desenho anterior — a foto de ninguém muda sozinha.
    expect(mergeWithDefaults({}).brandLogoPosition).toBe('block');
    expect(mergeWithDefaults({ brandLogoPosition: 'top-right' }).brandLogoPosition).toBe('top-right');
    expect(mergeWithDefaults({ brandLogoPosition: 'meio' as never }).brandLogoPosition).toBe('block');
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
    expect(mergeWithDefaults(legacy).backdropStyle).toBe('none');
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
    expect(migrated.backdropStyle).toBe('block');
    expect(migrated.visibleFields.code).toBe(true);
  });

  it('completa as preferências que o formato antigo nem conhecia', () => {
    const merged = mergeWithDefaults(legacy);

    expect(merged.brandPlacement).toBe(DEFAULT_WATERMARK_PREFERENCES.brandPlacement);
    expect(merged.brandPosition).toBe(DEFAULT_WATERMARK_PREFERENCES.brandPosition);
    expect(merged.codePlacement).toBe(DEFAULT_WATERMARK_PREFERENCES.codePlacement);
  });

  it('trata ausência de versão como formato antigo', () => {
    expect(mergeWithDefaults({ showBackdrop: true }).backdropStyle).toBe('none');
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
    expect(mergeWithDefaults([] as never).backdropStyle).toBe('none');
  });
});

/**
 * A versão 4 acrescenta a marca própria. Quem atualiza precisa continuar com o
 * carimbo Lymark e com as próprias escolhas intactas — a novidade não pode
 * chegar mexendo no que já estava configurado.
 */
describe('migração para a marca própria', () => {
  const v3 = {
    schemaVersion: 3,
    visibleFields: { time: true, date: true, weekday: false, address: true, code: true },
    position: 'top-right',
    scale: 'large',
    showBackdrop: true,
    showBrand: true,
    brandPosition: 'bottom-left',
    codePlacement: 'block',
  } as const;

  it('preserva tudo que o usuário já tinha escolhido', () => {
    const merged = mergeWithDefaults(v3);

    expect(merged.position).toBe('top-right');
    expect(merged.scale).toBe('large');
    expect(merged.backdropStyle).toBe('block');
    expect(merged.brandPosition).toBe('bottom-left');
    expect(merged.codePlacement).toBe('block');
    expect(merged.visibleFields.weekday).toBe(false);
  });

  it('chega com a marca Lymark, sem mudar o que aparece na foto', () => {
    const merged = mergeWithDefaults(v3);

    expect(merged.brandParts[0]).toEqual({ text: 'Ly', color: '#FFFFFF' });
    expect(merged.brandParts[1]).toEqual({ text: 'mark', color: '#F3C218' });
  });

  it('esquece a marca digitada por quem estava no modo Lymark', () => {
    // O par "Lymark / Minha marca" guardava o texto digitado sem carimbá-lo.
    // Agora o que está gravado é o que aparece — e sem esta migração a marca
    // esquecida no armazenamento estrearia sozinha na foto de quem via Ly+mark.
    const merged = mergeWithDefaults({
      ...v3,
      brandMode: 'lymark',
      brandParts: [
        { text: 'ACME', color: '#FFFFFF' },
        { text: ' Ltda', color: '#F5B60D' },
      ],
    } as never);

    expect(merged.brandParts[0]).toEqual({ text: 'Ly', color: '#FFFFFF' });
    expect(merged.brandParts[1]).toEqual({ text: 'mark', color: '#F3C218' });
  });

  it('preserva a marca de quem tinha escolhido a própria', () => {
    const merged = mergeWithDefaults({
      ...v3,
      brandMode: 'custom',
      brandParts: [
        { text: 'ACME', color: '#FFFFFF' },
        { text: ' Ltda', color: '#F5B60D' },
      ],
    } as never);

    expect(merged.brandParts[0].text).toBe('ACME');
    expect(merged.brandParts[1].text).toBe(' Ltda');
  });

  it('não reapaga a marca depois que o campo antigo some do disco', () => {
    // Depois desta migração `brandMode` deixa de ser gravado. Se a condição
    // fosse "diferente de custom", esta leitura — que é a de toda abertura
    // seguinte — devolveria Ly+mark e apagaria o que o usuário digitou.
    const merged = mergeWithDefaults({
      ...v3,
      brandParts: [
        { text: 'ACME', color: '#FFFFFF' },
        { text: '', color: '#F5B60D' },
      ],
    } as never);

    expect(merged.brandParts[0].text).toBe('ACME');
  });

  it('traduz as cores nomeadas da versão 4 para hexadecimal', () => {
    // A versão 4 gravava `'amber'`; a 5 guarda o valor. Sem esta tradução a
    // marca da empresa chegaria com a cor padrão depois da atualização — uma
    // escolha deliberada desfeita por uma mudança interna de formato.
    const merged = mergeWithDefaults({
      ...v3,
      schemaVersion: 4,
      brandParts: [{ text: 'ACME', color: 'green' }, { text: '', color: 'amber' }],
    } as never);

    expect(merged.brandParts[0].color).toBe('#5BD98A');
    expect(merged.brandParts[1].color).toBe('#F3C218');
  });

  it('recusa o que não é cor', () => {
    const merged = mergeWithDefaults({
      ...v3,
      brandParts: [{ text: 'ACME', color: 'roxo' }, { text: '', color: '#12' }],
    } as never);

    expect(merged.brandParts[0].text).toBe('ACME');
    expect(merged.brandParts[0].color).toBe('#FFFFFF');
    expect(merged.brandParts[1].color).toBe('#F3C218');
  });

  it('sobrevive a partes corrompidas caindo no padrão, e não no vazio', () => {
    // Entre carimbar a marca padrão e não carimbar marca nenhuma, a primeira
    // é menos surpreendente: o usuário vê algo e entende que precisa
    // reconfigurar.
    const merged = mergeWithDefaults({
      ...v3,
      brandMode: 'inexistente',
      brandParts: [42, null],
    } as never);

    expect(merged.brandParts[0]).toEqual({ text: 'Ly', color: '#FFFFFF' });
    expect(merged.brandParts[1]).toEqual({ text: 'mark', color: '#F3C218' });
  });

  it('limita o tamanho de cada parte', () => {
    const merged = mergeWithDefaults({
      ...v3,
      brandParts: [{ text: 'A'.repeat(200), color: '#FFFFFF' }, { text: '', color: '#F5B60D' }],
    } as never);

    expect(merged.brandParts[0].text.length).toBeLessThanOrEqual(24);
  });
});

describe('retintura do amarelo para o do Manual de Marca', () => {
  it('troca o amarelo antigo em quem vem de uma versão anterior à 7', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 6,
      stampAccent: '#F5B60D',
      stampTextColor: '#F5B60D',
      brandComplementColor: '#F5B60D',
      brandParts: [
        { text: 'ACME', color: '#F5B60D' },
        { text: ' Ltda', color: '#FFFFFF' },
      ],
    } as never);

    expect(merged.stampAccent).toBe('#F3C218');
    expect(merged.stampTextColor).toBe('#F3C218');
    expect(merged.brandComplementColor).toBe('#F3C218');
    expect(merged.brandParts[0].color).toBe('#F3C218');
  });

  it('não mexe em nenhuma outra cor escolhida', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 6,
      stampAccent: '#63B3ED',
      stampTextColor: '#FF6B57',
      brandParts: [
        { text: 'ACME', color: '#5BD98A' },
        { text: ' Ltda', color: '#111820' },
      ],
    } as never);

    expect(merged.stampAccent).toBe('#63B3ED');
    expect(merged.stampTextColor).toBe('#FF6B57');
    expect(merged.brandParts[0].color).toBe('#5BD98A');
    expect(merged.brandParts[1].color).toBe('#111820');
  });

  it('respeita quem escolhe o amarelo antigo depois de já estar na versão 7', () => {
    // A mesma armadilha da migração de `brandMode`: uma regra de subida que
    // não olha a versão salva volta a rodar a cada abertura e desfaz, todo
    // dia, a escolha que o usuário acabou de fazer.
    const merged = mergeWithDefaults({
      schemaVersion: 7,
      stampAccent: '#F5B60D',
      brandParts: [
        { text: 'ACME', color: '#F5B60D' },
        { text: ' Ltda', color: '#FFFFFF' },
      ],
    } as never);

    expect(merged.stampAccent).toBe('#F5B60D');
    expect(merged.brandParts[0].color).toBe('#F5B60D');
  });
});
