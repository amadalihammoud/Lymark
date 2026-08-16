/**
 * Inicializador do Skia para a plataforma web.
 *
 * O CanvasKit WASM (~3MB) precisa ser carregado antes do primeiro render do Skia.
 * Este componente garante que o carregamento aconteça o mais cedo possível,
 * preferencialmente durante a splash screen.
 *
 * Na web, o `@shopify/react-native-skia` usa `LoadSkiaWeb` que carrega o WASM
 * do `canvaskit-wasm`. Este componente expõe o estado de carregamento para
 * que o app possa esperar se necessário.
 */

// Da build `module`, e NÃO da `commonjs`: o bundle da web resolve o resto do
// Skia pela build module, e importar o carregador da outra criava DUAS cópias
// do pacote — o CanvasKit era inicializado numa, e `useTypeface`/`Canvas`
// liam `undefined` na outra ("Cannot read properties of undefined (reading
// 'Typeface')"): o carimbo nunca desenhava na web.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useCallback, useEffect, useRef, useState } from 'react';

import { canvasKitWasmUrl } from './wasm-url';

/**
 * Estado de carregamento do Skia.
 */
export type SkiaLoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Hook para verificar o estado do Skia.
 *
 * Retorna o estado atual e uma função para forçar o carregamento.
 */
export function useSkiaStatus(): [SkiaLoadStatus, () => Promise<void>] {
  const [status, setStatus] = useState<SkiaLoadStatus>('idle');

  const load = useCallback(async () => {
    if (status === 'ready') return;
    if (status === 'loading') return;

    setStatus('loading');

    try {
      // Sem `locateFile`, o CanvasKit busca o `.wasm` ao lado do bundle —
      // `/_expo/static/js/web/canvaskit.wasm` — onde ele não está. O
      // `scripts/copy-wasm.js` deposita o arquivo na RAIZ do build, e é de
      // lá que ele precisa ser pedido. As duas pontas andam juntas.
      //
      // A regra de onde pedir mora em `wasm-url.ts`, com o histórico do defeito
      // que ela corrige e um teste que cobre as rotas profundas — que é onde
      // quebrava.
      await LoadSkiaWeb({
        locateFile: (file: string) =>
          file.endsWith('.wasm') && typeof document !== 'undefined'
            ? canvasKitWasmUrl(document.baseURI)
            : file,
      });
      setStatus('ready');
    } catch (error) {
      console.error('[SkiaWebInitializer] Falha ao carregar CanvasKit:', error);
      setStatus('failed');
    }
  }, [status]);

  // Dispara uma única vez, e é a marca no `ref` que garante isso.
  //
  // Sem ela havia laço infinito: `load` depende de `status`, o efeito depende
  // de `load`, e o estado `failed` não era barrado pelos guardas. Uma falha
  // recriava `load`, o efeito reexecutava, e a carga recomeçava — sem fim.
  // Como o `LoadSkiaWeb` memoiza a promessa, da segunda volta em diante a
  // rejeição é imediata e o laço gira na velocidade do `setTimeout(0)`,
  // ocupando a thread e drenando a bateria.
  //
  // A função `load` continua exposta pelo hook para uma nova tentativa
  // deliberada, que é o único caso em que repetir faz sentido.
  const autoLoadStarted = useRef(false);

  useEffect(() => {
    if (autoLoadStarted.current) return;
    autoLoadStarted.current = true;

    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return [status, load];
}

/**
 * Componente que inicializa o Skia para web.
 *
 * Deve ser colocado o mais cedo possível na árvore (ideal: no _layout.tsx)
 * para que o carregamento comece antes de qualquer componente Skia ser renderizado.
 */
export function SkiaWebInitializer() {
  // Apenas chamar o hook para iniciar o carregamento
  useSkiaStatus();

  // Não renderiza nada - apenas inicializa
  return null;
}

/**
 * Hook que aguarda o Skia estar pronto.
 *
 * Útil para componentes que dependem do Skia e querem mostrar um loading.
 */
export function useWaitForSkia(): boolean {
  const [status] = useSkiaStatus();
  return status === 'ready';
}
