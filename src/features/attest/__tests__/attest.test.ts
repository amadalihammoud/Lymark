import { createHash, generateKeyPairSync } from 'node:crypto';

// A assinatura vive no site, e este é o único teste que a alcança — a mesma
// exceção, pelo mesmo motivo, de `handler.test.ts` nos entitlements.
// eslint-disable-next-line no-restricted-imports
import { attestConfig, issueReceipt, verifyReceipt } from '../../../../site/lib/attest';
import { embedSeal, extractSeal, stripSeal, SEAL_PREFIX } from '../jpeg-seal';
import { bytesToBase64Url, parseReceipt } from '../receipt';

/**
 * O selo é a credencial de prova do produto: cada teste abaixo é um jeito
 * de a verificação ter de dizer não — e o primeiro é o contrato inteiro,
 * de ponta a ponta: emitir, embutir, extrair, remover, conferir.
 */

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUBLIC_B64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const NOW = new Date('2026-08-16T15:00:00Z');

function config() {
  process.env.ATTEST_PRIVATE_KEY = privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');
  const loaded = attestConfig();
  if (!loaded) throw new Error('config não carregou');
  return loaded;
}

/** Um JPEG mínimo válido: SOI, um APP0 curto, SOS e EOI. */
function tinyJpeg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, // APP0, len 4
    0xff, 0xda, 0x00, 0x02, // SOS
    0x01, 0x02, 0x03, // dados
    0xff, 0xd9, // EOI
  ]);
}

function sha256b64url(bytes: Uint8Array): string {
  return bytesToBase64Url(new Uint8Array(createHash('sha256').update(bytes).digest()));
}

describe('o selo, de ponta a ponta', () => {
  it('emite, embute, extrai, remove e confere — o fluxo inteiro', () => {
    const jpeg = tinyJpeg();
    const hash = sha256b64url(jpeg);

    const receipt = issueReceipt(config(), { hash, userId: 'user_1', now: NOW });
    const sealed = embedSeal(jpeg, receipt);

    // O arquivo selado continua um JPEG com o mesmo conteúdo visível.
    expect(sealed.length).toBe(jpeg.length + 4 + SEAL_PREFIX.length + receipt.length);

    // A verificação refaz o caminho: extrai, remove, recalcula, confere.
    expect(extractSeal(sealed)).toBe(receipt);
    const stripped = stripSeal(sealed);
    expect(Buffer.from(stripped)).toEqual(Buffer.from(jpeg));
    expect(sha256b64url(stripped)).toBe(hash);

    const payload = verifyReceipt(receipt, PUBLIC_B64);
    expect(payload).toEqual({ v: 1, h: hash, sub: 'user_1', iat: Math.floor(NOW.getTime() / 1000) });
  });

  it('recusa assinatura de outra chave', () => {
    const receipt = issueReceipt(config(), { hash: sha256b64url(tinyJpeg()), userId: 'user_1', now: NOW });
    const other = generateKeyPairSync('ed25519')
      .publicKey.export({ type: 'spki', format: 'der' })
      .toString('base64');
    expect(verifyReceipt(receipt, other)).toBeNull();
  });

  it('recusa payload adulterado com assinatura original', () => {
    const receipt = issueReceipt(config(), { hash: sha256b64url(tinyJpeg()), userId: 'user_1', now: NOW });
    const [version, , signature] = receipt.split('.');
    const forged = bytesToBase64Url(
      new Uint8Array(Buffer.from(JSON.stringify({ v: 1, h: 'A'.repeat(43), sub: 'user_9', iat: 1 }))),
    );
    expect(verifyReceipt(`${version}.${forged}.${signature}`, PUBLIC_B64)).toBeNull();
  });

  it('um byte trocado na imagem muda o hash — o transplante de selo não cola', () => {
    const jpeg = tinyJpeg();
    const receipt = issueReceipt(config(), { hash: sha256b64url(jpeg), userId: 'user_1', now: NOW });
    const sealed = embedSeal(jpeg, receipt);

    const edited = sealed.slice();
    edited[edited.length - 3] ^= 0xff; // um byte dos dados comprimidos

    const parsed = parseReceipt(extractSeal(edited) ?? '');
    expect(parsed).not.toBeNull();
    // O recibo continua íntegro e assinado — mas o hash do arquivo não bate.
    expect(sha256b64url(stripSeal(edited))).not.toBe(parsed?.payload.h);
  });

  it('arquivo sem selo passa ileso por extração e remoção', () => {
    const jpeg = tinyJpeg();
    expect(extractSeal(jpeg)).toBeNull();
    // Sem selo, `stripSeal` devolve o próprio buffer — sem cópia à toa.
    expect(stripSeal(jpeg)).toBe(jpeg);
  });

  it('recusa o que não é recibo: vazio, lixo, versão desconhecida', () => {
    expect(parseReceipt('')).toBeNull();
    expect(parseReceipt('lixo')).toBeNull();
    expect(parseReceipt('LYM9.aaaa.bbbb')).toBeNull();
    expect(verifyReceipt('LYM1.!!.??', PUBLIC_B64)).toBeNull();
  });

  it('comentário JPEG de terceiros não é confundido com o selo', () => {
    const jpeg = tinyJpeg();
    // Um COM alheio ("hello") entre SOI e o resto.
    const withComment = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xfe, 0x00, 0x07, 0x68, 0x65, 0x6c, 0x6c, 0x6f,
      ...jpeg.subarray(2),
    ]);
    expect(extractSeal(withComment)).toBeNull();
    expect(stripSeal(withComment)).toBe(withComment);
  });
});
