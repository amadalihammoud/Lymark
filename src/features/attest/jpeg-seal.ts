/**
 * O selo dentro do JPEG — embutir, encontrar e remover.
 *
 * O recibo de autenticidade (`docs/AUTENTICIDADE.md`) viaja num segmento de
 * comentário JPEG (`FFFE`), logo após o SOI, com o prefixo `lymark-selo:`.
 * Comentários são ignorados por todo visualizador: a foto abre igual em
 * qualquer lugar, com ou sem selo.
 *
 * A regra que resolve o ovo-e-galinha (o hash não pode cobrir o próprio
 * recibo): **o hash cobre o arquivo sem o segmento do selo**. A emissão
 * calcula o hash antes de embutir; a verificação remove o segmento com
 * `stripSeal` antes de recalcular. App e site importam ESTE arquivo — uma
 * definição só, e a divergência silenciosa entre as pontas fica impossível.
 *
 * Desempenho: uma passada pelos cabeçalhos de segmento (nunca pelos dados
 * comprimidos), e as cópias são `set` de blocos inteiros — nada byte a byte.
 */

const SOI = 0xffd8;
const COM = 0xfffe;
const SOS = 0xffda;

/** O prefixo que distingue o nosso comentário de qualquer outro. */
export const SEAL_PREFIX = 'lymark-selo:';

/** Tamanho máximo aceito para um recibo. Um recibo real tem ~300 bytes. */
const MAX_RECEIPT_LENGTH = 4096;

function readMarker(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && readMarker(bytes, 0) === SOI;
}

/**
 * Encontra o segmento do selo. Devolve `null` quando não há.
 *
 * Percorre apenas os cabeçalhos até o SOS — depois dele vêm os dados
 * comprimidos, onde nenhum segmento nosso pode morar.
 */
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
        return { start: offset, end: offset + 2 + length, text: text.slice(SEAL_PREFIX.length) };
      }
    }

    offset += 2 + length;
  }
  return null;
}

/** Decodifica ASCII imprimível; `null` se houver byte fora disso. */
function asciiToString(payload: Uint8Array): string | null {
  if (payload.length > MAX_RECEIPT_LENGTH) return null;
  let text = '';
  for (let index = 0; index < payload.length; index += 1) {
    const byte = payload[index];
    if (byte < 0x20 || byte > 0x7e) return null;
    text += String.fromCharCode(byte);
  }
  return text;
}

/**
 * Embute o recibo. Devolve um NOVO buffer; o original não é tocado.
 *
 * O segmento entra logo após o SOI, antes de qualquer outro — o lugar em
 * que nenhum parser de EXIF ou de miniatura tropeça nele.
 */
export function embedSeal(jpeg: Uint8Array, receipt: string): Uint8Array {
  if (!isJpeg(jpeg)) throw new Error('não é um JPEG');

  const text = SEAL_PREFIX + receipt;
  if (text.length > MAX_RECEIPT_LENGTH) throw new Error('recibo grande demais');
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) throw new Error('recibo com caractere fora do ASCII');
  }

  const segmentLength = text.length + 2;
  const output = new Uint8Array(jpeg.length + 4 + text.length);
  output.set(jpeg.subarray(0, 2), 0);
  output[2] = 0xff;
  output[3] = 0xfe;
  output[4] = (segmentLength >> 8) & 0xff;
  output[5] = segmentLength & 0xff;
  for (let index = 0; index < text.length; index += 1) {
    output[6 + index] = text.charCodeAt(index);
  }
  output.set(jpeg.subarray(2), 6 + text.length);
  return output;
}

/** O recibo embutido, ou `null` quando o arquivo não tem selo. */
export function extractSeal(jpeg: Uint8Array): string | null {
  return findSealSegment(jpeg)?.text ?? null;
}

/**
 * Remove o segmento do selo, devolvendo os bytes sobre os quais o hash foi
 * calculado. Sem selo, devolve o próprio buffer — sem cópia à toa.
 */
export function stripSeal(jpeg: Uint8Array): Uint8Array {
  const segment = findSealSegment(jpeg);
  if (!segment) return jpeg;

  const output = new Uint8Array(jpeg.length - (segment.end - segment.start));
  output.set(jpeg.subarray(0, segment.start), 0);
  output.set(jpeg.subarray(segment.end), segment.start);
  return output;
}
