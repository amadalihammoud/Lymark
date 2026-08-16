/**
 * Onde o CanvasKit vai buscar o `canvaskit.wasm`.
 *
 * Fica em arquivo próprio, sem nenhum import, por um motivo prático: o
 * inicializador ao lado carrega o `@shopify/react-native-skia`, e um teste que
 * importasse aquele arquivo carregaria o Skia junto. A regra é pequena e o
 * defeito que ela corrige foi caro — então ela precisa ser testável sozinha.
 *
 * O defeito: `scripts/copy-wasm.js` deposita o arquivo na RAIZ do build, mas o
 * pedido era montado com caminho relativo sobre `document.baseURI`. Como
 * `web.output` é `static`, cada rota é um HTML próprio e o `baseURI` é a URL da
 * rota atual — de `/settings/language` o arquivo era pedido em
 * `/settings/canvaskit.wasm`, dava 404, o Skia não inicializava e o aplicativo
 * inteiro ficava em branco. Só a home escapava, por a raiz ser o próprio
 * diretório dela.
 */

/** O prefixo em que o build é servido. Vazio hoje; ver `experiments.baseUrl`. */
const BASE_PATH = '/';

/**
 * A URL absoluta do `canvaskit.wasm`, resolvida a partir da raiz da origem.
 *
 * Resolve **contra** o `baseURI` em vez de devolver um caminho absoluto cru
 * porque é isso que preserva esquema e origem: no Electron eles são
 * `app://lymark/`, e `/canvaskit.wasm` sozinho sairia da origem do aplicativo.
 */
export function canvasKitWasmUrl(baseURI: string): string {
  return new URL(`${BASE_PATH}canvaskit.wasm`, baseURI).href;
}
