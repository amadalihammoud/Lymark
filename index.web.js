/**
 * Entrada da web (e do desktop, que serve o build web): o CanvasKit carrega
 * ANTES de o aplicativo existir.
 *
 * O motivo é uma linha dentro do react-native-skia:
 *
 *   // Skia.web.js
 *   export const Skia = JsiSkApi(global.CanvasKit);
 *
 * O objeto `Skia` da web é construído NO MOMENTO DO IMPORT, com o que
 * `global.CanvasKit` contiver. Como o aplicativo importa módulos do Skia no
 * topo dos arquivos, tudo era construído sobre `undefined` — e cada uso
 * morria com "Cannot read properties of undefined (reading 'Typeface')":
 * o carimbo não desenhava nem exportava em navegador nenhum, ainda que a
 * tela de carga dissesse pronto.
 *
 * Aqui o WASM é carregado primeiro, e só então o `require` avalia o bundle
 * do aplicativo — quando `global.CanvasKit` já existe. O `finally` garante
 * que uma falha de rede não deixe a página em branco: o app sobe do mesmo
 * jeito, e o portão de Skia da raiz mostra o erro com o botão de tentar de
 * novo, como já fazia.
 */
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { canvasKitWasmUrl } from './src/components/skia/wasm-url';

LoadSkiaWeb({
  locateFile: (file) =>
    file.endsWith('.wasm') && typeof document !== 'undefined'
      ? canvasKitWasmUrl(document.baseURI)
      : file,
})
  .catch((error) => {
    console.error('[entry] CanvasKit não carregou; o app sobe sem Skia.', error);
  })
  .finally(() => {
    require('expo-router/entry');
  });
