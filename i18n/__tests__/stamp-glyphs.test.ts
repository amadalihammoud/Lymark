import fs from 'fs';
import path from 'path';

import { MONTHS, STAMP_LOCALE, WEEKDAYS_SHORT, stampCanDraw } from '../calendar';
import { LOCALES } from '../locales';

/**
 * A guarda contra o quadradinho vazio.
 *
 * O carimbo desenha com `canvas.drawText` sobre um typeface único, sem cadeia
 * de fontes de reserva: um caractere que a fonte não tem vira `.notdef` — o
 * retângulo vazio. Numa foto de comprovação isso é pior que idioma trocado,
 * porque o documento fica ilegível e parece defeito.
 *
 * Este teste lê o `cmap` das fontes que o aplicativo de fato embarca e falha
 * se alguma data ou dia da semana que o carimbo vai imprimir usar caractere
 * que elas não desenham. É o que impede a próxima pessoa — ou eu, daqui a um
 * mês — de acrescentar um idioma e só descobrir o problema na foto de alguém.
 */

const FONTS = [
  path.join(__dirname, '..', '..', 'site', 'fonts', 'Barlow_400Regular.ttf'),
  path.join(__dirname, '..', '..', 'site', 'fonts', 'PathwayGothicOne_400Regular.ttf'),
];

/** Os pontos de código que a fonte sabe desenhar, lidos da tabela `cmap`. */
function readCmap(file: string): Set<number> {
  const buffer = fs.readFileSync(file);
  const covered = new Set<number>();

  const numTables = buffer.readUInt16BE(4);
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    const tag = buffer.toString('ascii', record, record + 4);
    if (tag !== 'cmap') continue;

    const cmapStart = buffer.readUInt32BE(record + 8);
    const subtables = buffer.readUInt16BE(cmapStart + 2);

    for (let s = 0; s < subtables; s += 1) {
      const encoding = cmapStart + 4 + s * 8;
      const subtable = cmapStart + buffer.readUInt32BE(encoding + 4);

      // Formato 4 cobre o plano básico, que é o que interessa aqui: se um
      // idioma precisa de plano suplementar, ele já não está no latim.
      if (buffer.readUInt16BE(subtable) !== 4) continue;

      const segCount = buffer.readUInt16BE(subtable + 6) / 2;
      const endBase = subtable + 14;
      const startBase = endBase + segCount * 2 + 2;

      for (let seg = 0; seg < segCount; seg += 1) {
        const end = buffer.readUInt16BE(endBase + seg * 2);
        const start = buffer.readUInt16BE(startBase + seg * 2);
        if (start === 0xffff) continue;
        for (let code = start; code <= end; code += 1) covered.add(code);
      }
    }
  }

  return covered;
}

const coverage = FONTS.map(readCmap);
const drawable = (text: string) =>
  [...text].every(
    (char) => char === ' ' || coverage.every((set) => set.has(char.codePointAt(0)!)),
  );

describe('as fontes do carimbo', () => {
  it('desenham o alfabeto latino com acento', () => {
    // Se isto falhar, alguma fonte foi trocada por uma versão reduzida.
    expect(drawable('Sáb 12 ago. 2026 — Guarujá')).toBe(true);
  });

  it('não desenham cirílico, árabe nem CJK', () => {
    // Não é o teste falhando: é o motivo de `STAMP_LOCALE` existir.
    expect(drawable('авг')).toBe(false);
    expect(drawable('أغسطس')).toBe(false);
    expect(drawable('年')).toBe(false);
  });

  describe.each(LOCALES)('%s', (locale) => {
    const stamp = STAMP_LOCALE[locale];

    it('imprime data e dia da semana com glifos que existem', () => {
      for (const month of MONTHS[stamp]) expect(drawable(month)).toBe(true);
      for (const weekday of WEEKDAYS_SHORT[stamp]) expect(drawable(weekday)).toBe(true);
    });

    it('a queda de idioma só acontece onde falta alfabeto', () => {
      const proprio = [...MONTHS[locale], ...WEEKDAYS_SHORT[locale]].every(drawable);

      expect(stampCanDraw(locale)).toBe(proprio);
    });
  });
});
