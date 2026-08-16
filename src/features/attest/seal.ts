import * as Crypto from 'expo-crypto';

import { ENTITLEMENTS_ENDPOINT } from '@/features/auth/config';
import { getSessionToken } from '@/features/auth/token-bridge';
import { bytesToBase64Url } from './receipt';
import { embedSeal } from './jpeg-seal';

/**
 * O selo na exportação — melhor esforço, nunca um obstáculo.
 *
 * Regras que governam este arquivo (`docs/AUTENTICIDADE.md` §4):
 *
 * - **Nada aqui lança.** Uma falha de rede no meio de uma exportação em
 *   campo não pode custar a foto. Qualquer problema devolve os bytes
 *   originais, intactos.
 * - **Nada aqui espera demais.** O pedido tem teto curto; vencido o prazo,
 *   a foto sai sem selo. O hash é nativo (expo-crypto) e custa milissegundos
 *   mesmo em fotos de 4000px.
 */

/** Quanto esperar pelo servidor antes de exportar sem selo. */
export const ATTEST_TIMEOUT_MS = 4000;

const ATTEST_ENDPOINT =
  process.env.EXPO_PUBLIC_ATTEST_URL ??
  ENTITLEMENTS_ENDPOINT.replace(/\/entitlements$/, '/attest');

/**
 * Tenta selar os bytes de um JPEG exportado.
 *
 * Devolve os bytes selados, ou os originais quando não há sessão, não há
 * rede, o servidor não respondeu a tempo, ou o selo não está configurado —
 * todos os caminhos em que a resposta certa é "a foto sai do mesmo jeito".
 */
export async function sealExportedPhoto(
  bytes: Uint8Array,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<{ bytes: Uint8Array; sealed: boolean }> {
  const { fetchImpl = fetch, timeoutMs = ATTEST_TIMEOUT_MS } = options;

  try {
    const token = await getSessionToken();
    if (!token) return { bytes, sealed: false };

    const digest = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytes.slice().buffer,
    );
    const hash = bytesToBase64Url(new Uint8Array(digest));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(ATTEST_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ hash }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return { bytes, sealed: false };

    const body: unknown = await response.json();
    const receipt = (body as { receipt?: unknown } | null)?.receipt;
    if (typeof receipt !== 'string' || receipt.length === 0) return { bytes, sealed: false };

    return { bytes: embedSeal(bytes, receipt), sealed: true };
  } catch {
    return { bytes, sealed: false };
  }
}
