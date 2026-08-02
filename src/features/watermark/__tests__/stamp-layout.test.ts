import type { WatermarkPreferences } from '@/types';

import type { WatermarkContent } from '../build-content';
import { SCALE_METRICS } from '../layout';
import { DEFAULT_WATERMARK_PREFERENCES } from '../preferences';
import { DIGIT_INK_HEIGHT, DIGIT_INK_TOP_FROM_BASELINE } from '../skia-typography';
import { buildStampGeometry, type MeasureText, type StampGeometry } from '../stamp-layout';

/**
 * A geometria é o que substitui o flexbox do React Native. Sem ela o carimbo
 * só existe no tamanho em que foi desenhado na tela, e é por isso que a foto
 * exportada sai com a resolução do telefone.
 *
 * A medição de texto entra como função para que estes testes rodem sem motor
 * gráfico. As proporções do dublê são as reais, medidas no Skia: a hora ocupa
 * 1,468 corpos de largura, e os textos corridos cerca de 0,5 por caractere.
 */
const measure: MeasureText = (text, size, font) =>
  font === 'clock' ? (text.length * size * 1.468) / 5 : text.length * size * 0.5;

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
    expect(build({}, { frame: { width: 0, height: 0 } })).toEqual({ texts: [], rects: [] });
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
    // Emendados, sem espaço: é uma palavra só, em duas cores.
    expect(tail.x).toBeCloseTo(head.x + measure('Ly', head.size, 'medium'), 5);
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

      // 219 px de largura numa imagem de 1128 px é o alvo medido na
      // referência; a proporção precisa valer em qualquer tamanho.
      const time = find(g, '07:42')!;
      expect(measure(time.text, time.size, 'clock') / width).toBeCloseTo(219 / 1128, 2);
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
