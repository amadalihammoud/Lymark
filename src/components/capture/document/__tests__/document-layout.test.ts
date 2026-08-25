import {
  CELL_MIN_WIDTH,
  documentLayout,
  FOOTER_HEIGHT,
  RULER_BUTTON_SIZE,
  RULER_GAP,
  RULER_HEIGHT,
  RULER_MIN_WIDTH,
} from '../document-layout';

const FOOTER = RULER_GAP + RULER_HEIGHT + FOOTER_HEIGHT;

/** Deitada 4:3 e em pé 3:4 — as duas orientações que o app recebe. */
const LANDSCAPE = 4 / 3;
const PORTRAIT = 3 / 4;

describe('documentLayout', () => {
  it('devolve zeros antes da primeira medição', () => {
    // Não é caso de borda: é o primeiro render, antes de qualquer `onLayout`.
    // Zero aqui faz o StampCanvas devolver null, que é o desejado — o que não
    // pode acontecer é NaN ou negativo chegando ao estilo.
    expect(documentLayout({ width: 0, height: 0 }, LANDSCAPE)).toEqual({
      frame: { width: 0, height: 0 },
      documentWidth: 0,
    });
  });

  it('devolve zeros quando a caixa é mais baixa que o rodapé reservado', () => {
    const { frame, documentWidth } = documentLayout(
      { width: 1200, height: FOOTER - 1 },
      LANDSCAPE,
    );

    expect(frame).toEqual({ width: 0, height: 0 });
    expect(documentWidth).toBe(0);
    expect(Number.isNaN(frame.height)).toBe(false);
  });

  it('desconta o rodapé da altura, e não da largura', () => {
    const box = { width: 1000, height: 800 };
    const { frame } = documentLayout(box, LANDSCAPE);

    expect(frame.height).toBeLessThanOrEqual(box.height - FOOTER);
    // A largura segue disponível inteira; é a altura que paga pela régua.
    expect(frame.width).toBeLessThanOrEqual(box.width);
  });

  it('deitada num palco largo: a régua tem exatamente a largura da foto', () => {
    // O coração do desenho — a régua colada, do mesmo tamanho do que está
    // acima dela.
    const { frame, documentWidth } = documentLayout({ width: 1100, height: 900 }, LANDSCAPE);

    expect(frame.width).toBeGreaterThan(RULER_MIN_WIDTH);
    expect(documentWidth).toBe(frame.width);
  });

  it('em pé num palco largo: a régua cai no piso e a foto fica dentro dela', () => {
    const { frame, documentWidth } = documentLayout({ width: 1100, height: 900 }, PORTRAIT);

    expect(frame.width).toBeLessThan(RULER_MIN_WIDTH);
    expect(documentWidth).toBe(RULER_MIN_WIDTH);
    expect(frame.width).toBeLessThan(documentWidth);
  });

  it('a régua nunca é mais larga que a caixa, mesmo abaixo do piso', () => {
    // Uma janela mais estreita que o piso não pode produzir régua que
    // transborda: transbordar é o único modo de falha que o layout não
    // consegue esconder.
    const box = { width: RULER_MIN_WIDTH - 200, height: 900 };
    const { documentWidth } = documentLayout(box, PORTRAIT);

    expect(documentWidth).toBeLessThanOrEqual(box.width);
  });

  it('o piso da régua cabe as células que ela precisa mostrar', () => {
    // A trava desta implementação: os `minWidth` das células e a largura
    // mínima do documento são a MESMA medida vista de dois lugares. Se
    // alguém afrouxar um piso de célula sem que este número suba, a régua
    // transborda o documento — e no React Native transbordar não gera aviso
    // nenhum, só um campo cortado que ninguém vê no teste.
    const cells = Object.values(CELL_MIN_WIDTH).reduce((total, w) => total + w, 0);

    expect(RULER_MIN_WIDTH).toBeGreaterThanOrEqual(cells + 3 * RULER_BUTTON_SIZE);
  });

  it('a régua cabe na janela mais estreita em que a tela é ativada', () => {
    // A tela de documento só entra a partir de 1280 (`mode === 'ultra'`).
    // Nessa largura o poço recebe o que sobra depois do painel de 320 e do
    // respiro de 16 de cada lado. Se o piso da régua passar disso, a régua
    // transborda logo no primeiro degrau em que a tela existe — e transbordar
    // não gera aviso nenhum, só campos cortados.
    const NARROWEST_WELL = 1280 - 320 - 2 * 16;

    expect(RULER_MIN_WIDTH).toBeLessThanOrEqual(NARROWEST_WELL);
  });

  it('a altura do quadro respeita a proporção da foto', () => {
    // Se a proporção não bater, o `contentFit="cover"` da imagem passa a
    // recortar de verdade e a pré-visualização deixa de corresponder ao
    // arquivo exportado.
    const { frame } = documentLayout({ width: 1200, height: 1000 }, LANDSCAPE);

    expect(frame.width / frame.height).toBeCloseTo(LANDSCAPE, 5);
  });
});
