import type { WatermarkPreferences } from '@/types';

import type { WatermarkContent } from '../build-content';
import { SCALE_METRICS } from '../layout';
import { DEFAULT_WATERMARK_PREFERENCES } from '../preferences';
import {
  DIGIT_INK_HEIGHT,
  DIGIT_INK_TOP_FROM_BASELINE,
  TIME_SIZE_RATIO_MEDIUM,
} from '../skia-typography';
import { buildStampGeometry, type MeasureText, type StampGeometry } from '../stamp-layout';

/**
 * A geometria é o que substitui o flexbox do React Native. Sem ela o carimbo
 * só existe no tamanho em que foi desenhado na tela, e é por isso que a foto
 * exportada sai com a resolução do telefone.
 *
 * A medição entra como função para que estes testes rodem sem motor gráfico.
 * O dublê usa o **avanço** medido no Skia — 1,554 corpos para "21:55", contra
 * os 1,468 da tinta. Medir a grandeza errada aqui tornava a suíte incapaz de
 * detectar largura de bloco e ponto de quebra errados, que é justamente o que
 * ela precisa vigiar.
 */
const measure: MeasureText = (text, size, font) =>
  font === 'clock' ? (text.length * size * 1.554) / 5 : text.length * size * 0.53;

const content: WatermarkContent = {
  time: '07:42',
  date: '12 ago. 2026',
  weekday: 'Qua',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
  showRule: true,
  isEmpty: false,
};

/** As cores agora vêm das preferências; estas são as do padrão. */
const colors = {
  text: DEFAULT_WATERMARK_PREFERENCES.stampTextColor,
  accent: DEFAULT_WATERMARK_PREFERENCES.stampAccent,
  backdrop: DEFAULT_WATERMARK_PREFERENCES.backdropColor,
};
const palette = { white: '#FFFFFF', amber: '#F5B60D', red: '#FF6B57', green: '#5BD98A', blue: '#63B3ED', black: '#111820' };
const frame = { width: 355.4, height: 440 };

function build(overrides: Partial<WatermarkPreferences> = {}, extra = {}): StampGeometry {
  return buildStampGeometry({
    content,
    preferences: { ...DEFAULT_WATERMARK_PREFERENCES, ...overrides },
    frame,
    measure,
    ...extra,
  });
}

const find = (g: StampGeometry, text: string) => g.texts.find((t) => t.text === text);

describe('buildStampGeometry — o essencial', () => {
  it('carimba todos os campos ligados', () => {
    const g = build();

    expect(find(g, '07:42')).toBeDefined();
    expect(find(g, '12 ago. 2026')).toBeDefined();
    expect(find(g, 'Qua')).toBeDefined();
    expect(find(g, '98926A73655DC1')).toBeDefined();
    expect(g.texts.some((t) => t.text.includes('Puglisi'))).toBe(true);
  });

  it('hora em 12h: sigla na VERTICAL — letra de cima e M empilhados ao lado', () => {
    const g = buildStampGeometry({
      content: { ...content, time: '2:30 PM' },
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });

    const clock = find(g, '2:30');
    const top = find(g, 'P');
    const bottom = find(g, 'M');
    expect(clock).toBeDefined();
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
    // "2:30 PM" inteiro NÃO é desenhado como uma linha só.
    expect(find(g, '2:30 PM')).toBeUndefined();
    // As letras dividem a mesma coluna, à direita dos algarismos, em corpo
    // menor — e o M fica abaixo da outra letra.
    expect(top!.x).toBe(bottom!.x);
    expect(top!.x).toBeGreaterThan(clock!.x + measure('2:30', clock!.size, 'clock') - 1);
    expect(top!.size).toBeLessThan(clock!.size / 2);
    expect(bottom!.baseline).toBeGreaterThan(top!.baseline);
  });

  it('sigla 12h não se sobrepõe em quadro pequeno: P e M cabem na tinta', () => {
    // Exportação de imagem miúda: as métricas encolhem junto. Um piso em
    // pontos na sigla (que é de tela) empilhava as duas letras uma sobre a
    // outra no arquivo final.
    const tiny = { width: 100, height: 75 };
    const g = buildStampGeometry({
      content: { ...content, time: '2:30 PM' },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, scale: 'small' },
      frame: tiny,
      measure,
      allowGrowth: true,
    });

    const clock = find(g, '2:30');
    const top = find(g, 'P');
    const bottom = find(g, 'M');
    expect(clock && top && bottom).toBeTruthy();
    // Cada letra ocupa no máximo o próprio corpo acima da linha de base; se
    // a de baixo começa depois de a de cima terminar, não há sobreposição.
    expect(bottom!.baseline - top!.baseline).toBeGreaterThanOrEqual(bottom!.size);
  });

  it('hora que não tem a cara do app é desenhada como veio', () => {
    const g = buildStampGeometry({
      content: { ...content, time: 'por volta das 14h' },
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });
    expect(find(g, 'por volta das 14h')).toBeDefined();
  });

  it('não desenha nada quando não há conteúdo nem marca', () => {
    const g = buildStampGeometry({
      content: { ...content, isEmpty: true },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, brandPlacement: 'none' },
      frame,
      measure,
    });

    expect(g.texts).toHaveLength(0);
    expect(g.rects).toHaveLength(0);
  });

  it('não desenha antes de o quadro ser medido', () => {
    const g = build({}, { frame: { width: 0, height: 0 } });

    expect(g.texts).toHaveLength(0);
    expect(g.rects).toHaveLength(0);
  });

  it('não desenha com dimensão inválida, em vez de espalhar NaN', () => {
    // `NaN` passa por qualquer comparação e contaminaria toda a geometria em
    // silêncio: o carimbo sumiria sem erro nenhum.
    for (const frame of [{ width: NaN, height: 440 }, { width: 355, height: NaN }]) {
      const g = build({}, { frame });

      expect(g.texts).toHaveLength(0);
    }
  });

  it('acompanha todo texto com sombra — sem ela o branco some sobre foto clara', () => {
    const g = build();

    expect(g.shadow.color).toContain('rgba');
    expect(g.shadow.blur).toBeGreaterThan(0);
  });
});

