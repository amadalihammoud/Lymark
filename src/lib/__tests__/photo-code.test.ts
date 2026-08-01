import { PHOTO_CODE_LENGTH, generatePhotoCode, isValidPhotoCode, normalizePhotoCode } from '../photo-code';

// O gerador criptográfico é nativo; aqui só interessa a transformação de
// bytes em código, então o sorteio vira uma sequência previsível.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_, index) => index),
}));

describe('generatePhotoCode', () => {
  it('produz um código com o comprimento padrão', () => {
    expect(generatePhotoCode()).toHaveLength(PHOTO_CODE_LENGTH);
  });

  it('mapeia cada byte para um dígito hexadecimal maiúsculo', () => {
    // bytes 0..13 → posições 0..13 do alfabeto hexadecimal.
    expect(generatePhotoCode()).toBe('0123456789ABCD');
  });

  it('respeita um comprimento customizado', () => {
    expect(generatePhotoCode(4)).toBe('0123');
  });
});

describe('isValidPhotoCode', () => {
  it('aceita apenas o formato produzido pelo gerador', () => {
    expect(isValidPhotoCode('98926A73655DC1')).toBe(true);
  });

  it('rejeita comprimento errado, minúsculas e caracteres fora do hexadecimal', () => {
    expect(isValidPhotoCode('98926A73655DC')).toBe(false);
    expect(isValidPhotoCode('98926a73655dc1')).toBe(false);
    expect(isValidPhotoCode('98926A73655DG1')).toBe(false);
    expect(isValidPhotoCode('')).toBe(false);
  });
});

describe('normalizePhotoCode', () => {
  it('converte para maiúsculas', () => {
    expect(normalizePhotoCode('98926a73655dc1')).toBe('98926A73655DC1');
  });

  it('descarta o que não é hexadecimal', () => {
    expect(normalizePhotoCode('98-92 6A/73655DC1')).toBe('98926A73655DC1');
  });

  it('corta no comprimento máximo', () => {
    expect(normalizePhotoCode('98926A73655DC1FFFF')).toHaveLength(PHOTO_CODE_LENGTH);
  });

  it('sobrevive a uma digitação totalmente inválida', () => {
    // "NADA DISSO!" → sobram apenas os caracteres hexadecimais: A, D, A, D.
    expect(normalizePhotoCode('nada disso!')).toBe('ADAD');
  });
});
