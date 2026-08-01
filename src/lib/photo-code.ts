import * as Crypto from 'expo-crypto';

/**
 * Código de Foto: identificador hexadecimal curto carimbado na imagem.
 *
 * Serve para referenciar uma foto específica fora do app (numa ordem de
 * serviço, num laudo, numa conversa). Por isso é sorteado com gerador
 * criptográfico e não com `Math.random` — dois registros no mesmo dia não
 * podem colidir.
 */

const ALPHABET = '0123456789ABCDEF';

export const PHOTO_CODE_LENGTH = 14;

export function generatePhotoCode(length: number = PHOTO_CODE_LENGTH): string {
  const bytes = Crypto.getRandomBytes(length);
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return code;
}

/** Aceita apenas o formato que `generatePhotoCode` produz. */
export function isValidPhotoCode(value: string): boolean {
  return new RegExp(`^[0-9A-F]{${PHOTO_CODE_LENGTH}}$`).test(value);
}

/** Normaliza o que o usuário digita à mão no campo de código. */
export function normalizePhotoCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, PHOTO_CODE_LENGTH);
}
