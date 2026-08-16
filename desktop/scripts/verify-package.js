/**
 * Confere que o pacote gerado contém tudo o que o aplicativo precisa em
 * tempo de execução.
 *
 * Existe por causa de uma falha que passou despercebida: o Expo nomeia a
 * saída dos assets espelhando a origem do módulo, gerando
 * `dist/assets/node_modules/…`, e o electron-builder remove qualquer pasta
 * chamada `node_modules` dos filesets de `files`. O pacote saía sem as três
 * fontes do carimbo. Como `useStampTypefaces` devolve `null` quando falta
 * qualquer uma delas, o aplicativo abria, navegava e simplesmente não
 * carimbava — nenhum erro, nenhum aviso.
 *
 * Uma ausência que não gera erro precisa de uma verificação explícita.
 *
 * Uso: node scripts/verify-package.js <win-unpacked> <dist-web>
 */

const fs = require('fs');
const path = require('path');

const [, , UNPACKED, DIST] = process.argv;

if (!UNPACKED || !DIST) {
  console.error('uso: node scripts/verify-package.js <win-unpacked> <dist-web>');
  process.exit(2);
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full, base)
      : [path.relative(base, full).replace(/\\/g, '/')];
  });
}

const servido = path.join(UNPACKED, 'resources/dist');
const noPacote = new Set(walk(servido));
const noDisco = walk(DIST);
const faltando = noDisco.filter((f) => !noPacote.has(f));

const falhas = [];

if (noDisco.length === 0) {
  falhas.push(`build web não encontrado em ${DIST} — rode a exportação antes`);
}

if (faltando.length > 0) {
  falhas.push(`${faltando.length} de ${noDisco.length} arquivos do build web ficaram fora`);
  for (const f of faltando.slice(0, 10)) falhas.push(`    - ${f}`);
}

// As fontes do carimbo, sem as quais nada é desenhado: `useStampTypefaces`
// é tudo-ou-nada e devolve `null` se faltar UMA — inclusive as cirílicas, que
// carregam sempre, mesmo numa sessão inteiramente em português. O nome de
// arquivo carrega um hash de conteúdo que muda a cada build, então a checagem
// é pela família.
const FONTES = [
  'PathwayGothicOne_400Regular',
  'Barlow_400Regular',
  'Barlow_500Medium',
  'RobotoCondensed_400Regular',
  'RobotoCondensed_500Medium',
  // As da interface entram pelo mesmo `useFonts` da raiz. Faltando uma, o app
  // abre com a fonte do sistema no lugar do Manual de Marca — sem erro, e sem
  // ninguém notar até comparar com o celular.
  'SpaceGrotesk_400Regular',
  'SpaceGrotesk_500Medium',
  'SpaceGrotesk_700Bold',
  'IBMPlexMono_500Medium',
];
const empacotadas = [...noPacote].filter((f) => f.endsWith('.ttf'));

for (const fonte of FONTES) {
  if (!empacotadas.some((f) => f.includes(fonte))) {
    falhas.push(`fonte ausente no pacote: ${fonte}`);
  }
}

const wasm = path.join(servido, 'canvaskit.wasm');
if (!fs.existsSync(wasm)) {
  falhas.push('canvaskit.wasm ausente — o Skia não inicializa e o carimbo não é desenhado');
}

if (falhas.length > 0) {
  console.error('PACOTE INCOMPLETO:');
  for (const f of falhas) console.error('  ' + f);
  process.exit(1);
}

console.log(`pacote íntegro: ${noDisco.length} arquivos do build web, ` +
  `${empacotadas.length} fontes, canvaskit.wasm ` +
  `(${(fs.statSync(wasm).size / 1048576).toFixed(1)} MB)`);
