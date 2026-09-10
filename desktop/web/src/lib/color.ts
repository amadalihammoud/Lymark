/**
 * Conversão de cor do seletor livre.
 *
 * HSV no ponteiro (matiz, saturação, brilho); hexadecimal no carimbo e no disco.
 */

export type Hsv = {
  h: number;
  s: number;
  v: number;
};

export const STAMP_SWATCHES = [
  { hex: "#FFFFFF", name: "Branco" },
  { hex: "#F3C218", name: "Âmbar" },
  { hex: "#FF6B57", name: "Vermelho" },
  { hex: "#5BD98A", name: "Verde" },
  { hex: "#63B3ED", name: "Azul" },
  { hex: "#111820", name: "Preto" },
] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function channel(value: number) {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, "0")
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

  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

export function parseHex(raw: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(raw.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function isStampSwatch(hex: string): boolean {
  const n = parseHex(hex);
  return n !== null && STAMP_SWATCHES.some((s) => s.hex === n);
}