describe('a barra âmbar acompanha a tinta dos algarismos', () => {
  it('começa no topo e termina na base dos dígitos', () => {
    const g = build();
    const rule = g.rects.find((r) => r.color === colors.accent);
    const time = find(g, '07:42');

    expect(rule).toBeDefined();
    expect(time).toBeDefined();

    // O topo da tinta fica 0,715 do corpo acima da linha de base.
    const inkTop = time!.baseline + time!.size * DIGIT_INK_TOP_FROM_BASELINE;

    expect(rule!.y).toBeCloseTo(inkTop, 0);
    expect(rule!.height).toBeCloseTo(time!.size * DIGIT_INK_HEIGHT, 0);
  });

  it('fica entre a hora e o bloco de data', () => {
    const g = build();
    const rule = g.rects.find((r) => r.color === colors.accent)!;
    const time = find(g, '07:42')!;
    const date = find(g, '12 ago. 2026')!;

    expect(rule.x).toBeGreaterThan(time.x);
    expect(date.x).toBeGreaterThan(rule.x + rule.width);
  });

  it('some quando não há o que separar', () => {
    const g = buildStampGeometry({
      content: { ...content, date: null, weekday: null, showRule: false },
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });

    expect(g.rects.some((r) => r.color === colors.accent)).toBe(false);
  });
});

describe('ancoragem nos cantos', () => {
  it('encosta à esquerda e embaixo por padrão', () => {
    const g = build({ position: 'bottom-left' });
    const time = find(g, '07:42')!;

    expect(time.x).toBeLessThan(frame.width / 4);
    expect(time.baseline).toBeGreaterThan(frame.height / 2);
  });

  it('encosta à direita quando ancorado à direita', () => {
    const left = find(build({ position: 'bottom-left' }), '07:42')!;
    const right = find(build({ position: 'bottom-right' }), '07:42')!;

    expect(right.x).toBeGreaterThan(left.x);
  });

  it('sobe o bloco quando ancorado no topo', () => {
    const bottom = find(build({ position: 'bottom-left' }), '07:42')!;
    const top = find(build({ position: 'top-left' }), '07:42')!;

    expect(top.baseline).toBeLessThan(bottom.baseline);
  });

  it('mantém o bloco inteiro dentro do quadro', () => {
    for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const g = build({ position, brandPosition: position === 'top-right' ? 'top-left' : 'top-right' });

      for (const t of g.texts) {
        if (t.rotate) continue; // o código girado tem geometria própria
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.baseline).toBeLessThanOrEqual(frame.height);
      }
    }
  });
});

describe('endereço', () => {
  it('quebra em mais de uma linha quando não cabe', () => {
    const g = build();
    const lines = g.texts.filter((t) => t.text.includes('Puglisi') || t.text.includes('Guarujá'));

    expect(lines.length).toBeGreaterThan(1);
  });

  it('nunca ultrapassa 58% da largura, como na referência', () => {
    const g = build();

    for (const t of g.texts.filter((x) => x.font === 'body' && x.text.includes(','))) {
      expect(measure(t.text, t.size, t.font)).toBeLessThanOrEqual(frame.width * 0.58);
    }
  });

  it('empilha as linhas de cima para baixo', () => {
    const g = build();
    const lines = g.texts.filter((t) => t.font === 'body' && t.text.length > 10);

    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].baseline).toBeGreaterThan(lines[i - 1].baseline);
    }
  });
});

describe('código de foto', () => {
  it('gira na lateral direita quando a preferência é lateral', () => {
    const code = find(build({ codePlacement: 'side' }), '98926A73655DC1')!;

    expect(code.rotate).toBe(-90);
    expect(code.x).toBeGreaterThan(frame.width * 0.9);
  });

  it('entra no bloco, sem giro, quando a preferência é bloco', () => {
    const code = find(build({ codePlacement: 'block' }), '98926A73655DC1')!;

    expect(code.rotate).toBeUndefined();
    expect(code.x).toBeLessThan(frame.width / 2);
  });
});

