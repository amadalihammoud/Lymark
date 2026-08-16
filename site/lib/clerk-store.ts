import { createClerkClient, verifyToken } from '@clerk/backend';

import { verifyDesktopToken } from './desktop-token';
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
        if (typeof payload.sub === 'string' && payload.sub) return payload.sub;
      } catch {
        // Não é um token do Clerk — pode ser o do desktop, abaixo.
      }

      // O token do desktop (ver `desktop-token.ts`): emitido pelo site na
      // página `/conta/desktop`, entregue ao Electron por deep link. Só
      // existe como caminho quando o segredo está configurado.
      const desktopSecret = process.env.DESKTOP_TOKEN_SECRET;
      if (desktopSecret) return verifyDesktopToken(token, desktopSecret);

      return null;
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
