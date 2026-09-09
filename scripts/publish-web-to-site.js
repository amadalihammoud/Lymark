/**
 * Publica o export web do Expo em `site/public/web/` para o Next servir
 * em https://lymark.app/web (mesmo domínio da landing).
 *
 * Pré-requisito: `expo export --platform web` + `scripts/copy-wasm.js`
 * (o `canvaskit.wasm` tem de estar na raiz de `dist/` — sem ele o Skia
 * não inicializa e o carimbo não desenha).
 *
 * Os binários NÃO vão para o git: `site/.gitignore` ignora o conteúdo de
 * `public/web/` (só `.gitkeep`). Gerar no build da Vercel via
 * `npm run web:build:hosted`.
 *
 * CommonJS de propósito: o package.json da raiz não declara `type: module`.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'dist');
const DEST = path.join(__dirname, '..', 'site', 'public', 'web');

if (!fs.existsSync(SRC)) {
  console.error(`Pasta ${SRC} não existe. Rode o \`expo export\` antes.`);
  process.exit(1);
}

const wasm = path.join(SRC, 'canvaskit.wasm');
if (!fs.existsSync(wasm)) {
  console.error(`canvaskit.wasm não está em ${SRC}.`);
  console.error('Rode `node scripts/copy-wasm.js` depois do export.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

const entries = fs.readdirSync(DEST);
console.log(
  `Web export copiado para site/public/web/ (${entries.length} itens; inclui canvaskit.wasm)`,
);