describe('marca do app', () => {
  it('vai para o canto próprio, independente do bloco de dados', () => {
    const g = build({ position: 'bottom-left', brandPosition: 'top-right' });
    const brand = find(g, 'Ly')!;
    const time = find(g, '07:42')!;

    expect(brand.baseline).toBeLessThan(time.baseline);
    expect(brand.x).toBeGreaterThan(time.x);
  });

  it('é bicolor: "Ly" no branco do carimbo e "mark" no âmbar', () => {
    const g = build();
    const head = find(g, 'Ly')!;
    const tail = find(g, 'mark')!;

    expect(head.color).toBe(colors.text);
    expect(tail.color).toBe(colors.accent);
    // Emendados, sem espaço: é uma palavra só, em duas cores. O avanço de
    // "Ly" inclui o espaçamento entre caracteres, que o desenho aplica.
    const spacing = head.letterSpacing ?? 0;
    expect(tail.x).toBeCloseTo(head.x + measure('Ly', head.size, 'medium') + spacing * 2, 5);
    expect(tail.baseline).toBe(head.baseline);
  });

  it('some quando desligada', () => {
    const g = build({ brandPlacement: 'none' });

    expect(find(g, 'Ly')).toBeUndefined();
    expect(find(g, 'mark')).toBeUndefined();
  });
});

describe('faixa de fundo', () => {
  it('só aparece quando ligada, e cobre o bloco', () => {
    expect(build({ backdropStyle: 'none' }).rects.some((r) => r.color === colors.backdrop))
      .toBe(false);

    const g = build({ backdropStyle: 'block' });
    const backdrop = g.rects.find((r) => r.color === colors.backdrop)!;
    const time = find(g, '07:42')!;

    expect(backdrop.x).toBeLessThanOrEqual(time.x);
    expect(backdrop.width).toBeGreaterThan(0);
  });
});

describe('independência de resolução', () => {
  it('produz o mesmo desenho, em escala, num quadro dez vezes maior', () => {
    const small = build();
    const big = buildStampGeometry({
      content,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame: { width: frame.width * 10, height: frame.height * 10 },
      measure,
      allowGrowth: true,
    });

    const s = find(small, '07:42')!;
    const b = find(big, '07:42')!;

    expect(b.size / s.size).toBeCloseTo(10, 0);
    expect(b.x / s.x).toBeCloseTo(10, 0);
    expect(b.baseline / s.baseline).toBeCloseTo(10, 0);
  });

  it('mantém a hora na proporção medida na referência em qualquer largura', () => {
    for (const width of [1128, 3000, 4000]) {
      const g = buildStampGeometry({
        content,
        preferences: DEFAULT_WATERMARK_PREFERENCES,
        frame: { width, height: (width * 4) / 3 },
        measure,
        allowGrowth: true,
      });

      // O invariante é o corpo da hora como fração da largura da imagem —
      // 0,13225, derivado do alvo de 219 px de tinta numa imagem de 1128.
      // Comparar a largura medida contra 219/1128 seria tautológico: o dublê
      // mede avanço, e o alvo é tinta.
      const time = find(g, '07:42')!;
      expect(time.size / width).toBeCloseTo(TIME_SIZE_RATIO_MEDIUM, 3);
    }
  });

  it('não cresce além do calibrado quando o destino é a tela', () => {
    const g = buildStampGeometry({
      content,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame: { width: 3000, height: 4000 },
      measure,
    });

    expect(find(g, '07:42')!.size).toBe(SCALE_METRICS.medium.time);
  });
});

/**
 * Cada teste abaixo tranca um defeito que a revisão encontrou executando
 * cenários — nenhum deles seria pego pelas asserções anteriores, que só
 * verificavam presença e ordem.
 */
