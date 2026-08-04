import { hexToHsv, hsvToHex, relativeLuminance } from '../color';
import { STAMP_COLOR_KEYS, STAMP_COLOR_SWATCHES } from '@/types';

/**
 * A conversão de cor sustenta o seletor livre, que é o que permite a empresa
 * carimbar a própria cor em vez de escolher a mais parecida numa paleta de
 * seis. Errar aqui não derruba nada — só entrega uma cor diferente da que a
 * pessoa apontou com o dedo, em silêncio, na foto que ela entrega ao cliente.
 */
describe('hsvToHex', () => {
  it('resolve os vértices do espectro', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00FF00');
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000FF');
  });

  it('sem saturação devolve cinza, seja qual for o matiz', () => {
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 217, s: 0, v: 1 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 0, s: 1, v: 0 })).toBe('#000000');
  });

  it('normaliza matiz fora de 0–360 em vez de produzir cor inválida', () => {
    // A faixa do seletor pode entregar 360 exato na ponta direita, e um valor
    // negativo se o dedo sair pela esquerda.
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: -120, s: 1, v: 1 })).toBe('#0000FF');
  });

  it('sempre produz seis dígitos, que é o que o carimbo aceita', () => {
    for (let h = 0; h < 360; h += 7) {
      for (const v of [0.03, 0.5, 1]) {
        expect(hsvToHex({ h, s: 0.6, v })).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });
});

describe('hexToHsv', () => {
  it('volta ao mesmo hexadecimal, para o seletor abrir na cor atual', () => {
    for (const key of STAMP_COLOR_KEYS) {
      const hex = STAMP_COLOR_SWATCHES[key];
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('aceita com e sem cerquilha', () => {
    expect(hexToHsv('#FF0000')).toEqual(hexToHsv('FF0000'));
  });

  it('cai no preto em vez de espalhar NaN pelo seletor', () => {
    // Um NaN atravessaria o seletor em silêncio e apareceria apenas como um
    // ponteiro que não se move.
    for (const bad of ['', 'roxo', '#12345', '#GGGGGG']) {
      const hsv = hexToHsv(bad);
      expect(Number.isFinite(hsv.h)).toBe(true);
      expect(Number.isFinite(hsv.s)).toBe(true);
      expect(Number.isFinite(hsv.v)).toBe(true);
    }
  });
});

describe('relativeLuminance', () => {
  it('ordena do preto ao branco', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#808080')).toBeGreaterThan(0.1);
    expect(relativeLuminance('#808080')).toBeLessThan(0.3);
  });

  it('pesa o verde acima do azul, como o olho faz', () => {
    expect(relativeLuminance('#00FF00')).toBeGreaterThan(relativeLuminance('#0000FF'));
  });
});
