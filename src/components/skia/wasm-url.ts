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
 *
 * No export hospedado (`LYMARK_WEB_BASE=/web` → `experiments.baseUrl` via
 * `app.config.js`), o arquivo vive em `/web/canvaskit.wasm`. O
 * `babel-preset-expo` embute esse baseUrl em `process.env.EXPO_BASE_URL` no
 * transform — é a forma documentada pelo Expo de ler o prefixo no cliente.
 * Sem isso o pedido ia para `https://lymark.app/canvaskit.wasm` (404) em vez
 * de `https://lymark.app/web/canvaskit.wasm`.
 */

/**
 * Prefixo absoluto (com barras) sob o qual o build é servido.
 *
 * Lê `EXPO_BASE_URL` (inlined no bundle a partir de `experiments.baseUrl`) e,
 * fora do transform (Jest/Node), aceita `LYMARK_WEB_BASE` como fallback — o
 * mesmo env que o `web:build:hosted` exporta. Vazio → raiz (`/`), para não
 * quebrar Electron (`app://lymark/`), `app.lymark.app` nem localhost.
 */
function resolveBasePath(): string {
  const raw =
    (typeof process !== 'undefined' &&
      (process.env.EXPO_BASE_URL || process.env.LYMARK_WEB_BASE)) ||
    '';
  const trimmed = String(raw).trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

/**
 * A URL absoluta do `canvaskit.wasm`, resolvida a partir da raiz da origem
 * (respeitando o base path do export, se houver).
 *
 * Resolve **contra** o `baseURI` em vez de devolver um caminho absoluto cru
 * porque é isso que preserva esquema e origem: no Electron eles são
 * `app://lymark/`, e `/canvaskit.wasm` sozinho sairia da origem do aplicativo.
 */
export function canvasKitWasmUrl(baseURI: string): string {
  return new URL(`${resolveBasePath()}canvaskit.wasm`, baseURI).href;
}