describe('defeitos encontrados na revisão', () => {
  const withoutTime: WatermarkContent = { ...content, time: null, showRule: false };

  it('sem hora, data e endereço não se sobrepõem', () => {
    const g = buildStampGeometry({
      content: withoutTime,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });

    const date = find(g, '12 ago. 2026')!;
    const address = g.texts.find((t) => t.text.includes('Puglisi'))!;

    // Antes as duas caíam exatamente na mesma linha de base.
    expect(address.baseline).toBeGreaterThan(date.baseline);
  });

  it('sem hora, nada é desenhado acima do topo do quadro', () => {
    const g = buildStampGeometry({
      content: withoutTime,
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, position: 'bottom-left' },
      frame,
      measure,
    });

    for (const t of g.texts) {
      expect(t.baseline).toBeGreaterThan(0);
    }
  });

  it('sem hora e ancorado à direita, data e dia continuam dentro da foto', () => {
    const g = buildStampGeometry({
      content: { ...withoutTime, address: 'Rua A, 5' },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, position: 'bottom-right' },
      frame,
      measure,
    });

    for (const t of g.texts.filter((x) => !x.rotate)) {
      const width = measure(t.text, t.size, t.font);
      expect(t.x + width).toBeLessThanOrEqual(frame.width + 0.5);
    }
  });

  it('ancorado à direita, o cabeçalho acompanha a borda direita do bloco', () => {
    const g = buildStampGeometry({
      content: { ...content, address: 'Avenida Senador Pinheiro Machado, 1024' },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, position: 'bottom-right' },
      frame,
      measure,
    });

    const date = find(g, '12 ago. 2026')!;
    const lines = g.texts.filter((t) => t.font === 'body' && t.text.includes(','));
    const blockRight = Math.max(
      ...lines.map((t) => t.x + measure(t.text, t.size, t.font)),
    );

    // O fim da data é a borda direita do cabeçalho.
    expect(date.x + measure(date.text, date.size, 'body')).toBeCloseTo(blockRight, 0);
  });

  it('palavra longa demais é quebrada, e o bloco não sai da foto', () => {
    const g = buildStampGeometry({
      content: { ...content, address: 'A'.repeat(60) },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, position: 'bottom-right' },
      frame,
      measure,
    });

    const lines = g.texts.filter((t) => t.text.startsWith('AAA'));

    expect(lines.length).toBeGreaterThan(1);
    for (const t of g.texts.filter((x) => !x.rotate)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('a largura da barra usada na conta é a mesma do desenho', () => {
    // Divergiam: 2 fixo na conta, `time/23` no desenho. Numa exportação
    // grande, o bloco estourava dezenas de pixels para fora.
    const g = buildStampGeometry({
      content,
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, position: 'bottom-right' },
      frame: { width: 3000, height: 4000 },
      measure,
      allowGrowth: true,
    });

    const rule = g.rects.find((r) => r.color === colors.accent)!;
    const date = find(g, '12 ago. 2026')!;

    expect(rule.width).toBeGreaterThan(2);
    expect(date.x).toBeGreaterThanOrEqual(rule.x + rule.width);
    expect(date.x + measure(date.text, date.size, 'body')).toBeLessThanOrEqual(3000);
  });

  it('dia da semana sem data fica no topo da tinta, não na base', () => {
    const soloWeekday = buildStampGeometry({
      content: { ...content, date: null },
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });
    const withDate = buildStampGeometry({
      content,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      measure,
    });

    // Com data, o dia vai para a base; sozinho, sobe — é o que o
    // `space-between` do layout antigo faz com um único filho.
    expect(find(soloWeekday, 'Qua')!.baseline).toBeLessThan(find(withDate, 'Qua')!.baseline);
  });

  it('o endereço quebra descontando o respiro interno, como o container antigo', () => {
    const g = build();
    const metrics = SCALE_METRICS.medium;
    const util = frame.width * 0.58 - metrics.paddingHorizontal * 2;

    for (const t of g.texts.filter((x) => x.font === 'body' && x.text.includes(','))) {
      expect(measure(t.text, t.size, t.font)).toBeLessThanOrEqual(util);
    }
  });

  it('o recuo até a borda não muda com a preferência de tamanho do texto', () => {
    // O recuo da âncora é fixo; só o respiro interno acompanha a escala, como
    // no layout antigo. Derivar o recuo do corpo da hora fazia "pequeno"
    // também aproximar o bloco da borda da foto, que é outra decisão.
    const small = find(build({ scale: 'small' }), '07:42')!;
    const large = find(build({ scale: 'large' }), '07:42')!;

    const paddingDelta =
      SCALE_METRICS.large.paddingHorizontal - SCALE_METRICS.small.paddingHorizontal;

    expect(large.x - small.x).toBe(paddingDelta);
  });
});

/**
 * A marca própria: o técnico não quer entregar ao cliente uma foto com a marca
 * do fornecedor de software dele. São **partes**, e não palavras — "Lymark" é
 * uma palavra só em duas cores, e o mesmo vale para "AutoGlass".
 */
describe('marca própria', () => {
  const custom = (parts: WatermarkPreferences['brandParts']) =>
    build({ brandParts: parts });

  it('carimba as partes configuradas, cada uma na sua cor', () => {
    const g = custom([
      { text: 'CONSTRUTORA', color: palette.white },
      { text: ' SILVA', color: palette.red },
    ]);

    expect(find(g, 'CONSTRUTORA')!.color).toBe(palette.white);
    expect(find(g, ' SILVA')!.color).toBe(palette.red);
    expect(find(g, 'Ly')).toBeUndefined();
  });

  it('desenha as partes coladas, para nomes emendados', () => {
    const g = custom([
      { text: 'Auto', color: palette.white },
      { text: 'Glass', color: palette.blue },
    ]);

    const head = find(g, 'Auto')!;
    const tail = find(g, 'Glass')!;
    const spacing = head.letterSpacing ?? 0;

    expect(tail.x).toBeCloseTo(
      head.x + measure('Auto', head.size, 'medium') + spacing * 4,
      4,
    );
    expect(tail.baseline).toBe(head.baseline);
  });

  it('aceita marca de cor única, com a segunda parte vazia', () => {
    const g = custom([
      { text: 'TECNOSUL', color: palette.green },
      { text: '', color: palette.amber },
    ]);

    expect(find(g, 'TECNOSUL')!.color).toBe(palette.green);
    expect(g.texts.filter((t) => t.font === 'medium' && !t.rotate)).toHaveLength(1);
  });

  it('não carimba nada quando as duas partes estão vazias', () => {
    // Marca ligada mas sem texto não pode virar um espaço em branco na foto.
    const g = custom([
      { text: '', color: 'white' },
      { text: '   ', color: 'amber' },
    ]);

    expect(g.texts.filter((t) => t.font === 'medium' && !t.rotate)).toHaveLength(0);
  });

  it('reduz o corpo de um nome comprido em vez de cortá-lo', () => {
    const curto = custom([{ text: 'ABC', color: 'white' }, { text: '', color: 'amber' }]);
    const longo = custom([
      { text: 'TRANSPORTADORA RODOVI', color: 'white' },
      { text: 'ÁRIA DO LITORAL', color: 'amber' },
    ]);

    const head = find(longo, 'TRANSPORTADORA RODOVI')!;

    expect(head.size).toBeLessThan(find(curto, 'ABC')!.size);
    // Cortar o nome de uma empresa na foto que ela entrega ao cliente é pior
    // que uma letra menor — o texto tem de sair inteiro.
    expect(head.text).toBe('TRANSPORTADORA RODOVI');
    expect(find(longo, 'ÁRIA DO LITORAL')).toBeDefined();
  });

  it('mantém a marca dentro da foto mesmo com nome comprido', () => {
    const g = build({
      brandPosition: 'top-right',
      brandParts: [
        { text: 'TRANSPORTADORA', color: 'white' },
        { text: ' RODOVIÁRIA', color: 'amber' },
      ],
    });

    for (const t of g.texts.filter((x) => x.font === 'medium' && !x.rotate)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + measure(t.text, t.size, 'medium')).toBeLessThanOrEqual(frame.width + 1);
    }
  });
});

