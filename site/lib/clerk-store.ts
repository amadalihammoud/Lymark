import { createClerkClient, verifyToken } from '@clerk/backend';

import { METADATA_KEY, type EntitlementStore } from './entitlements';

/**
 * O `store` de verdade: o Clerk como lugar onde o entitlement mora (§6.1 do
 * `docs/ASSINATURA.md`). Usado pela rota da API e pela página da conta — os
 * dois leem o mesmo registro, pelo mesmo caminho.
 *
 * Devolve `null` sem `CLERK_SECRET_KEY`: quem chama decide o que dizer, e o
 * site publica antes de a chave existir.
 */
export function clerkStore(): EntitlementStore | null {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  const clerk = createClerkClient({ secretKey });

  return {
    verify: async (token) => {
      try {
        const payload = await verifyToken(token, { secretKey });
        return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
      } catch {
        return null;
      }
    },
    read: async (userId) => {
      const user = await clerk.users.getUser(userId);
      return (user.privateMetadata as Record<string, unknown> | undefined)?.[METADATA_KEY];
    },
    write: async (userId, stored) => {
      await clerk.users.updateUserMetadata(userId, { privateMetadata: { [METADATA_KEY]: stored } });
    },
  };
}
