import { desktop } from "@/lib/desktop";
import { renderStampOverlay, type StampLook } from "@/lib/export-stamp";
import { issueAttest } from "@/lib/lymark/api";
import { ATTEST_TIMEOUT_MS } from "@/lib/lymark/seal-export";

/**
 * O vídeo inteiro carimbado, no desktop.
 *
 * No navegador o studio tira um quadro do vídeo e o carimba — é o que o
 * navegador alcança sem reencodar. Dentro do desktop existe o ffmpeg, e o
 * caminho é o mesmo da foto: o carimbo vira um PNG transparente do tamanho
 * do quadro (`renderStampOverlay`) e o processo principal o sobrepõe em cada
 * quadro, com o áudio copiado. O progresso vem por evento.
 */
export async function stampVideoOnDesktop({
  path,
  width,
  height,
  durationMs,
  look,
  onProgress,
}: {
  path: string;
  width: number;
  height: number;
  durationMs: number;
  look: StampLook;
  onProgress: (percent: number) => void;
}): Promise<{ status: "saved" | "cancelled" | "failed"; path?: string; error?: string }> {
  if (!desktop) return { status: "failed", error: "sem desktop" };

  const overlay = await renderStampOverlay(width, height, look);
  const stop = desktop.onVideoProgress(onProgress);
  try {
    return await desktop.watermarkVideo(path, overlay, durationMs);
  } finally {
    stop();
  }
}

/**
 * O selo de autenticidade no vídeo, em duas metades: o hash por stream no
 * processo principal, o recibo pela API (com o mesmo prazo da foto) e a caixa
 * `lymk` anexada ao fim do arquivo — ver `docs/AUTENTICIDADE.md`. Falhar aqui
 * não desfaz a exportação: o vídeo fica, só sem selo, como na foto.
 */
export async function sealVideoOnDesktop(path: string): Promise<boolean> {
  if (!desktop) return false;
  try {
    const hashed = await desktop.hashVideoFile(path);
    if (hashed.status !== "ok" || !hashed.hash) return false;

    const { receipt } = await Promise.race([
      issueAttest({ data: { hash: hashed.hash } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ATTEST_TIMEOUT_MS),
      ),
    ]);
    if (!receipt) return false;

    return (await desktop.sealVideo(path, receipt)).ok;
  } catch {
    return false;
  }
}