/**
 * O cabeçalho da marca — logotipo à esquerda, nome e complemento à direita.
 *
 * A regra que este bloco vigia é uma só, e é a mesma da barra âmbar: o
 * alinhamento é pela **tinta**, não pela caixa de linha. O topo do logotipo
 * acompanha o topo da tinta do nome; a base dele, a base da tinta do
 * complemento. Alinhar pela caixa faria o logotipo sobrar acima e abaixo do
 * texto — a diferença que se enxerga a olho nu.
 */
describe('cabeçalho da marca', () => {
  const header = (overrides: Partial<WatermarkPreferences> = {}) =>
    build({
      brandPlacement: 'header',
      brandParts: [
        { text: 'AUTO', color: palette.white },
        { text: 'GLASS', color: palette.amber },
      ],
      brandComplement: 'Vidros automotivos',
      ...overrides,
    });

  it('põe nome e complemento acima do relógio, e não num canto', () => {
    const g = header();

    const nome = find(g, 'AUTO')!;
    const complemento = find(g, 'Vidros automotivos')!;
    const hora = find(g, '07:42')!;

    expect(nome.baseline).toBeLessThan(hora.baseline);
    expect(complemento.baseline).toBeGreaterThan(nome.baseline);
    expect(complemento.baseline).toBeLessThan(hora.baseline);
    // O nome domina; o complemento é a linha de apoio.
    expect(complemento.size).toBeLessThan(nome.size);
  });

  it('ancora o logotipo do topo da tinta do nome à linha de base do complemento', () => {
    const g = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 1 });

    const logo = g.images[0];
    const nome = find(g, 'AUTO')!;
    const complemento = find(g, 'Vidros automotivos')!;

    // O topo vem da fonte, medido no próprio Skia: a caixa alta do Barlow 500
    // começa 0,71 do corpo acima da linha de base.
    expect(logo.y).toBeCloseTo(nome.baseline - Math.round(nome.size * 0.71), 0);
    // A base é a **linha de base**, e não onde as descendentes chegam. Um
    // complemento sem nenhuma perna descendo deixaria o logotipo terminando
    // abaixo de tudo que se vê, como se estivesse afundado no conjunto.
    expect(logo.y + logo.height).toBe(complemento.baseline);
  });

  it('reserva espaço para as descendentes, mesmo o logotipo parando na base', () => {
    // O logotipo para na linha de base; o **espaço** reservado desce até o fim
    // das descendentes. Sem isso a perna de um "g" encostaria no relógio.
    const g = header({
      brandLogoPath: 'brand/abc.png',
      brandComplement: 'Vidros e pergolados',
    });

    const logo = g.images[0];
    const complemento = find(g, 'Vidros e pergolados')!;
    const hora = find(g, '07:42')!;
    const descendente = complemento.baseline + complemento.size * 0.2;

    expect(logo.y + logo.height).toBe(complemento.baseline);
    expect(hora.baseline - hora.size * 0.715).toBeGreaterThan(descendente);
  });

  it('não muda de altura conforme as letras digitadas', () => {
    // "LIMA" não tem redondas nem descendentes; "LOGOS gp" tem as duas. Se a
    // âncora saísse do texto de fato, o logotipo mudaria de tamanho conforme o
    // nome da empresa — o mesmo defeito que a barra âmbar teria se fosse
    // medida em "11:11".
    const reto = header({
      brandLogoPath: 'brand/abc.png',
      brandParts: [{ text: 'LIMA', color: palette.white }, { text: '', color: palette.amber }],
      brandComplement: 'Vistorias',
    });
    const redondo = header({
      brandLogoPath: 'brand/abc.png',
      brandParts: [{ text: 'LOGOS', color: palette.white }, { text: '', color: palette.amber }],
      brandComplement: 'Vistorias gp',
    });

    expect(redondo.images[0].height).toBe(reto.images[0].height);
  });

  it('assinatura horizontal vira FAIXA na largura do bloco, sem deformar', () => {
    // Antes, acima de 2,4 de proporção o logotipo perdia altura até virar um
    // selo minúsculo ao lado do nome. Agora ele adota a largura do bloco de
    // dados, acima do relógio. A proporção do arquivo segue intocável —
    // deformar o logotipo da empresa nunca foi opção.
    const g = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 4 });
    const logo = g.images[0];
    const hora = find(g, '07:42')!;

    expect(logo.width / logo.height).toBeCloseTo(4, 1);

    // Acima do relógio: a base da faixa fica antes do topo da tinta da hora.
    expect(logo.y + logo.height).toBeLessThan(hora.baseline - hora.size * 0.715);

    // Na largura do bloco: a borda direita da faixa acompanha a borda do
    // elemento mais largo. A tolerância é o arredondar de altura e largura.
    const rightEdge = Math.max(
      ...g.texts
        .filter((t) => !t.rotate)
        .map(
          (t) =>
            t.x +
            measure(t.text, t.size, t.font) +
            (t.letterSpacing ?? 0) * Math.max(0, t.text.length - 1),
        ),
    );
    expect(Math.abs(logo.x + logo.width - rightEdge)).toBeLessThanOrEqual(4);
  });

  it('na faixa, o texto da marca desce para baixo da assinatura', () => {
    const g = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 4 });
    const logo = g.images[0];
    const nome = find(g, 'AUTO')!;

    // O topo da tinta do nome fica abaixo da base da faixa, com um respiro —
    // a assinatura é a primeira linha do conjunto, o texto a segunda.
    expect(nome.baseline - Math.round(nome.size * 0.71)).toBeGreaterThan(logo.y + logo.height);
  });

  it('a escala manual muda o logotipo proporcionalmente, sem deformar', () => {
    const base = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 1 });
    const grande = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 1, brandLogoScale: 2 });
    const pequeno = header({
      brandLogoPath: 'brand/abc.png',
      brandLogoAspect: 1,
      brandLogoScale: 0.5,
    });

    // O 1 px de folga é o arredondar da metade de uma âncora ímpar.
    expect(Math.abs(grande.images[0].height - base.images[0].height * 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(pequeno.images[0].height - base.images[0].height / 2)).toBeLessThanOrEqual(1);

    for (const g of [base, grande, pequeno]) {
      expect(g.images[0].width / g.images[0].height).toBeCloseTo(1, 1);
    }
  });

  it('escala acima de 1: o conjunto cresce sem o logotipo invadir o relógio', () => {
    const g = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: 1, brandLogoScale: 2 });

    const logo = g.images[0];
    const hora = find(g, '07:42')!;

    // O logotipo maior que a faixa do texto empurra o bloco a crescer — a
    // tinta da hora continua inteira abaixo dele.
    expect(hora.baseline - hora.size * 0.715).toBeGreaterThan(logo.y + logo.height);
  });

  it('canto próprio: o logo sai do cabeçalho e ancora sozinho no canto', () => {
    const g = header({
      brandLogoPath: 'brand/abc.png',
      brandLogoAspect: 1,
      brandLogoPosition: 'top-right',
    });

    // Um logo só — o do canto; o cabeçalho fica com nome e complemento.
    expect(g.images).toHaveLength(1);
    const logo = g.images[0];

    // Régua do canto: a linha da hora (47 no quadro de referência).
    expect(logo.height).toBe(47);
    expect(logo.y).toBe(6);
    expect(logo.x + logo.width).toBeCloseTo(frame.width - 6, 0);

    // O nome continua acima do relógio, sem o logo ao lado.
    expect(find(g, 'AUTO')).toBeDefined();
  });

  it('canto próprio: a escala manual vale no canto, sem deformar', () => {
    const g = header({
      brandLogoPath: 'brand/abc.png',
      brandLogoAspect: 2,
      brandLogoScale: 0.5,
      brandLogoPosition: 'bottom-right',
    });
    const logo = g.images[0];

    expect(logo.height).toBe(Math.round(47 * 0.5));
    expect(logo.width / logo.height).toBeCloseTo(2, 1);
    expect(logo.y + logo.height).toBeCloseTo(frame.height - 6, 0);
  });

  it('canto próprio: o logo é carimbado mesmo sem marca e sem dado nenhum', () => {
    const g = buildStampGeometry({
      content: { time: null, date: null, weekday: null, address: null, code: null, showRule: false, isEmpty: true },
      preferences: {
        ...DEFAULT_WATERMARK_PREFERENCES,
        brandPlacement: 'none',
        brandLogoPath: 'brand/abc.png',
        brandLogoPosition: 'top-left',
      },
      frame,
      measure,
    });

    expect(g.images).toHaveLength(1);
    expect(g.images[0].x).toBe(6);
    expect(g.images[0].y).toBe(6);
    expect(g.texts).toHaveLength(0);
  });

  it('a faixa respeita o teto de altura e a largura reservada ao cabeçalho', () => {
    // Escala no máximo, proporção logo acima do limiar: o caso que mais
    // empurra a faixa. O 1,7 de folga é o arredondar de altura e largura.
    const g = header({
      brandLogoPath: 'brand/abc.png',
      brandLogoAspect: 2.5,
      brandLogoScale: 2.5,
    });
    const logo = g.images[0];

    expect(logo.height).toBeLessThanOrEqual((frame.width * 0.7) / 2.5 + 1);
    expect(logo.width).toBeLessThanOrEqual(frame.width * 0.7 + 3);
  });

  it('não deforma nem com proporção absurda vinda de um registro corrompido', () => {
    for (const aspect of [0.01, 0.2, 5, 100]) {
      const g = header({ brandLogoPath: 'brand/abc.png', brandLogoAspect: aspect });
      const logo = g.images[0];

      expect(logo.width).toBeGreaterThan(0);
      expect(logo.height).toBeGreaterThan(0);
      expect(Number.isFinite(logo.width)).toBe(true);
    }
  });

  it('mantém o logotipo à esquerda do nome mesmo ancorado à direita', () => {
    const g = header({
      position: 'bottom-right',
      brandLogoPath: 'brand/abc.png',
      brandLogoAspect: 1,
    });

    const logo = g.images[0];
    const nome = find(g, 'AUTO')!;

    // O logotipo à esquerda é a assinatura, não o alinhamento: espelhá-lo
    // quando o bloco vai para a direita quebraria a leitura da marca.
    expect(logo.x + logo.width).toBeLessThanOrEqual(nome.x);
    expect(logo.x).toBeGreaterThanOrEqual(0);
  });

  it('reserva a largura do cabeçalho na conta do bloco', () => {
    const g = header({
      position: 'bottom-right',
      brandParts: [
        { text: 'TRANSPORTADORA', color: palette.white },
        { text: ' LITORAL', color: palette.amber },
      ],
      brandComplement: '',
    });

    for (const t of g.texts.filter((x) => !x.rotate)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + measure(t.text, t.size, t.font)).toBeLessThanOrEqual(frame.width + 1);
    }
  });

  it('encolhe o conjunto inteiro quando o nome não cabe', () => {
    const curto = header({ brandParts: [
      { text: 'ACME', color: palette.white },
      { text: '', color: palette.amber },
    ] });
    const longo = header({ brandParts: [
      { text: 'TRANSPORTADORA RODOVI', color: palette.white },
      { text: 'ÁRIA UNIDA DO LITORAL', color: palette.amber },
    ] });

    expect(find(longo, 'TRANSPORTADORA RODOVI')!.size).toBeLessThan(find(curto, 'ACME')!.size);
    // O complemento acompanha: encolher só o nome desmontaria a proporção do
    // conjunto.
    expect(find(longo, 'Vidros automotivos')!.size).toBeLessThan(
      find(curto, 'Vidros automotivos')!.size,
    );
  });

  it('não reserva espaço quando não há nome, complemento nem logotipo', () => {
    const g = header({
      brandParts: [{ text: '', color: palette.white }, { text: '  ', color: palette.amber }],
      brandComplement: '',
    });

    const semMarca = build({ brandPlacement: 'none' });

    expect(g.images).toHaveLength(0);
    // Sem nada a assinar, o relógio fica onde ficaria sem cabeçalho nenhum —
    // e não deslocado por um vão vazio.
    expect(find(g, '07:42')!.baseline).toBe(find(semMarca, '07:42')!.baseline);
  });

  it('desenha o cabeçalho sozinho quando não há dado nenhum', () => {
    const g = buildStampGeometry({
      content: { ...content, isEmpty: true },
      preferences: {
        ...DEFAULT_WATERMARK_PREFERENCES,
        brandPlacement: 'header',
        brandLogoPath: 'brand/abc.png',
      },
      frame,
      measure,
    });

    expect(g.images).toHaveLength(1);
    expect(find(g, 'Ly')).toBeDefined();
  });

  it('não repete a marca no canto quando ela está no cabeçalho', () => {
    const g = header();

    expect(g.texts.filter((t) => t.text === 'AUTO')).toHaveLength(1);
  });
});

