/**
 * Bytes → base64, sem `Buffer`.
 *
 * O `Buffer` é do Node: existe no Electron e em alguns polyfills, mas não no
 * runtime do Android e do iOS — onde este módulo é justamente mais usado
 * (gravar o carimbo do vídeo no disco antes de entregá-lo ao módulo nativo).
 * Vinte linhas resolvem sem depender de plataforma nenhuma.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const byte3 = index + 2 < bytes.length ? bytes[index + 2] : 0;

    output += ALPHABET[byte1 >> 2];
    output += ALPHABET[((byte1 & 0x03) << 4) | (byte2 >> 4)];
    output += index + 1 < bytes.length ? ALPHABET[((byte2 & 0x0f) << 2) | (byte3 >> 6)] : '=';
    output += index + 2 < bytes.length ? ALPHABET[byte3 & 0x3f] : '=';
  }

  return output;
}
