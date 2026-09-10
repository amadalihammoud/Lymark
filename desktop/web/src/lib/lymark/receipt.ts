export const RECEIPT_VERSION = "LYM1";

export type ReceiptPayload = {
  v: 1;
  h: string;
  sub: string;
  iat: number;
};

export function signedPortion(payloadB64: string): string {
  return `${RECEIPT_VERSION}.${payloadB64}`;
}

export function encodeReceipt(payloadB64: string, signatureB64: string): string {
  return `${RECEIPT_VERSION}.${payloadB64}.${signatureB64}`;
}

export function parseReceipt(
  receipt: string,
): { payload: ReceiptPayload; payloadB64: string; signatureB64: string } | null {
  const parts = receipt.split(".");
  if (parts.length !== 3 || parts[0] !== RECEIPT_VERSION) return null;
  const payloadB64 = parts[1];
  const signatureB64 = parts[2];
  if (!payloadB64 || !signatureB64) return null;
  if (!isBase64Url(payloadB64) || !isBase64Url(signatureB64)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(base64UrlToString(payloadB64));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const { v, h, sub, iat } = raw as Record<string, unknown>;
  if (v !== 1) return null;
  if (typeof h !== "string" || !isBase64Url(h)) return null;
  if (typeof sub !== "string" || sub.length === 0) return null;
  if (typeof iat !== "number" || !Number.isInteger(iat) || iat <= 0) return null;
  return { payload: { v, h, sub, iat }, payloadB64, signatureB64 };
}

function isBase64Url(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = i + 1 < bytes.length ? (bytes[i + 1] ?? 0) : 0;
    const b3 = i + 2 < bytes.length ? (bytes[i + 2] ?? 0) : 0;
    output += alphabet[b1 >> 2];
    output += alphabet[((b1 & 0x03) << 4) | (b2 >> 4)];
    if (i + 1 < bytes.length) output += alphabet[((b2 & 0x0f) << 2) | (b3 >> 6)];
    if (i + 2 < bytes.length) output += alphabet[b3 & 0x3f];
  }
  return output;
}

export function base64UrlToBytes(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
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
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return text;
}
