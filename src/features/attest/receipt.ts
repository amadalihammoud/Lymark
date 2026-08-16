/**
 * O formato do recibo — montar e desmontar, sem criptografia.
 *
 * `LYM1.<payload base64url>.<assinatura base64url>`, payload
 * `{ v, h, sub, iat }` — ver `docs/AUTENTICIDADE.md` §2. Assinar e verificar
 * moram em quem tem criptografia à mão (o servidor com `node:crypto`, a
 * página de verificação com WebCrypto); aqui fica só o formato, puro e
 * testável, importado pelas duas pontas.
 */

export const RECEIPT_VERSION = 'LYM1';

export type ReceiptPayload = {
  v: 1;
  /** SHA-256 (base64url) dos bytes sem o segmento do selo. */
  h: string;
  /** A conta emissora. */
  sub: string;
  /** Momento da emissão, no relógio do servidor (epoch em segundos). */
  iat: number;
};

/** O que a assinatura cobre: a versão e o payload, exatamente como viajam. */
export function signedPortion(payloadB64: string): string {
  return `${RECEIPT_VERSION}.${payloadB64}`;
}

export function encodeReceipt(payloadB64: string, signatureB64: string): string {
  return `${RECEIPT_VERSION}.${payloadB64}.${signatureB64}`;
}

/**
 * Desmonta e valida o formato. Devolve `null` para qualquer coisa fora do
 * contrato — a verificação nunca lança sobre entrada estranha.
 */
export function parseReceipt(
  receipt: string,
): { payload: ReceiptPayload; payloadB64: string; signatureB64: string } | null {
  const parts = receipt.split('.');
  if (parts.length !== 3 || parts[0] !== RECEIPT_VERSION) return null;
  const [, payloadB64, signatureB64] = parts;
  if (!isBase64Url(payloadB64) || !isBase64Url(signatureB64)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(base64UrlToString(payloadB64));
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;

  const { v, h, sub, iat } = raw as Record<string, unknown>;
  if (v !== 1) return null;
  if (typeof h !== 'string' || h.length === 0 || !isBase64Url(h)) return null;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  if (typeof iat !== 'number' || !Number.isInteger(iat) || iat <= 0) return null;

  return { payload: { v, h, sub, iat }, payloadB64, signatureB64 };
}

function isBase64Url(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

/** Decodifica base64url para texto sem depender de `Buffer` nem de `atob`. */
export function base64UrlToBytes(value: string): Uint8Array {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return new Uint8Array(0);
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function base64UrlToString(value: string): string {
  const bytes = base64UrlToBytes(value);
  let text = '';
  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index]);
  }
  // Payloads são JSON ASCII (chaves curtas, base64url e números) — o
  // caminho de char code basta e evita depender de TextDecoder.
  return text;
}

/** Codifica bytes em base64url — o par do decodificador acima. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const byte3 = index + 2 < bytes.length ? bytes[index + 2] : 0;
    output += ALPHABET[byte1 >> 2];
    output += ALPHABET[((byte1 & 0x03) << 4) | (byte2 >> 4)];
    if (index + 1 < bytes.length) output += ALPHABET[((byte2 & 0x0f) << 2) | (byte3 >> 6)];
    if (index + 2 < bytes.length) output += ALPHABET[byte3 & 0x3f];
  }
  return output;
}
