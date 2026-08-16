// A regra vive no site, e este é o único teste que a alcança — a mesma
// exceção, pelo mesmo motivo, de `handler.test.ts` logo ao lado.
// eslint-disable-next-line no-restricted-imports
import {
  DESKTOP_TOKEN_DAYS,
  mintDesktopToken,
  verifyDesktopToken,
} from '../../../../site/lib/desktop-token';

/**
 * O token do desktop é a credencial de vida longa do deep link — se a
 * verificação aceitar o que não deve, qualquer string vira conta. Cada teste
 * abaixo é um jeito de ela ter de dizer não.
 */

const SECRET = 'segredo-de-teste';
const NOW = new Date('2026-08-16T12:00:00Z');

describe('desktop token', () => {
  it('aceita o que emitiu, e devolve o mesmo usuário', () => {
    const token = mintDesktopToken('user_123', SECRET, NOW);
    expect(verifyDesktopToken(token, SECRET, NOW)).toBe('user_123');
  });

  it('vale até o prazo, e nem um milissegundo além', () => {
    const token = mintDesktopToken('user_123', SECRET, NOW);
    const lastValid = new Date(NOW.getTime() + DESKTOP_TOKEN_DAYS * 24 * 60 * 60 * 1000 - 1);
    const expired = new Date(lastValid.getTime() + 1);

    expect(verifyDesktopToken(token, SECRET, lastValid)).toBe('user_123');
    expect(verifyDesktopToken(token, SECRET, expired)).toBeNull();
  });

  it('recusa assinatura de outro segredo', () => {
    const token = mintDesktopToken('user_123', 'outro-segredo', NOW);
    expect(verifyDesktopToken(token, SECRET, NOW)).toBeNull();
  });

  it('recusa payload adulterado, mesmo com o formato certo', () => {
    const token = mintDesktopToken('user_123', SECRET, NOW);
    const [version, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'user_999', exp: NOW.getTime() + 1000 }),
      'utf8',
    ).toString('base64url');

    expect(verifyDesktopToken(`${version}.${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('recusa o que não é token: vazio, lixo, versão desconhecida', () => {
    expect(verifyDesktopToken('', SECRET, NOW)).toBeNull();
    expect(verifyDesktopToken('lixo', SECRET, NOW)).toBeNull();
    expect(verifyDesktopToken('v2.a.b', SECRET, NOW)).toBeNull();
    expect(verifyDesktopToken('v1.não-base64.assinatura', SECRET, NOW)).toBeNull();
  });
});
