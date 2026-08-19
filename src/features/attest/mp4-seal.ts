import { SEAL_PREFIX } from './jpeg-seal';

/**
 * O selo dentro do MP4 — a segunda convenção do `docs/AUTENTICIDADE.md`.
 *
 * Um MP4 é uma sequência de caixas `[tamanho u32][tipo 4cc][conteúdo]`. O
 * recibo entra numa caixa própria, `lymk`, ANEXADA AO FIM do arquivo — todo
 * reprodutor ignora caixas de tipo desconhecido, então o vídeo abre igual
 * em qualquer lugar. E a regra do hash é a mesma do JPEG: **cobre o arquivo
 * sem a caixa do selo** — anexar não invalida, remover reconstrói os bytes
 * originais byte a byte.
 *
 * Anexar ao fim não é preguiça, é desempenho: selar um vídeo de um giga
 * custa um `append` de ~300 bytes, sem reescrever nada — e o desktop faz
 * exatamente isso, por stream, sem carregar o arquivo na memória.
 */

const BOX_TYPE = 'lymk';
const MAX_RECEIPT_LENGTH = 4096;

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

/** MP4 de verdade começa com uma caixa `ftyp`. */
export function isMp4(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && readType(bytes, 4) === 'ftyp';
}

/**
 * Encontra a caixa do selo percorrendo as caixas de topo.
 *
 * Percorre só os CABEÇALHOS — oito bytes por caixa, nunca o conteúdo — e
 * respeita as duas formas especiais de tamanho do padrão: `1` (tamanho de
 * 64 bits a seguir) e `0` (a caixa vai até o fim do arquivo).
 *
 * A caixa só vale NO FIM DO ARQUIVO, que é onde este módulo a anexa e o que
 * o cabeçalho aqui em cima já prometia. Aceitá-la em qualquer fronteira
 * fazia um recibo autenticar um CONJUNTO de arquivos em vez de um: como o
 * recibo prende `sha256(arquivo sem a caixa)`, todo arquivo da forma
 * "original + caixa em alguma fronteira" produzia os mesmos bytes despidos,
 * o mesmo hash e a mesma assinatura válida.
 *
 * No JPEG isso seria inócuo — um segmento COM é inerte e o formato não tem
 * deslocamento absoluto. No MP4 não é: `stco`/`co64`, dentro do `moov`, são
 * OFFSETS ABSOLUTOS DE ARQUIVO. Mover a caixa do fim para antes do `mdat`
 * empurra todas as amostras pelo tamanho dela, e o reprodutor passa a
 * decodificar outros bytes. Foi demonstrado com o ffmpeg do projeto: os dois
 * arquivos davam "Íntegra" na página de verificação, e só um tocava.
 */
function findSealBox(
  bytes: Uint8Array,
): { start: number; end: number; text: string } | null {
  if (!isMp4(bytes)) return null;

  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const size32 = readU32(bytes, offset);
    const type = readType(bytes, offset + 4);

    let size = size32;
    let headerLength = 8;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return null;
      // Tamanho de 64 bits: os 32 altos precisam caber num arquivo real.
      const high = readU32(bytes, offset + 8);
      const low = readU32(bytes, offset + 12);
      if (high !== 0) return null;
      size = low;
      headerLength = 16;
    } else if (size32 === 0) {
      size = bytes.length - offset;
    }
    if (size < headerLength || offset + size > bytes.length) return null;

    // Só a caixa que TERMINA no fim do arquivo conta — ver o cabeçalho.
    if (type === BOX_TYPE && offset + size === bytes.length) {
      const payload = bytes.subarray(offset + headerLength, offset + size);
      const text = asciiToString(payload);
      if (text !== null && text.startsWith(SEAL_PREFIX)) {
        return { start: offset, end: offset + size, text: text.slice(SEAL_PREFIX.length) };
      }
    }

    offset += size;
  }
  return null;
}

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
 * Monta os bytes da caixa do selo — o que o desktop ANEXA ao arquivo.
 *
 * Separado do "anexar" de propósito: quem tem o arquivo inteiro em memória
 * concatena; quem tem um arquivo de um giga no disco faz `append` destes
 * bytes e de mais nada.
 */
export function buildSealBox(receipt: string): Uint8Array {
  const text = SEAL_PREFIX + receipt;
  if (text.length > MAX_RECEIPT_LENGTH) throw new Error('recibo grande demais');
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) throw new Error('recibo com caractere fora do ASCII');
  }

  const size = 8 + text.length;
  const box = new Uint8Array(size);
  box[0] = (size >>> 24) & 0xff;
  box[1] = (size >>> 16) & 0xff;
  box[2] = (size >>> 8) & 0xff;
  box[3] = size & 0xff;
  box[4] = BOX_TYPE.charCodeAt(0);
  box[5] = BOX_TYPE.charCodeAt(1);
  box[6] = BOX_TYPE.charCodeAt(2);
  box[7] = BOX_TYPE.charCodeAt(3);
  for (let index = 0; index < text.length; index += 1) {
    box[8 + index] = text.charCodeAt(index);
  }
  return box;
}

/** O recibo embutido, ou `null` quando o arquivo não tem selo. */
export function extractSealMp4(bytes: Uint8Array): string | null {
  return findSealBox(bytes)?.text ?? null;
}

/**
 * Remove a caixa do selo, devolvendo os bytes sobre os quais o hash foi
 * calculado. Sem selo, devolve o próprio buffer — sem cópia à toa.
 */
export function stripSealMp4(bytes: Uint8Array): Uint8Array {
  const box = findSealBox(bytes);
  if (!box) return bytes;

  const output = new Uint8Array(bytes.length - (box.end - box.start));
  output.set(bytes.subarray(0, box.start), 0);
  output.set(bytes.subarray(box.end), box.start);
  return output;
}
