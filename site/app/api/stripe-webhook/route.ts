import { NextResponse } from 'next/server';

import { clerkStore } from '../../../lib/clerk-store';
import { handleStripeEvent, stripeConfig, verifyStripeSignature } from '../../../lib/stripe';

/**
 * `POST /api/stripe-webhook` — onde o pagamento vira `paidUntil`.
 *
 * A assinatura é verificada sobre o corpo CRU, antes de qualquer parse: o
 * HMAC é do texto exato que o Stripe enviou, e um `request.json()` primeiro
 * inviabilizaria a conta.
 *
 * Sempre 200 depois de verificado, mesmo para evento ignorado: o Stripe
 * reapresenta tudo que não for 2xx, e reapresentar um evento que decidimos
 * ignorar só enche o log. Falha NOSSA (assinatura fora do contrato, Clerk
 * fora do ar) devolve 500 de propósito — aí a reapresentação é o que salva.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = stripeConfig();
  const store = clerkStore();
  if (!config || !store) {
    return NextResponse.json({ error: 'pagamento não configurado' }, { status: 503 });
  }

  const payload = await request.text();
  const signed = verifyStripeSignature(
    payload,
    request.headers.get('stripe-signature'),
    config.webhookSecret,
  );
  if (!signed) return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 });

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: 'corpo não é JSON' }, { status: 400 });
  }

  const result = await handleStripeEvent(event, config, store);

  if (result.outcome === 'invalid') {
    console.error('[stripe] evento não tratado:', result.detail);
    return NextResponse.json({ error: result.detail }, { status: 500 });
  }

  return NextResponse.json({ received: true, outcome: result.outcome });
}
