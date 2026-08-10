/**
 * Copia o CanvasKit WASM para a raiz do build web.
 *
 * O `expo export` não leva o `.wasm` junto: o Metro embute o glue do
 * Emscripten no bundle, mas o binário fica de fora. Sem esta cópia, o build
 * sai com 37 arquivos e nenhum `.wasm`, o Skia não inicializa e o carimbo
 * nunca é desenhado — no navegador e no Electron.
 *
 * Vai para a RAIZ do `dist/`, e não para junto do bundle, porque é de lá que
 * o `SkiaWebInitializer` manda o CanvasKit buscá-lo (`locateFile`). As duas
 * pontas precisam concordar; se uma mudar, a outra tem de mudar junto.
 *
 * CommonJS de propósito: o package.json da raiz não declara `type: module`.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm');
const DEST_DIR = path.join(__dirname, '..', 'dist');
const DEST = path.join(DEST_DIR, 'canvaskit.wasm');

if (!fs.existsSync(SOURCE)) {
  console.error(`CanvasKit WASM não encontrado em ${SOURCE}`);
  console.error('Rode `npm install` antes de gerar o build web.');
  process.exit(1);
}

if (!fs.existsSync(DEST_DIR)) {
  console.error(`Pasta ${DEST_DIR} não existe. Rode o \`expo export\` antes.`);
  process.exit(1);
}

fs.copyFileSync(SOURCE, DEST);

const megabytes = (fs.statSync(DEST).size / 1024 / 1024).toFixed(1);
console.log(`CanvasKit WASM copiado para dist/canvaskit.wasm (${megabytes} MB)`);