/** A faixa de fundo virou um elemento configurável, e não um liga/desliga. */
describe('faixa de fundo configurável', () => {
  it('leva cor, transparência e arredondamento das preferências', () => {
    const g = build({
      backdropStyle: 'block',
      backdropColor: '#102030',
      backdropOpacity: 0.4,
      backdropRadius: 12,
    });

    const backdrop = g.rects.find((r) => r.color === '#102030')!;

    expect(backdrop.opacity).toBe(0.4);
    expect(backdrop.radius).toBeGreaterThan(0);
  });

  it('afasta o texto do canto quando o arredondamento cresce', () => {
    // Um canto arredondado come o espaço da própria curva. Com o raio no
    // máximo e a folga de antes, o endereço encostava na volta do canto.
    const reto = build({ backdropStyle: 'block', backdropRadius: 0 });
    const curvo = build({ backdropStyle: 'block', backdropRadius: 24 });

    const retoRect = reto.rects.find((r) => r.opacity !== undefined)!;
    const curvoRect = curvo.rects.find((r) => r.opacity !== undefined)!;
    const retoTexto = find(reto, '07:42')!;
    const curvoTexto = find(curvo, '07:42')!;

    expect(curvoTexto.x - curvoRect.x).toBeGreaterThan(retoTexto.x - retoRect.x);
    // E a faixa continua dentro da foto, e não empurrada para fora dela.
    expect(curvoRect.x).toBeGreaterThanOrEqual(0);
    expect(curvoRect.y + curvoRect.height).toBeLessThanOrEqual(frame.height);
  });

  it('não muda a geometria de quem não usa a faixa', () => {
    // A folga nova sai do raio, e raio zero é o estado de quem já usava a
    // faixa antes. Sem esta garantia, uma melhoria de aparência mudaria o
    // carimbo de todo mundo numa atualização.
    const semFaixa = build({ backdropStyle: 'none' });
    const comFaixaReta = build({ backdropStyle: 'block', backdropRadius: 0 });

    expect(find(comFaixaReta, '07:42')!.x).toBe(find(semFaixa, '07:42')!.x);
    expect(find(comFaixaReta, '07:42')!.baseline).toBe(find(semFaixa, '07:42')!.baseline);
  });

  it('deixa a faixa totalmente transparente quando a opacidade é zero', () => {
    // Zero é uma escolha válida — equivale a desligar a faixa sem perder os
    // ajustes dela. `?? 1` no desenho transformaria isso em faixa opaca.
    const g = build({ backdropStyle: 'block', backdropOpacity: 0 });
    const backdrop = g.rects.find((r) => r.opacity !== undefined)!;

    expect(backdrop.opacity).toBe(0);
  });
});

