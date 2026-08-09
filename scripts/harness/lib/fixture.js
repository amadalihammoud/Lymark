/**
 * A entrada fixa do harness.
 *
 * Todo renderizador — Node, navegador, Electron e aparelho — precisa receber
 * exatamente estes valores e exatamente estas fotos. Entrada variável foi o
 * defeito do harness anterior: sem inputs idênticos não se sabe se a
 * diferença veio do motor gráfico ou do arquivo.
 */

const path = require('path');

const HARNESS_DIR = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(HARNESS_DIR, 'fixtures', 'photos');
const RENDERS_DIR = path.join(HARNESS_DIR, 'renders');
const REFERENCE_DIR = path.join(HARNESS_DIR, 'reference');
const DIFF_DIR = path.join(HARNESS_DIR, 'diff');

/** Conteúdo do carimbo. Fixo: nada aqui pode depender do relógio ou do local. */
const METADATA = {
  time: '21:55',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
};

/**
 * Os quatro casos.
 *
 * `highres` existe para o G3: 24 MP é onde o CanvasKit encosta no limite de
 * memória do WebAssembly, e é onde o lote no desktop quebraria primeiro.
 */
const CASES = [
  { name: 'portrait', width: 3000, height: 4000 },
  { name: 'landscape', width: 4000, height: 3000 },
  { name: 'square', width: 2000, height: 2000 },
  { name: 'highres', width: 6000, height: 4000 },
];

/**
 * PNG, e não JPEG, de propósito: decodificadores JPEG diferem entre o Android
 * e o CanvasKit, e essa diferença apareceria na comparação como se fosse erro
 * do carimbo. Com PNG, a foto de entrada é idêntica em toda plataforma e o que
 * sobra na conta é só o que o carimbo desenhou.
 */
const photoFile = (c) => path.join(PHOTOS_DIR, `${c.name}-${c.width}x${c.height}.png`);
const caseId = (c) => `${c.name}-${c.width}x${c.height}`;

module.exports = {
  METADATA,
  CASES,
  photoFile,
  caseId,
  HARNESS_DIR,
  PHOTOS_DIR,
  RENDERS_DIR,
  REFERENCE_DIR,
  DIFF_DIR,
};
