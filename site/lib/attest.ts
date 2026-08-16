import { createPrivateKey, sign, verify, createPublicKey, type KeyObject } from 'node:crypto';

import {
  bytesToBase64Url,
  encodeReceipt,
  parseReceipt,
  signedPortion,
  type ReceiptPayload,
} from '../../src/features/attest/receipt';

/**
 * A assinatura do selo — o lado do servidor (`docs/AUTENTICIDADE.md`).
 *
 * Ed25519 por três motivos práticos: assinatura de 64 bytes (o recibo cabe
 * confortável num comentário JPEG), verificação disponível no WebCrypto dos
 * navegadores (a página `/verificar` confere sem servidor), e nenhuma
 * decisão de parâmetro a errar — a curva é o parâmetro.
 *
 * Sem estado de propósito: o servidor assina e esquece. Não há tabela de
 * selos; o recibo é a prova inteira, e viaja dentro do próprio arquivo.
 */

export type AttestConfig = { privateKey: KeyObject };

export function attestConfig(): AttestConfig | null {
  const encoded = process.env.ATTEST_PRIVATE_KEY;
  if (!encoded) return null;
  try {
    return {
      privateKey: createPrivateKey({
        key: Buffer.from(encoded, 'base64'),
        format: 'der',
        type: 'pkcs8',
      }),
    };
  } catch {
    // Chave malformada é configuração quebrada: melhor "não configurado"
    // (503 explícito) do que lançar dentro da rota a cada pedido.
    return null;
  }
}

/** Emite o recibo para um hash, uma conta e um instante. */
export function issueReceipt(
  config: AttestConfig,
  input: { hash: string; userId: string; now: Date },
): string {
  const payload: ReceiptPayload = {
    v: 1,
    h: input.hash,
    sub: input.userId,
    iat: Math.floor(input.now.getTime() / 1000),
  };
  const payloadB64 = bytesToBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = sign(null, Buffer.from(signedPortion(payloadB64), 'utf8'), config.privateKey);
  return encodeReceipt(payloadB64, bytesToBase64Url(signature));
}

/**
 * Confere um recibo contra a chave pública. Existe para os testes provarem
 * que o que o servidor emite é o que a página de verificação aceita — o
 * mesmo papel do `parseEntitlement` no contrato da cota.
 */
export function verifyReceipt(receipt: string, publicKeySpkiBase64: string): ReceiptPayload | null {
  const parsed = parseReceipt(receipt);
  if (!parsed) return null;

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeySpkiBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const valid = verify(
      null,
      Buffer.from(signedPortion(parsed.payloadB64), 'utf8'),
      publicKey,
      Buffer.from(base64UrlToStandard(parsed.signatureB64), 'base64'),
    );
    return valid ? parsed.payload : null;
  } catch {
    return null;
  }
}

function base64UrlToStandard(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/');
}
