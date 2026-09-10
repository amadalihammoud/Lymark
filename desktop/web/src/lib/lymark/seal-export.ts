import { issueAttest } from "@/lib/lymark/api";
import { sha256Base64Url } from "@/lib/lymark/hash";
import { embedSeal } from "@/lib/lymark/jpeg-seal";

/** Quanto esperar pelo recibo antes de a foto sair sem selo. */
export const ATTEST_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Sela o JPEG exportado. Melhor esforço: qualquer falha devolve os bytes
 * originais. O arquivo nunca sobe — só o hash SHA-256.
 */
export async function sealExportedPhoto(
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; sealed: boolean }> {
  try {
    const hash = await sha256Base64Url(bytes);
    const { receipt } = await withTimeout(
      issueAttest({ data: { hash } }),
      ATTEST_TIMEOUT_MS,
    );
    if (!receipt) return { bytes, sealed: false };
    return { bytes: embedSeal(bytes, receipt), sealed: true };
  } catch {
    return { bytes, sealed: false };
  }
}
