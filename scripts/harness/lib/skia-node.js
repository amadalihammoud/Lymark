/**
 * Roda a API real do Skia — a mesma que o aplicativo usa — dentro do Node.
 *
 * Por que isto existe: o harness anterior reimplementava o desenho do carimbo
 * num `drawStamp` próprio, e a cópia estava incompleta — sem a sombra e sem o
 * `letterSpacing`. Um harness que reimplementa o renderizador não consegue,
 * por construção, detectar erro de renderizador: ele só compara a cópia com
 * ela mesma.
 *
 * Aqui o caminho é outro. O `JsiSkApi` do próprio `@shopify/react-native-skia`
 * constrói a API do Skia sobre o CanvasKit, e um atalho no resolvedor de
 * módulos faz o `skia-stamp` compilado enxergar essa API no lugar do módulo
 * nativo. O resultado é o `createStampRenderer` de verdade, com a sombra e o
 * espaçamento que o aplicativo aplica.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..', '..');
const NM = path.join(ROOT, 'node_modules');
const BUILD = process.env.LYMARK_HARNESS_BUILD || path.join(ROOT, '.harness-build');

const font = (...parts) => path.join(NM, '@expo-google-fonts', ...parts);

const CLOCK = font('pathway-gothic-one', '400Regular', 'PathwayGothicOne_400Regular.ttf');

/**
 * As fontes embutidas no aplicativo, nos mesmos pesos — por alfabeto.
 *
 * As chaves são as do `StampFont` (`clock`, `body`, `medium`), e não nomes de
 * família, porque é assim que `createStampRenderer` indexa. Nomear por família
 * aqui produziria `typefaces['clock'] === undefined`, e o Skia desenharia com
 * a fonte padrão sem reclamar — exatamente a falha silenciosa que este harness
 * existe para pegar.
 */
const FONT_FILES = {
  latin: {
    clock: CLOCK,
    body: font('barlow', '400Regular', 'Barlow_400Regular.ttf'),
    medium: font('barlow', '500Medium', 'Barlow_500Medium.ttf'),
  },
  cyrillic: {
    clock: CLOCK,
    body: font('roboto-condensed', '400Regular', 'RobotoCondensed_400Regular.ttf'),
    medium: font('roboto-condensed', '500Medium', 'RobotoCondensed_500Medium.ttf'),
  },
};

/**
 * Redireciona dois pedidos de módulo que o Node não resolveria sozinho:
 * o alias `@/` do projeto e o pacote nativo do Skia.
 */
function installModuleShim(skiaExports) {
  const shimPath = path.join(__dirname, '.rn-skia-shim.js');
  fs.writeFileSync(shimPath, 'module.exports = global.__LYMARK_SKIA_SHIM__;\n');
  global.__LYMARK_SKIA_SHIM__ = skiaExports;

  const original = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === '@shopify/react-native-skia') return shimPath;
    if (request.startsWith('@/')) {
      return original.call(this, path.join(BUILD, 'src', request.slice(2)), ...rest);
    }
    return original.call(this, request, ...rest);
  };
}

/**
 * Prepara o Skia e devolve o renderizador real do aplicativo.
 *
 * `script` escolhe o par de fontes, como `useStampTypefaces` faz no aplicativo
 * a partir do que `scriptForStamp` decidiu. Carregar aqui as mesmas fontes que
 * o aparelho carrega é o que dá sentido à comparação — com outro arquivo, o
 * harness compararia duas coisas que nunca deveriam bater.
 */
async function createNodeStampRenderer(script = 'latin') {
  const CanvasKitInit = require(path.join(NM, 'canvaskit-wasm/bin/canvaskit.js'));
  const CanvasKit = await CanvasKitInit({
    locateFile: (file) => path.join(NM, 'canvaskit-wasm/bin', file),
  });

  // O índice `web` de topo arrasta componentes React e não carrega em Node.
  // A API pura do Skia vive em `skia/web`.
  const { JsiSkApi } = require(
    path.join(NM, '@shopify/react-native-skia/lib/commonjs/skia/web/index.js'),
  );
  const Skia = JsiSkApi(CanvasKit);

  installModuleShim({
    Skia,
    ImageFormat: CanvasKit.ImageFormat,
    // O harness nunca monta a árvore React; se algo chamar isto, é engano.
    useFonts: () => {
      throw new Error('useFonts não existe fora do aplicativo — use o provider do harness.');
    },
  });

  const escolhidas = FONT_FILES[script];
  if (!escolhidas) throw new Error(`Alfabeto sem fontes no harness: ${script}`);

  // Autoteste: simula a fonte do relógio não ter carregado e o desenho cair
  // numa fonte de corpo. É o modo de falha mais perigoso do porte para a web,
  // porque não lança erro — e é o que o portão de geometria tem de pegar.
  const sabotage = process.env.LYMARK_HARNESS_BREAK_FONT === '1';
  const files = sabotage ? { ...escolhidas, clock: escolhidas.body } : escolhidas;

  const typefaces = {};
  for (const [slot, file] of Object.entries(files)) {
    const data = Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(file)));
    const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
    if (!typeface) throw new Error(`O Skia recusou a fonte ${path.basename(file)}.`);
    typefaces[slot] = typeface;
  }

  // Só agora, com o atalho instalado, o módulo compilado do app pode entrar.
  const { createStampRenderer } = require(
    path.join(BUILD, 'src/features/watermark/skia-stamp.js'),
  );

  return { Skia, CanvasKit, renderer: createStampRenderer(typefaces) };
}

module.exports = { createNodeStampRenderer, FONT_FILES, BUILD };