/**
 * A faixa contínua atravessa a foto de borda a borda.
 *
 * Não é variação estética do cartão. Sobre uma cena visualmente carregada — um
 * canteiro de obra, um pátio cheio, uma fachada com muita informação — o cartão
 * flutuando parece adesivo colado por cima; a faixa contínua parece parte do
 * documento, porque tem a mesma largura da imagem que ela legenda.
 */
describe('faixa contínua', () => {
  const band = (overrides: Partial<WatermarkPreferences> = {}) =>
    build({ backdropStyle: 'band', backdropRadius: 12, ...overrides });

  const backdropOf = (g: StampGeometry) => g.rects.find((r) => r.opacity !== undefined)!;

  it('atravessa a foto inteira e encosta na borda de baixo', () => {
    const g = band({ position: 'bottom-left' });
    const faixa = backdropOf(g);

    expect(faixa.x).toBe(0);
    expect(faixa.width).toBe(frame.width);
    // Parar antes da borda deixaria um fio da foto embaixo, que lê como erro
    // de alinhamento e não como escolha.
    expect(faixa.y + faixa.height).toBe(frame.height);
  });

  it('encosta na borda de cima quando o carimbo está lá', () => {
    const g = band({ position: 'top-right' });
    const faixa = backdropOf(g);

    expect(faixa.y).toBe(0);
    expect(faixa.x).toBe(0);
    expect(faixa.width).toBe(frame.width);
  });

  it('é reta em cima e embaixo, seja qual for o arredondamento escolhido', () => {
    // Arredondada, a tarja vira um painel — meio-termo entre as duas opções,
    // que embaralha a escolha entre elas. O arredondamento é do cartão.
    expect(backdropOf(band({ backdropRadius: 24 })).radius).toBe(0);
    expect(backdropOf(build({ backdropStyle: 'block', backdropRadius: 24 })).radius)
      .toBeGreaterThan(0);
  });

  it('cobre o carimbo inteiro, cabeçalho de marca incluído', () => {
    const g = band({
      position: 'bottom-left',
      brandPlacement: 'header',
      brandComplement: 'Laudos técnicos',
      brandLogoPath: 'brand/abc.png',
    });
    const faixa = backdropOf(g);

    // 0,72 do corpo cobre com folga a maior extensão de tinta acima da linha de
    // base em qualquer das fontes: 0,715 dos algarismos da hora e 0,71 da caixa
    // alta do Barlow, mais o acento de um "Á".
    for (const t of g.texts.filter((x) => !x.rotate)) {
      expect(t.baseline - t.size * 0.72).toBeGreaterThanOrEqual(faixa.y);
    }
    for (const image of g.images) {
      expect(image.y).toBeGreaterThanOrEqual(faixa.y);
    }
  });

  it('não move o texto com o arredondamento, que ela não usa', () => {
    // No cartão a folga cresce com o raio porque a curva come o espaço junto ao
    // texto. Aqui não há curva nenhuma, então o controle não deve ter efeito.
    const reta = band({ backdropRadius: 0 });
    const curva = band({ backdropRadius: 24 });

    expect(find(curva, '07:42')!.x).toBe(find(reta, '07:42')!.x);
    expect(find(curva, '07:42')!.baseline).toBe(find(reta, '07:42')!.baseline);
  });

  it('leva a mesma cor e transparência do cartão', () => {
    const g = band({ backdropColor: '#102030', backdropOpacity: 0.4 });
    const faixa = backdropOf(g);

    expect(faixa.color).toBe('#102030');
    expect(faixa.opacity).toBe(0.4);
  });

  it('não desenha fundo nenhum quando o estilo é "nenhuma"', () => {
    expect(build({ backdropStyle: 'none' }).rects.some((r) => r.opacity !== undefined)).toBe(false);
  });
});
