/**
 * Carimbo de vídeo no navegador — versão nativa (celular).
 *
 * No celular este caminho não existe: o plano é gravar já com o carimbo
 * (câmera com processador de quadros), fase própria no PROGRESSO.md. Este
 * arquivo é o par do `.web.ts` para o resolvedor de plataforma; a tela de
 * vídeo nem oferece o fluxo fora do desktop e da web.
 */

export type StampVideoResult =
  | { status: 'saved'; fileName: string }
  | { status: 'failed'; error: string };

export async function stampVideoInBrowser(_options: {
  file: File;
  overlay: Uint8Array;
  fileName: string;
  onProgress: (percent: number) => void;
}): Promise<StampVideoResult> {
  return { status: 'failed', error: 'indisponível nesta plataforma' };
}

export async function probeVideoFile(
  _file: File,
): Promise<{ width: number; height: number; durationMs: number } | null> {
  return null;
}
