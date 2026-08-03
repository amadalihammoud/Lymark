import { SCALE_METRICS, metricsForFrame } from '../layout';
import { REFERENCE_FRAME_WIDTH, TIME_SIZE_RATIO_MEDIUM } from '../skia-typography';

/**
 * A escala do carimbo é o que amarra a foto exportada ao tamanho da tela: os
 * valores de `SCALE_METRICS` estão em pontos calibrados contra um preview de
 * telefone, então o arquivo sai com a resolução da tela e não com a da
 * fotografia.
 *
 * `metricsForFrame` desfaz esse laço expressando tudo como fração do quadro.
 */
const medium = SCALE_METRICS.medium;

/** O quadro para o qual `SCALE_METRICS` foi calibrado. */
const REFERENCE = { width: REFERENCE_FRAME_WIDTH, height: 440 };

describe('metricsForFrame — âncora na referência', () => {
  it('devolve os valores calibrados no quadro de referência', () => {
    expect(metricsForFrame(medium, REFERENCE)).toEqual(medium);
  });

  it('não cresce acima do calibrado quando o preview é maior', () => {
    expect(metricsForFrame(medium, { width: 900, height: 1200 })).toEqual(medium);
  });

  it('devolve as métricas intactas quando o quadro ainda não foi medido', () => {
    expect(metricsForFrame(medium, { width: 0, height: 0 })).toEqual(medium);
  });
});

/**
 * O fator é o **menor** entre as duas proporções, e é essa a diferença para o
 * renderizador em componentes que existia antes: ele olhava só a altura, o que
 * deixava o tamanho do carimbo depender da largura da tela do aparelho.
 */
describe('metricsForFrame — encolhe pela dimensão que aperta', () => {
  it('encolhe pela altura numa panorâmica', () => {
    // 4,4:1 — o caso que cortava a hora para fora da imagem.
    const wide = metricsForFrame(medium, { width: 1320, height: 300 });

    expect(wide.time).toBe(Math.round(medium.time * (300 / 440)));
  });

  it('encolhe pela largura num quadro alto e estreito', () => {
    const narrow = metricsForFrame(medium, { width: 150, height: 900 });

    expect(narrow.time).toBeLessThan(medium.time);
  });

  it('respeita o piso de legibilidade na tela', () => {
    const tiny = metricsForFrame(medium, { width: 20, height: 20 });

    expect(tiny.time).toBe(Math.round(medium.time * 0.45));
  });
});

describe('metricsForFrame — exportação em resolução cheia', () => {
  it('acompanha a resolução do arquivo em vez de parar no tamanho da tela', () => {
    const full = metricsForFrame(medium, { width: 3000, height: 4000 }, { allowGrowth: true });

    expect(full.time).toBe(Math.round(medium.time * (3000 / REFERENCE_FRAME_WIDTH)));
  });

  it('reproduz a proporção medida na referência', () => {
    // O alvo: a hora ocupa 219 px numa imagem de 1128 px, o que dá um corpo
    // de 0,13225 da largura. É o que torna o carimbo fiel em qualquer tamanho.
    for (const width of [660, 1128, 3000, 4000]) {
      const full = metricsForFrame(
        medium,
        { width, height: (width * 4) / 3 },
        { allowGrowth: true },
      );

      expect(full.time / width).toBeCloseTo(TIME_SIZE_RATIO_MEDIUM, 3);
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

describe('constantes medidas no Skia', () => {
  it('a extensão dos algarismos confere com a medição feita no React Native', () => {
    // 0,730 medido no Skia contra 0,7267 medido no renderizador antigo: menos
    // de 0,5% de diferença, em duas medições independentes.
    const { DIGIT_INK_HEIGHT } = jest.requireActual<
      typeof import('../skia-typography')
    >('../skia-typography');
    const { TIME_INK_HEIGHT_RATIO } = jest.requireActual<typeof import('../layout')>('../layout');

    expect(Math.abs(DIGIT_INK_HEIGHT - TIME_INK_HEIGHT_RATIO)).toBeLessThan(0.005);
  });
});
