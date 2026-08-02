import { SCALE_METRICS, metricsForFrame, scaleMetricsToFrame } from '../layout';

/**
 * A escala do carimbo é o que hoje amarra a foto exportada ao tamanho da
 * tela: os valores estão em pontos calibrados contra um preview de telefone,
 * então o arquivo sai com a resolução da tela e não com a da fotografia.
 *
 * `metricsForFrame` é a peça que desfaz esse laço, e precisa provar duas
 * coisas antes de o renderizador passar a usá-la: que não muda nada no
 * preview de hoje, e que cresce corretamente quando o destino é o arquivo.
 */
const medium = SCALE_METRICS.medium;

/** O quadro para o qual `SCALE_METRICS` foi calibrado: retrato 3:4. */
const REFERENCE = { width: 330, height: 440 };

describe('metricsForFrame — equivalência com o comportamento atual', () => {
  it('devolve os valores calibrados no quadro de referência', () => {
    expect(metricsForFrame(medium, REFERENCE)).toEqual(medium);
  });

  it('reproduz `scaleMetricsToFrame` em qualquer quadro 3:4', () => {
    for (const height of [120, 240, 300, 380, 440, 600]) {
      expect(metricsForFrame(medium, { width: height * 0.75, height })).toEqual(
        scaleMetricsToFrame(medium, height),
      );
    }
  });

  it('não cresce acima do calibrado quando o preview é maior', () => {
    expect(metricsForFrame(medium, { width: 900, height: 1200 })).toEqual(medium);
  });

  it('devolve as métricas intactas quando o quadro ainda não foi medido', () => {
    expect(metricsForFrame(medium, { width: 0, height: 0 })).toEqual(medium);
  });
});

describe('metricsForFrame — o menor dos dois lados', () => {
  it('encolhe pela altura numa panorâmica', () => {
    // 4,4:1 — o caso que cortava a hora para fora da imagem.
    const wide = metricsForFrame(medium, { width: 1320, height: 300 });

    expect(wide.time).toBeLessThan(medium.time);
    expect(wide.time).toBe(scaleMetricsToFrame(medium, 300).time);
  });

  it('encolhe pela largura num quadro alto e estreito', () => {
    // Escalar só pela altura, como hoje, não encolheria nada aqui — e o
    // bloco atravessaria a foto na horizontal.
    const narrow = metricsForFrame(medium, { width: 150, height: 900 });

    expect(narrow.time).toBeLessThan(medium.time);
    expect(scaleMetricsToFrame(medium, 900)).toEqual(medium);
  });

  it('respeita o piso de legibilidade na tela', () => {
    const tiny = metricsForFrame(medium, { width: 20, height: 20 });

    expect(tiny.time).toBe(Math.round(medium.time * 0.45));
  });
});

describe('metricsForFrame — exportação em resolução cheia', () => {
  it('acompanha a resolução do arquivo em vez de parar no tamanho da tela', () => {
    const full = metricsForFrame(medium, { width: 3000, height: 4000 }, { allowGrowth: true });

    expect(full.time).toBe(Math.round(medium.time * (3000 / 330)));
  });

  it('mantém o carimbo na mesma proporção da imagem, seja qual for o tamanho', () => {
    const preview = medium.time / 330;

    for (const width of [660, 1500, 3000, 4000]) {
      const full = metricsForFrame(
        medium,
        { width, height: (width * 4) / 3 },
        { allowGrowth: true },
      );

      expect(full.time / width).toBeCloseTo(preview, 3);
    }
  });

  it('ignora o piso de legibilidade, que é regra de tela', () => {
    const grown = metricsForFrame(medium, { width: 30, height: 40 }, { allowGrowth: true });

    expect(grown.time).toBeLessThan(12);
    expect(grown.time).toBeGreaterThan(0);
  });

  it('preserva a hierarquia entre os elementos ao crescer', () => {
    const full = metricsForFrame(medium, { width: 4000, height: 5333 }, { allowGrowth: true });

    expect(full.time / full.address).toBeCloseTo(medium.time / medium.address, 1);
    expect(full.time).toBeGreaterThan(full.secondary);
  });
});
