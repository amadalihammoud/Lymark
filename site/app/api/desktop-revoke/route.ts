import { createClerkClient } from '@clerk/backend';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { DESKTOP_REVOKED_KEY } from '../../../lib/clerk-store';

/**
 * `POST /api/desktop-revoke` — corta todos os tokens de desktop da conta.
 *
 * O token do deep link é assinado com HMAC e vale noventa dias. Isso o torna
 * cômodo (o aplicativo pode ficar semanas fechado) e, até aqui, IMORTAL: sair
 * do aplicativo apagava só a cópia local, e não havia nada que o servidor
 * pudesse recusar depois de emiti-lo.
 *
 * Isso importa porque, no Windows e no Linux, o sistema entrega o deep link
 * como ARGUMENTO do processo — o token fica legível em `/proc/<pid>/cmdline`
 * e na coluna de linha de comando do gerenciador de tarefas enquanto o app
 * roda. Numa estação compartilhada, quem passar por ali leva noventa dias de
 * acesso a `/api/attest`, emitindo selos com o `sub` da vítima.
 *
 * A revogação é uma data, não uma lista: grava-se o instante do corte, e todo
 * token emitido ANTES dele para de valer (ver `clerkStore`). Cortar vale para
 * TODOS os computadores da conta — é o que "desconectar" quer dizer quando não
 * se sabe qual deles vazou, e é o único comportamento seguro quando a pessoa
 * está cortando justamente por desconfiança.
 *
 * POST, como o `delete-account` ao lado, e pela mesma razão: por GET, um
 * prefetch de navegador deslogaria os computadores de quem só passou pela
 * página.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'autenticação não configurada' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect('https://lymark.app/entrar', { status: 303 });
  }

  await createClerkClient({ secretKey }).users.updateUserMetadata(userId, {
    privateMetadata: { [DESKTOP_REVOKED_KEY]: Date.now() },
  });

  return NextResponse.redirect('https://lymark.app/conta', { status: 303 });
}
