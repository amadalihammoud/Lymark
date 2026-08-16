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
 */

export const DESKTOP_TOKEN_DAYS = 90;

const VERSION = 'v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function mintDesktopToken(userId: string, secret: string, now: Date = new Date()): string {
  const payload = base64url(
    JSON.stringify({ sub: userId, exp: now.getTime() + DESKTOP_TOKEN_DAYS * DAY_MS }),
  );
  return `${VERSION}.${payload}.${sign(payload, secret)}`;
}

/** Devolve o `userId` do token, ou `null` se ele não vale. Não lança. */
export function verifyDesktopToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): string | null {
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

  const { sub, exp } = claims as Record<string, unknown>;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  if (typeof exp !== 'number' || now.getTime() >= exp) return null;

  return sub;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${VERSION}.${payload}`).digest('base64url');
}

function base64url(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}
