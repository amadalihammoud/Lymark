import { NextResponse } from 'next/server';

import { clerkStore } from '../../../lib/clerk-store';
import { handleEntitlements } from '../../../lib/entitlements';

/**
 * `GET|POST /api/entitlements` — o único endpoint da fase 2 até aqui.
 *
 * Mora no projeto `lymark` (este site) e não no `lymark-app`, porque o build
 * web do Expo é exportação estática, sem runtime de servidor.
 *
 * Fino de propósito: desmonta a requisição, monta o `store` com o Clerk e
 * entrega para `handleEntitlements`, que é onde a regra vive e onde os testes
 * batem. Sem `CLERK_SECRET_KEY` no ambiente responde 503 — assim o site
 * publica antes de a chave existir, e a falta dela é um erro dito, não um
 * `undefined` explodindo dentro do SDK.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  const store = clerkStore();
  if (!store) {
    return NextResponse.json({ error: 'autenticação não configurada' }, { status: 503 });
  }

  let body: unknown = undefined;
  if (request.method === 'POST') {
    try {
      body = await request.json();
    } catch {
      body = null;
    }
  }

  const result = await handleEntitlements(
    { method: request.method, authorization: request.headers.get('authorization'), body },
    store,
  );

  return NextResponse.json(result.body, {
    status: result.status,
    // O documento é pessoal e muda a cada sincronização: nenhum cache no meio
    // do caminho pode devolvê-lo a outro pedido.
    headers: { 'Cache-Control': 'no-store' },
  });
}

export { handle as GET, handle as POST };
