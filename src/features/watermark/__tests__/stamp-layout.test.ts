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

const colors = { text: '#fff', accent: '#F5B60D', backdrop: 'rgba(0,0,0,0.75)' };
const frame = { width: 355.4, height: 440 };

function build(overrides: Partial<WatermarkPreferences> = {}, extra = {}): StampGeometry {
  return buildStampGeometry({
    content,
    preferences: { ...DEFAULT_WATERMARK_PREFERENCES, ...overrides },
    frame,
    colors,
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

  it('não desenha nada quando não há conteúdo nem marca', () => {
    const g = buildStampGeometry({
      content: { ...content, isEmpty: true },
      preferences: { ...DEFAULT_WATERMARK_PREFERENCES, showBrand: false },
      frame,
      colors,
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
      colors,
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
    const g = build({ showBrand: false });

    expect(find(g, 'Ly')).toBeUndefined();
    expect(find(g, 'mark')).toBeUndefined();
  });
});

describe('faixa de fundo', () => {
  it('só aparece quando ligada, e cobre o bloco', () => {
    expect(build({ showBackdrop: false }).rects.some((r) => r.color === colors.backdrop))
      .toBe(false);

    const g = build({ showBackdrop: true });
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
      colors,
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
        colors,
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
      colors,
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
      colors,
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
      colors,
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
      colors,
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
      colors,
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
      colors,
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
      colors,
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
      colors,
      measure,
    });
    const withDate = buildStampGeometry({
      content,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame,
      colors,
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
