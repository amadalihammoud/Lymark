import { readStored, resolveEntitlement, type StoredEntitlement } from '../../src/features/entitlements/server';
import type { Entitlement } from '../../src/features/entitlements/types';

/**
 * O que a rota `/api/entitlements` faz, sem Next e sem Clerk por dentro.
 *
 * As três dependências externas — verificar o token, ler e gravar o registro
 * — entram por parâmetro. É o que permite testar cada resposta HTTP sem
 * subir servidor nem ter chave, e é também o que deixa a troca de Clerk
 * `privateMetadata` por banco (§6.1 do `docs/ASSINATURA.md`) num só lugar.
 *
 * O contrato do JSON é `Entitlement`, importado do aplicativo: existe uma
 * definição só, e o teste `server.test.ts` prova que o que sai daqui é o que
 * `parseEntitlement` aceita do outro lado.
 */

/** Chave dentro de `privateMetadata` do usuário no Clerk. */
export const METADATA_KEY = 'entitlement';

export type EntitlementStore = {
  /** Devolve o `userId` do token, ou `null` se ele não vale. Não lança. */
  verify: (token: string) => Promise<string | null>;
  /** O que está gravado para o usuário — o valor cru sob `METADATA_KEY`. */
  read: (userId: string) => Promise<unknown>;
  /** Grava o registro inteiro sob `METADATA_KEY`. */
  write: (userId: string, stored: StoredEntitlement) => Promise<void>;
};

export type HandlerResult = {
  status: number;
  body: Entitlement | { error: string };
};

/**
 * Trata uma chamada já desmontada: método, cabeçalho de autorização e corpo.
 *
 * `spent` só é lido no `POST` — um `GET` é leitura pura, e aceitar corpo nele
 * seria uma segunda forma de fazer a mesma coisa. Corpo malformado no `POST`
 * é 400 e não 200 com `spent: 0`: silenciar o erro deixaria o aparelho zerar o
 * `spentOffline` achando que as fotos subiram.
 */
export async function handleEntitlements(
  input: { method: string; authorization: string | null; body: unknown },
  store: EntitlementStore,
  now: () => Date = () => new Date(),
): Promise<HandlerResult> {
  if (input.method !== 'GET' && input.method !== 'POST') {
    return { status: 405, body: { error: 'método não permitido' } };
  }

  const token = bearerToken(input.authorization);
  if (!token) return { status: 401, body: { error: 'sem token' } };

  const userId = await store.verify(token);
  if (!userId) return { status: 401, body: { error: 'token inválido' } };

  let spent = 0;
  if (input.method === 'POST') {
    const parsed = readSpent(input.body);
    if (parsed === null) return { status: 400, body: { error: 'corpo inválido: esperado { spent: inteiro ≥ 0 }' } };
    spent = parsed;
  }

  const stored = readStored(await store.read(userId));
  const resolved = resolveEntitlement({ stored, spent, now: now() });

  // Grava só quando mudou: cada escrita no Clerk conta contra o limite de
  // taxa deles, e a maior parte das leituras não muda nada.
  if (resolved.changed) await store.write(userId, resolved.stored);

  return { status: 200, body: resolved.entitlement };
}

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function readSpent(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;
  const spent = (body as Record<string, unknown>).spent;
  if (typeof spent !== 'number' || !Number.isInteger(spent) || spent < 0) return null;
  return spent;
}
