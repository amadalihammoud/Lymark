import { createClerkClient, verifyToken } from '@clerk/backend';

import { verifyDesktopToken } from './desktop-token';
import { METADATA_KEY, type EntitlementStore } from './entitlements';

/**
 * Onde mora a data de corte dos tokens do desktop, nos metadados privados do
 * Clerk — o mesmo lugar que já guarda o entitlement.
 *
 * Todo token emitido ANTES deste instante deixa de valer. É o que dá ao dono
 * da conta um jeito de cortar um token vazado: ele é assinado com HMAC e não
 * podia ser desfeito de outra forma.
 */
export const DESKTOP_REVOKED_KEY = 'desktopTokensValidAfter';

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
      if (!desktopSecret) return null;

      const claims = verifyDesktopToken(token, desktopSecret);
      if (!claims) return null;

      /*
       * A assinatura fecha, mas isso só diz que NÓS emitimos o token — não
       * que ele ainda vale. Faltavam as duas perguntas que exigem consultar
       * o Clerk, e sem elas o token de noventa dias era imortal:
       *
       * 1. A conta ainda existe? Sem isto, um token continuava emitindo
       *    selos Ed25519 com o `sub` de uma conta EXCLUÍDA — recibos que a
       *    página de verificação apresentava como material daquela pessoa.
       * 2. O dono cortou os tokens depois de este ter sido emitido?
       *
       * O custo é uma consulta ao Clerk por requisição do desktop. O caminho
       * do navegador não paga nada: ele sai antes, no `verifyToken` acima.
       */
      let user;
      try {
        user = await clerk.users.getUser(claims.sub);
      } catch {
        // Conta excluída, ou o Clerk fora do ar: nos dois casos, não
        // autenticamos. Recusar é o único lado seguro de errar aqui.
        return null;
      }
      if (!user) return null;

      const revokedAt = (user.privateMetadata as Record<string, unknown> | undefined)?.[
        DESKTOP_REVOKED_KEY
      ];
      if (typeof revokedAt === 'number' && claims.iat < revokedAt) return null;

      return claims.sub;
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
