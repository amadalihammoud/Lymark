import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * O token do desktop — a peça que o deep link carrega.
 *
 * O Electron não roda o clerk-js: a origem `app://` não é um domínio que o
 * Clerk conheça, e os tokens de sessão dele vivem sessenta segundos — inúteis
 * para um aplicativo que fica semanas sem abrir. O desenho é outro: a pessoa
 * entra pelo navegador (onde o Clerk funciona inteiro), e o site emite ESTE
 * token — nosso, assinado com HMAC, de vida longa — que volta ao desktop pelo
 * deep link `lymark://` e passa a autenticar `GET /api/entitlements`.
 *
 * Sem dependência de propósito: `node:crypto` basta para HMAC-SHA256, e um
 * JWT de biblioteca não compraria nada além do que estas sessenta linhas
 * dizem. O formato é `v1.<payload base64url>.<assinatura base64url>`, com
 * `{ sub, exp }` no payload — o mínimo que a verificação precisa.
 *
 * Noventa dias de validade: mais que o `LEASE_DAYS` da cota (30), porque o
 * token só precisa reautenticar a sincronização — quem manda no acesso é o
 * entitlement e seus três relógios, nunca o token. Vencido, a pessoa entra
 * pelo navegador de novo.
 *
 * O payload carrega `iat` além de `{ sub, exp }`, e é ele que torna o token
 * REVOGÁVEL. Sem isso, um token capturado valia noventa dias corridos e não
 * havia como cortá-lo: sair do aplicativo apagava só a cópia local, e nem a
 * exclusão da conta o invalidava — ele seguia emitindo selos Ed25519 com o
 * `sub` da vítima. Quem confere o `iat` contra a data de revogação é o
 * `clerkStore`, que já fala com o Clerk; aqui só o carimbamos e o
 * devolvemos.
 */

export const DESKTOP_TOKEN_DAYS = 90;

const VERSION = 'v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function mintDesktopToken(userId: string, secret: string, now: Date = new Date()): string {
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      iat: now.getTime(),
      exp: now.getTime() + DESKTOP_TOKEN_DAYS * DAY_MS,
    }),
  );
  return `${VERSION}.${payload}.${sign(payload, secret)}`;
}

/** Quem é o dono do token, e de quando ele é. */
export interface DesktopTokenClaims {
  sub: string;
  /**
   * Quando foi emitido, em milissegundos.
   *
   * `0` para os tokens da primeira versão, que não traziam `iat`. É o valor
   * seguro: qualquer data de revogação é posterior a zero, então um token
   * antigo morre no primeiro corte — e, enquanto ninguém revoga nada, ele
   * continua valendo como antes.
   */
  iat: number;
}

/** Devolve as reivindicações do token, ou `null` se ele não vale. Não lança. */
export function verifyDesktopToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): DesktopTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [, payload, signature] = parts;

  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof claims !== 'object' || claims === null) return null;

  const { sub, exp, iat } = claims as Record<string, unknown>;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  if (typeof exp !== 'number' || now.getTime() >= exp) return null;

  return { sub, iat: typeof iat === 'number' ? iat : 0 };
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${VERSION}.${payload}`).digest('base64url');
}

function base64url(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}
