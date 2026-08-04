import { fitWithin, findInkBounds } from '../logo-trim';

/**
 * O carimbo ancora o logotipo entre o topo da caixa alta do nome e a linha de
 * base do complemento. O alinhamento do **retângulo** é exato; quem decide onde
 * a tinta cai dentro dele é o arquivo. Medido num caso real, um PNG comum
 * trazia 4 px de folga acima e 5 abaixo num conjunto de 88 — o alinhamento
 * existia e não se enxergava. É esta varredura que o torna visível.
 */

/** Um bitmap RGBA com um retângulo opaco dentro de um fundo transparente. */
function bitmap(
  width: number,
  height: number,
  ink: { x: number; y: number; width: number; height: number; alpha?: number },
) {
  const pixels = new Uint8Array(width * height * 4);

  for (let y = ink.y; y < ink.y + ink.height; y++) {
    for (let x = ink.x; x < ink.x + ink.width; x++) {
      const i = (y * width + x) * 4;
      pixels[i] = 255;
      pixels[i + 1] = 180;
      pixels[i + 2] = 13;
      pixels[i + 3] = ink.alpha ?? 255;
    }
  }

  return pixels;
}

describe('findInkBounds', () => {
  it('acha a caixa da tinta dentro da folga transparente', () => {
    const pixels = bitmap(100, 100, { x: 20, y: 10, width: 50, height: 30 });

    expect(findInkBounds(pixels, 100, 100)).toEqual({ x: 20, y: 10, width: 50, height: 30 });
  });

  it('devolve a imagem inteira quando não há folga', () => {
    const pixels = bitmap(40, 20, { x: 0, y: 0, width: 40, height: 20 });

    expect(findInkBounds(pixels, 40, 20)).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  it('ignora resíduo de antialiasing nas bordas', () => {
    // Exportadores deixam sombras quase apagadas na borda. Uma varredura em
    // alfa zero absoluto acharia "tinta" numa fileira que ninguém vê, e o
    // recorte não recortaria nada.
    const pixels = bitmap(50, 50, { x: 10, y: 10, width: 20, height: 20 });
    pixels[3] = 5;

    expect(findInkBounds(pixels, 50, 50)).toEqual({ x: 10, y: 10, width: 20, height: 20 });
  });

  it('aceita tinta translúcida, que é tinta', () => {
    const pixels = bitmap(30, 30, { x: 5, y: 5, width: 10, height: 10, alpha: 90 });

    expect(findInkBounds(pixels, 30, 30)).toEqual({ x: 5, y: 5, width: 10, height: 10 });
  });

  it('devolve null numa imagem inteiramente transparente', () => {
    // Recortar mesmo assim daria uma imagem de tamanho zero, que o Skia
    // recusa — e o logotipo da pessoa sumiria sem explicação.
    expect(findInkBounds(new Uint8Array(20 * 20 * 4), 20, 20)).toBeNull();
  });

  it('devolve null em vez de ler fora do buffer', () => {
    expect(findInkBounds(new Uint8Array(10), 100, 100)).toBeNull();
    expect(findInkBounds(new Uint8Array(0), 0, 0)).toBeNull();
  });
});

describe('fitWithin', () => {
  it('não mexe no que já cabe', () => {
    expect(fitWithin({ width: 300, height: 200 }, 1024)).toEqual({ width: 300, height: 200 });
  });

  it('limita pelo lado maior, preservando a proporção', () => {
    // Alguém vai escolher uma fotografia inteira por engano. Guardar 4000 px
    // custaria memória a cada exportação sem melhorar nada do que se vê.
    const fitted = fitWithin({ width: 4000, height: 3000 }, 1024);

    expect(fitted).toEqual({ width: 1024, height: 768 });
    expect(fitted.width / fitted.height).toBeCloseTo(4000 / 3000, 2);
  });

  it('limita pela altura numa marca vertical', () => {
    expect(fitWithin({ width: 500, height: 2000 }, 1024)).toEqual({ width: 256, height: 1024 });
  });

  it('nunca chega a zero, que o Skia recusaria', () => {
    expect(fitWithin({ width: 4000, height: 3 }, 100).height).toBeGreaterThanOrEqual(1);
  });
});
