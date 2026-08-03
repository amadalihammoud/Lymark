/**
 * Conversão de cor, separada de qualquer tela.
 *
 * O seletor livre trabalha em HSV porque é assim que se escolhe cor com o
 * dedo: matiz numa faixa, saturação e brilho num quadrado. O carimbo e o disco
 * guardam hexadecimal, que é o que o Skia entende e o que sobrevive a um
 * `JSON.stringify`. Estas funções são a ponte, e ficam aqui — sem React, sem
 * Skia — para poderem ser testadas.
 */

export type Hsv = {
  /** Matiz em graus, de 0 a 360. */
  h: number;
  /** Saturação de 0 a 1. */
  s: number;
  /** Valor (brilho) de 0 a 1. */
  v: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Um canal de 0–255 nos dois dígitos hexadecimais correspondentes. */
function channel(value: number) {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp01(s);
  const value = clamp01(v);

  const c = value * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - c;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${channel(r + m)}${channel(g + m)}${channel(b + m)}`;
}

/**
 * O caminho inverso, para o seletor abrir já na cor atual.
 *
 * Um valor irreconhecível vira preto em vez de `NaN`: `NaN` percorreria o
 * seletor inteiro em silêncio e só apareceria como um ponteiro que não se
 * move.
 */
export function hexToHsv(hex: string): Hsv {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return { h: 0, s: 0, v: 0 };

  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Cinza não tem matiz definido. Devolver 0 mantém o ponteiro na ponta
  // esquerda da faixa, que é onde ele já estaria.
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

/**
 * Luminância relativa, na definição da WCAG.
 *
 * Serve a uma pergunta prática: a cor escolhida some sobre a foto? O aviso na
 * tela usa isto para dizer, antes da exportação, que um cinza médio sobre um
 * asfalto cinza não vai ser lido por ninguém.
 */
export function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return 0;

  const int = parseInt(match[1], 16);
  const linear = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((raw) => {
    const channelValue = raw / 255;
    return channelValue <= 0.04045
      ? channelValue / 12.92
      : ((channelValue + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
