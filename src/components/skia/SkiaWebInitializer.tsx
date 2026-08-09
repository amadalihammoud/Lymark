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

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/commonjs/web';
import { useCallback, useEffect, useState } from 'react';

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
      // O LoadSkiaWeb carrega o CanvasKit WASM e define global.CanvasKit
      await LoadSkiaWeb();
      setStatus('ready');
    } catch (error) {
      console.error('[SkiaWebInitializer] Falha ao carregar CanvasKit:', error);
      setStatus('failed');
    }
  }, [status]);

  // Carregar automaticamente no mount
  useEffect(() => {
    // Usamos setTimeout para evitar chamar setState sincronamente no effect
    const timer = setTimeout(() => {
      load();
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
