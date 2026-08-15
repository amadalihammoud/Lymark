import fs from 'fs';
import path from 'path';

import { FONT_COVERAGE } from '../../src/features/watermark/font-coverage';
import {
  STAMP_FONT_SCRIPTS,
  scriptFor,
  type StampFontScript,
} from '../../src/features/watermark/stamp-script';
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
 *
 * Lê de `node_modules/@expo-google-fonts/`, e não das cópias em `site/fonts/`,
 * porque é de lá que o `require` do aplicativo carrega. Verificar a cópia
 * enquanto o aplicativo embarca outro arquivo daria uma garantia falsa.
 */

const modules = path.join(__dirname, '..', '..', 'node_modules', '@expo-google-fonts');

/** As fontes de cada alfabeto — o mesmo par que `useStampTypefaces` escolhe. */
const FONTS: Record<StampFontScript, string[]> = {
  latin: [
    path.join(modules, 'barlow', '400Regular', 'Barlow_400Regular.ttf'),
    path.join(modules, 'barlow', '500Medium', 'Barlow_500Medium.ttf'),
  ],
  cyrillic: [
    path.join(modules, 'roboto-condensed', '400Regular', 'RobotoCondensed_400Regular.ttf'),
    path.join(modules, 'roboto-condensed', '500Medium', 'RobotoCondensed_500Medium.ttf'),
  ],
};

/**
 * A fonte do relógio, usada em qualquer alfabeto.
 *
 * A hora é só dígito e dois-pontos, então a Pathway serve a todos — mas
 * precisa entrar na verificação de qualquer forma, porque é ela que desenha.
 */
const CLOCK = path.join(
  modules,
  'pathway-gothic-one',
  '400Regular',
  'PathwayGothicOne_400Regular.ttf',
);

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

const coverage = new Map<string, Set<number>>();
const cmapOf = (file: string) => {
  if (!coverage.has(file)) coverage.set(file, readCmap(file));
  return coverage.get(file)!;
};

/** `true` quando todas as fontes daquele alfabeto desenham o texto inteiro. */
function drawableAs(text: string, script: StampFontScript): boolean {
  return [...text].every(
    (char) =>
      char === ' ' ||
      FONTS[script].every((font) => cmapOf(font).has(char.codePointAt(0)!)),
  );
}

/**
 * `true` quando o carimbo desenha o texto **como ele escolheria a fonte** —
 * `scriptFor` decide, exatamente como em tempo de execução.
 */
function drawable(text: string): boolean {
  const script = scriptFor(text);
  return script === 'unsupported' ? false : drawableAs(text, script);
}

describe('as fontes do carimbo', () => {
  it('desenham o alfabeto latino com acento', () => {
    // Se isto falhar, alguma fonte foi trocada por uma versão reduzida.
    expect(drawable('Sáb 12 ago. 2026 — Guarujá')).toBe(true);
  });

  it('desenham cirílico e grego, pela Roboto Condensed', () => {
    expect(drawable('12 авг. 2026 · ср')).toBe(true);
    expect(drawable('Αύγ')).toBe(true);
  });

  it('não desenham árabe nem CJK', () => {
    // Não é o teste falhando: é o motivo de `STAMP_LOCALE` ainda existir.
    expect(drawable('أغسطس')).toBe(false);
    expect(drawable('年')).toBe(false);
  });

  it('a Barlow continua sem um glifo cirílico sequer', () => {
    // O que torna `scriptFor` necessário: não há reserva dentro de um typeface.
    expect(drawableAs('авг', 'latin')).toBe(false);
  });

  it('o relógio desenha a hora em qualquer alfabeto', () => {
    // A hora é sempre dígito e dois-pontos, e sai sempre pela Pathway.
    const clock = cmapOf(CLOCK);
    for (const char of '0123456789:') expect(clock.has(char.codePointAt(0)!)).toBe(true);
  });
});

/**
 * O teste que fecha a porta de verdade.
 *
 * Os casos acima conferem o texto que o produto **hoje** imprime — as tabelas
 * de meses e dias da semana, que nós escrevemos. Mas o endereço vem do
 * geocodificador, e a razão social vem do teclado de quem usa: nenhum dos dois
 * sai de uma lista nossa.
 *
 * O que sustenta esses dois casos é `FONT_COVERAGE`, e ele é dado gerado —
 * dado gerado apodrece calado. Basta trocar a versão de uma fonte, ou o pacote
 * publicar um subconjunto menor, para a tabela passar a prometer glifos que o
 * arquivo não tem mais. Este bloco relê o `cmap` e compara ponto a ponto.
 */
describe('FONT_COVERAGE contra o cmap das fontes', () => {
  const pontos = (ranges: readonly (readonly [number, number])[]) => {
    const todos: number[] = [];
    for (const [inicio, fim] of ranges) {
      for (let code = inicio; code <= fim; code += 1) todos.push(code);
    }
    return todos;
  };

  const nomear = (code: number) =>
    `U+${code.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(code)}`;

  describe.each(STAMP_FONT_SCRIPTS)('%s', (script) => {
    it('promete só o que as duas fontes da família desenham', () => {
      const faltando = pontos(FONT_COVERAGE[script])
        .filter((code) => !FONTS[script].every((font) => cmapOf(font).has(code)))
        .map(nomear);

      // A lista importa mais que a contagem: ela diz qual glifo sumiu.
      expect(faltando).toEqual([]);
    });

    it('não deixa de fora nada que as duas desenham', () => {
      // O outro lado do erro. Uma faixa curta demais joga texto legítimo em
      // `unsupported` — e aí um endereço russo inteiro cai para a Barlow, que
      // não tem cirílico nenhum. Estreitar demais custa mais caro que alargar.
      const declarado = new Set(pontos(FONT_COVERAGE[script]));
      const sobrando = [...cmapOf(FONTS[script][0]!)]
        .filter((code) => code >= 0x20)
        .filter((code) => FONTS[script].every((font) => cmapOf(font).has(code)))
        .filter((code) => !declarado.has(code))
        .map(nomear);

      expect(sobrando).toEqual([]);
    });
  });

  it('a Roboto Condensed é quem traz o № dos endereços russos', () => {
    // O caractere que denunciou a tabela escrita à mão: ela prometia toda a
    // área de símbolos, e a Barlow não tem este.
    const no = '№'.codePointAt(0)!;

    expect(FONTS.latin.every((f) => cmapOf(f).has(no))).toBe(false);
    expect(FONTS.cyrillic.every((f) => cmapOf(f).has(no))).toBe(true);
    expect(scriptFor('ул. Пушкина, № 10')).toBe('cyrillic');
  });
});

describe('coerência entre a faixa e o desenho', () => {

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
