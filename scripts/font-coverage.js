/**
 * Imprime as faixas de caracteres que as fontes do carimbo desenham.
 *
 * A saída vai colada em `src/features/watermark/stamp-script.ts`. É gerada, e
 * não escrita à mão, porque escrever à mão foi o erro: a primeira versão
 * declarava faixas redondas — "toda a área de moeda", "toda a pontuação" — e as
 * fontes não têm nem metade delas. O carimbo prometia desenhar o que não
 * desenha, e o defeito só apareceria na foto de alguém.
 *
 * O teste em `i18n/__tests__/stamp-glyphs.test.ts` confere a tabela contra o
 * `cmap` de novo a cada execução. Trocou de fonte, rode isto e cole o
 * resultado; se esquecer, o teste reprova.
 *
 * Uso: node scripts/font-coverage.js
 */

const fs = require('fs');
const path = require('path');

const NM = path.join(__dirname, '..', 'node_modules', '@expo-google-fonts');

/**
 * As famílias, na ordem de preferência do carimbo.
 *
 * A Barlow vem primeiro porque é a fonte do produto; a Roboto Condensed entra
 * quando o texto exige um glifo que a Barlow não tem. A ordem aqui é a ordem
 * que `scriptFor` percorre.
 */
const PARES = {
  latin: [
    'barlow/400Regular/Barlow_400Regular.ttf',
    'barlow/500Medium/Barlow_500Medium.ttf',
  ],
  cyrillic: [
    'roboto-condensed/400Regular/RobotoCondensed_400Regular.ttf',
    'roboto-condensed/500Medium/RobotoCondensed_500Medium.ttf',
  ],
};

/** Os pontos de código que a fonte desenha, lidos da tabela `cmap`. */
function readCmap(file) {
  const buffer = fs.readFileSync(file);
  const covered = new Set();

  const numTables = buffer.readUInt16BE(4);
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    if (buffer.toString('ascii', record, record + 4) !== 'cmap') continue;

    const cmapStart = buffer.readUInt32BE(record + 8);
    const subtables = buffer.readUInt16BE(cmapStart + 2);

    for (let s = 0; s < subtables; s += 1) {
      const encoding = cmapStart + 4 + s * 8;
      const subtable = cmapStart + buffer.readUInt32BE(encoding + 4);
      if (buffer.readUInt16BE(subtable) !== 4) continue;

      const segCount = buffer.readUInt16BE(subtable + 6) / 2;
      const endBase = subtable + 14;
      const startBase = endBase + segCount * 2 + 2;

      for (let seg = 0; seg < segCount; seg += 1) {
        const end = buffer.readUInt16BE(endBase + seg * 2);
        const start = buffer.readUInt16BE(startBase + seg * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end; c += 1) covered.add(c);
      }
    }
  }

  return covered;
}

/** Pontos soltos viram intervalos fechados. */
function toRanges(sorted) {
  const out = [];
  let start = null;
  let prev = null;

  for (const c of sorted) {
    if (start === null) {
      start = prev = c;
    } else if (c === prev + 1) {
      prev = c;
    } else {
      out.push([start, prev]);
      start = prev = c;
    }
  }

  if (start !== null) out.push([start, prev]);
  return out;
}

const hex = (n) => `0x${n.toString(16).padStart(4, '0')}`;

console.log('export const FONT_COVERAGE: Record<StampFontScript, readonly CodeRange[]> = {');

for (const [nome, arquivos] of Object.entries(PARES)) {
  const sets = arquivos.map((f) => readCmap(path.join(NM, f)));

  // A interseção do par: os dois pesos desenham o mesmo texto, então um glifo
  // que só existe num deles não pode ser prometido.
  //
  // Abaixo de U+0020 são controles — NUL e CR aparecem no `cmap` de quase toda
  // fonte e não são texto que o carimbo desenhe. Ficam de fora para que um
  // caractere de controle vindo de dado corrompido caia em `unsupported`.
  const comum = [...sets[0]]
    .filter((c) => c >= 0x20 && sets.every((s) => s.has(c)))
    .sort((a, b) => a - b);

  const ranges = toRanges(comum);
  console.log(`  // ${comum.length} pontos de código, em ${ranges.length} faixas.`);
  console.log(`  ${nome}: [`);
  for (const [a, b] of ranges) console.log(`    [${hex(a)}, ${hex(b)}],`);
  console.log('  ],');
}

console.log('};');
