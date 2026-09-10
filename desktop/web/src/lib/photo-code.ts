const ALPHABET = "0123456789ABCDEF";

export function makePhotoCode(length = 14): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
