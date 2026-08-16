import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { clerkStore } from '../../../lib/clerk-store';
import { createCheckoutSession, stripeConfig } from '../../../lib/stripe';

/**
 * `GET /api/checkout` — leva a pessoa ao pagamento.
 *
 * GET com redirect de propósito: o botão "Assinar" da conta vira um link
 * simples, sem JavaScript — o navegador chega aqui, a sessão de checkout
 * nasce no Stripe e um 303 manda a pessoa para lá. Criar a sessão é
 * idempotente do nosso lado (nada é gravado), então o GET não mente.
 *
 * Volta para `/conta` nos dois desfechos: é lá que o plano aparece — e o
 * webhook, não o retorno do navegador, é quem grava o pagamento.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCOUNT_URL = 'https://lymark.app/conta';

export async function GET() {
  const config = stripeConfig();
  if (!config || !clerkStore()) {
    return NextResponse.json({ error: 'pagamento não configurado' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect('https://lymark.app/entrar', { status: 303 });
  }

  const url = await createCheckoutSession({
    config,
    userId,
    successUrl: ACCOUNT_URL,
    cancelUrl: ACCOUNT_URL,
  });
  if (!url) {
    return NextResponse.json({ error: 'falha ao criar o checkout' }, { status: 502 });
  }

  return NextResponse.redirect(url, { status: 303 });
}
