/**
 * Publica a mesa de notebook/PC em `site/public/mesa/` para o Next servir
 * em https://lymark.app/mesa (mesmo domínio da landing).
 *
 * Pré-requisito: `cd desktop/web && LYMARK_MESA_BASE=/mesa/ npm run build`
 *
 * CommonJS de propósito: o package.json da raiz não declara `type: module`.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'desktop', 'web', 'dist');
const DEST = path.join(__dirname, '..', 'site', 'public', 'mesa');

if (!fs.existsSync(SRC)) {
  console.error(`Pasta ${SRC} não existe. Rode o build da mesa antes.`);
  process.exit(1);
}

const index = path.join(SRC, 'index.html');
if (!fs.existsSync(index)) {
  console.error(`index.html não está em ${SRC}.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

const entries = fs.readdirSync(DEST);
console.log(`Mesa copiada para site/public/mesa/ (${entries.length} itens)`);
