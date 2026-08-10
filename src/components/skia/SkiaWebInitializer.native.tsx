/**
 * Versão nativa: não há nada a inicializar.
 *
 * No iOS e no Android o Skia é a biblioteca nativa embarcada, disponível
 * desde o primeiro render. Quem precisa de carregamento é só a web, onde ele
 * chega como WebAssembly.
 *
 * Este arquivo existe porque o `_layout.tsx` monta o inicializador na raiz,
 * sem guarda de plataforma — e o Metro resolve `.native` antes da variante
 * comum. Sem ele, o aparelho carregava o módulo do CanvasKit e chamava
 * `LoadSkiaWeb()` sobre um motor JavaScript que não fornece `WebAssembly`.
 * A falha era garantida em todo lançamento do aplicativo.
 *
 * Mantém a mesma superfície exportada da variante web: quem consome não
 * precisa saber em qual plataforma está.
 */

export type SkiaLoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** No nativo o Skia já está pronto; a função de carga existe só por simetria. */
export function useSkiaStatus(): [SkiaLoadStatus, () => Promise<void>] {
  return ['ready', () => Promise.resolve()];
}

export function SkiaWebInitializer() {
  return null;
}

export function useWaitForSkia(): boolean {
  return true;
}
