const SOI = 0xffd8;
const COM = 0xfffe;
const SOS = 0xffda;
export const SEAL_PREFIX = "lymark-selo:";
const MAX_RECEIPT_LENGTH = 4096;

function readMarker(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && readMarker(bytes, 0) === SOI;
}

function asciiToString(payload: Uint8Array): string | null {
  if (payload.length > MAX_RECEIPT_LENGTH) return null;
  let text = "";
  for (const byte of payload) {
    if (byte < 0x20 || byte > 0x7e) return null;
    text += String.fromCharCode(byte);
  }
  return text;
}

function findSealSegment(
  bytes: Uint8Array,
): { start: number; end: number; text: string } | null {
  if (!isJpeg(bytes)) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    const marker = readMarker(bytes, offset);
    if ((marker & 0xff00) !== 0xff00 || marker === SOS) return null;
    const length = readMarker(bytes, offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker === COM) {
      const payload = bytes.subarray(offset + 4, offset + 2 + length);
      const text = asciiToString(payload);
      if (text !== null && text.startsWith(SEAL_PREFIX)) {
        return {
          start: offset,
          end: offset + 2 + length,
          text: text.slice(SEAL_PREFIX.length),
        };
      }
    }
    offset += 2 + length;
  }
  return null;
}

export function embedSeal(jpeg: Uint8Array, receipt: string): Uint8Array {
  if (!isJpeg(jpeg)) throw new Error("não é um JPEG");
  const text = SEAL_PREFIX + receipt;
  if (text.length > MAX_RECEIPT_LENGTH) throw new Error("recibo grande demais");
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) throw new Error("recibo com caractere fora do ASCII");
  }
  const segmentLength = text.length + 2;
  const output = new Uint8Array(jpeg.length + 4 + text.length);
  output.set(jpeg.subarray(0, 2), 0);
  output[2] = 0xff;
  output[3] = 0xfe;
  output[4] = (segmentLength >> 8) & 0xff;
  output[5] = segmentLength & 0xff;
  for (let i = 0; i < text.length; i++) output[6 + i] = text.charCodeAt(i);
  output.set(jpeg.subarray(2), 6 + text.length);
  return output;
}

export function extractSeal(jpeg: Uint8Array): string | null {
  return findSealSegment(jpeg)?.text ?? null;
}

export function stripSeal(jpeg: Uint8Array): Uint8Array {
  const segment = findSealSegment(jpeg);
  if (!segment) return jpeg;
  const output = new Uint8Array(jpeg.length - (segment.end - segment.start));
  output.set(jpeg.subarray(0, segment.start), 0);
  output.set(jpeg.subarray(segment.end), segment.start);
  return output;
}
