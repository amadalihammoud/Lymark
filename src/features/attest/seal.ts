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
 * Pede o recibo para um hash já calculado. `null` em qualquer falha — sem
 * sessão, sem rede, prazo vencido, resposta estranha. É a metade comum aos
 * dois selos: a foto embute via segmento COM, o vídeo via caixa `lymk` no
 * processo principal do desktop.
 */
export async function requestReceipt(
  hash: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<string | null> {
  const { fetchImpl = fetch, timeoutMs = ATTEST_TIMEOUT_MS } = options;

  try {
    const token = await getSessionToken();
    if (!token) return null;

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
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const receipt = (body as { receipt?: unknown } | null)?.receipt;
    return typeof receipt === 'string' && receipt.length > 0 ? receipt : null;
  } catch {
    return null;
  }
}

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
  try {
    const digest = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytes.slice().buffer,
    );
    const receipt = await requestReceipt(bytesToBase64Url(new Uint8Array(digest)), options);
    if (!receipt) return { bytes, sealed: false };

    return { bytes: embedSeal(bytes, receipt), sealed: true };
  } catch {
    return { bytes, sealed: false };
  }
}

/**
 * Sela um vídeo exportado NO DESKTOP — o único lugar onde o vídeo sai em
 * MP4 e onde hash e append custam quase nada (stream e ~300 bytes, no
 * processo principal). Melhor esforço, como tudo no selo: qualquer falha
 * deixa o arquivo exatamente como está.
 */
export async function sealExportedVideo(path: string): Promise<boolean> {
  try {
    const bridge = globalThis.window?.lymark;
    if (!bridge?.hashVideoFile || !bridge.sealVideo) return false;

    const hashed = await bridge.hashVideoFile(path);
    if (hashed.status !== 'ok' || !hashed.hash) return false;

    const receipt = await requestReceipt(hashed.hash);
    if (!receipt) return false;

    return (await bridge.sealVideo(path, receipt)).ok;
  } catch {
    return false;
  }
}
