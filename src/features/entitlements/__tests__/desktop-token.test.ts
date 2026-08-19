import { createHmac } from 'node:crypto';

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
    expect(verifyDesktopToken(token, SECRET, NOW)).toEqual({
      sub: 'user_123',
      iat: NOW.getTime(),
    });
  });

  it('vale até o prazo, e nem um milissegundo além', () => {
    const token = mintDesktopToken('user_123', SECRET, NOW);
    const lastValid = new Date(NOW.getTime() + DESKTOP_TOKEN_DAYS * 24 * 60 * 60 * 1000 - 1);
    const expired = new Date(lastValid.getTime() + 1);

    expect(verifyDesktopToken(token, SECRET, lastValid)?.sub).toBe('user_123');
    expect(verifyDesktopToken(token, SECRET, expired)).toBeNull();
  });

  /*
   * O `iat` é o que torna o token revogável: `clerkStore` o compara com a
   * data de corte gravada no Clerk. Sem ele, um token vazado valia noventa
   * dias corridos e nada — nem sair da conta, nem excluí-la — o cortava.
   */
  it('carimba quando foi emitido, e o carimbo sobrevive à ida e volta', () => {
    const antes = mintDesktopToken('user_123', SECRET, NOW);
    const depois = mintDesktopToken('user_123', SECRET, new Date(NOW.getTime() + 60_000));

    expect(verifyDesktopToken(antes, SECRET, NOW)?.iat).toBe(NOW.getTime());
    expect(verifyDesktopToken(depois, SECRET, NOW)?.iat).toBe(NOW.getTime() + 60_000);
  });

  it('token da primeira versão, sem `iat`, é tratado como o mais antigo possível', () => {
    // Emitido à mão no formato antigo — `{ sub, exp }`, sem `iat`. Cair em 0
    // é o lado seguro: qualquer revogação é posterior, então o primeiro corte
    // o mata; e enquanto ninguém revoga nada, ele segue valendo.
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user_123', exp: NOW.getTime() + 1000 }),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', SECRET).update(`v1.${payload}`).digest('base64url');

    expect(verifyDesktopToken(`v1.${payload}.${signature}`, SECRET, NOW)).toEqual({
      sub: 'user_123',
      iat: 0,
    });
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
