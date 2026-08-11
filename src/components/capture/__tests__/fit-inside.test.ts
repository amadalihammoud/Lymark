import { fitInside } from '../fit-inside';

/*
 * `fitInside` deixou de ser detalhe de estilo: é ela que define o tamanho
 * entregue ao `StampCanvas`, e o `StampCanvas` devolve `null` se receber zero.
 * Um erro aqui não aparece como erro — aparece como foto sem carimbo.
 */

describe('enquadramento da foto', () => {
  it('usa a largura toda quando a altura sobra', () => {
    expect(fitInside({ width: 400, height: 900 }, 4 / 3)).toEqual({ width: 400, height: 300 });
  });

  it('limita pela altura quando a largura sobra', () => {
    expect(fitInside({ width: 900, height: 300 }, 4 / 3)).toEqual({ width: 400, height: 300 });
  });

  it('cabe exatamente quando a proporção é a mesma da caixa', () => {
    expect(fitInside({ width: 400, height: 300 }, 4 / 3)).toEqual({ width: 400, height: 300 });
  });

  it('respeita retrato, onde a altura é quem limita', () => {
    const { width, height } = fitInside({ width: 800, height: 600 }, 3 / 4);
    expect(height).toBe(600);
    expect(width).toBe(450);
  });

  it('respeita panorâmica, onde a largura é quem limita', () => {
    const { width, height } = fitInside({ width: 600, height: 600 }, 3);
    expect(width).toBe(600);
    expect(height).toBe(200);
  });

  // Os casos abaixo são o estado do primeiro render, antes de a medição chegar.
  // Devolver zero é correto; o que não pode é devolver NaN ou negativo, que
  // passariam pela guarda do StampCanvas e quebrariam a geometria.
  it('devolve zero enquanto a caixa não foi medida', () => {
    expect(fitInside({ width: 0, height: 0 }, 4 / 3)).toEqual({ width: 0, height: 0 });
  });

  it('devolve zero quando só uma das medidas chegou', () => {
    expect(fitInside({ width: 500, height: 0 }, 4 / 3)).toEqual({ width: 0, height: 0 });
    expect(fitInside({ width: 0, height: 500 }, 4 / 3)).toEqual({ width: 0, height: 0 });
  });

  it('nunca devolve NaN nem negativo', () => {
    for (const caixa of [
      { width: 100, height: 100 },
      { width: 1, height: 10000 },
      { width: 10000, height: 1 },
    ]) {
      for (const proporcao of [0.1, 1, 3, 16 / 9]) {
        const { width, height } = fitInside(caixa, proporcao);
        expect(Number.isFinite(width)).toBe(true);
        expect(Number.isFinite(height)).toBe(true);
        expect(width).toBeGreaterThanOrEqual(0);
        expect(height).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
