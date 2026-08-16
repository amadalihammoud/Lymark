import { createHmac, timingSafeEqual } from 'node:crypto';

import type { EntitlementStore } from './entitlements';
import { readStored } from '../../src/features/entitlements/server';

/**
 * Stripe — o dinheiro da web e do desktop (Fase 2, passo 3).
 *
 * O papel do Stripe aqui é pequeno de propósito: escrever `paidUntil`. Quem
 * decide o plano é `resolveEntitlement`, pela data — o webhook não "ativa"
 * nada, só registra até quando o pagamento confirmado vale. É a distinção do
 * §1 do `docs/ASSINATURA.md`: o Stripe sabe por onde o dinheiro entrou; a
 * fonte da verdade do acesso é nossa.
 *
 * Sem SDK de propósito. As duas conversas com o Stripe são um POST de
 * formulário (criar o checkout) e um GET (ler a assinatura) — `fetch` os
 * cobre, e a verificação de assinatura do webhook é HMAC-SHA256 em dez
 * linhas, testáveis sem rede. O SDK compraria tipos por um pacote inteiro.
 */

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  /** O preço da assinatura (price_…), criado no painel do Stripe. */
  priceId: string;
};

export function stripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !webhookSecret || !priceId) return null;
  return { secretKey, webhookSecret, priceId };
}

const API = 'https://api.stripe.com/v1';

/**
 * Cria a sessão de checkout e devolve a URL para onde mandar a pessoa.
 *
 * O `userId` do Clerk viaja em dois lugares: `client_reference_id` na sessão
 * e `metadata` da assinatura. O segundo é o que importa — é dele que o
 * webhook recupera a conta a cada renovação, não só na primeira compra.
 */
export async function createCheckoutSession(options: {
  config: StripeConfig;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const { config, userId, successUrl, cancelUrl, fetchImpl = fetch } = options;

  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': config.priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    'subscription_data[metadata][userId]': userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  const response = await fetchImpl(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!response.ok) return null;

  const body: unknown = await response.json();
  const url = (body as { url?: unknown } | null)?.url;
  return typeof url === 'string' ? url : null;
}

/** Quanto tempo uma assinatura de webhook vale depois de emitida. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Verifica o cabeçalho `Stripe-Signature` (`t=…,v1=…`).
 *
 * O esquema é HMAC-SHA256 de `${t}.${corpo}` com o segredo do webhook. A
 * tolerância de cinco minutos no `t` é o que barra o replay: um evento
 * capturado hoje não pode ser reapresentado amanhã.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  now: Date = new Date(),
): boolean {
  if (!header) return false;

  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key?.trim() === 't' && value) timestamp = value.trim();
    if (key?.trim() === 'v1' && value) signatures.push(value.trim());
  }
  if (!timestamp || signatures.length === 0) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt)) return false;
  if (Math.abs(now.getTime() / 1000 - issuedAt) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const expectedBuffer = Buffer.from(expected);

  return signatures.some((candidate) => {
    const received = Buffer.from(candidate);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  });
}

/**
 * Folga somada ao fim do período antes de o acesso pago cair.
 *
 * É a "borda da renovação" do §5: a cobrança da renovação pode atrasar horas
 * por retentativa de cartão, e sem folga a pessoa perderia o Pro na manhã do
 * vencimento com o pagamento a caminho. Três dias cobrem o ciclo de
 * retentativas do Stripe; se o pagamento falhar de vez, o acesso cai no fim
 * da folga — o custo são três dias de cortesia, nunca acesso eterno.
 */
export const RENEWAL_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Os eventos que importam: primeira compra e cada renovação paga. */
const RELEVANT_EVENTS = new Set(['checkout.session.completed', 'invoice.paid']);

/**
 * Trata um evento já verificado: descobre a assinatura, lê dela a conta e o
 * fim do período, e grava `paidUntil`.
 *
 * Sempre consulta a assinatura na API em vez de confiar no formato do
 * payload: o desenho dos eventos muda entre versões da API do Stripe, e o
 * `GET /subscriptions/{id}` é o único contrato estável com tudo que é
 * preciso — `current_period_end` e o `metadata.userId` posto no checkout.
 *
 * Devolve o que fez, para a rota logar e os testes afirmarem. `ignored` é a
 * resposta certa para evento irrelevante — o webhook recebe dezenas de tipos
 * e só dois dizem respeito ao acesso.
 */
export async function handleStripeEvent(
  event: unknown,
  config: StripeConfig,
  store: EntitlementStore,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { outcome: 'ignored' }
  | { outcome: 'invalid'; detail: string }
  | { outcome: 'updated'; userId: string; paidUntil: string }
> {
  if (typeof event !== 'object' || event === null) return { outcome: 'invalid', detail: 'evento não é objeto' };
  const { type, data } = event as { type?: unknown; data?: { object?: unknown } };

  if (typeof type !== 'string' || !RELEVANT_EVENTS.has(type)) return { outcome: 'ignored' };

  const object = (data?.object ?? null) as Record<string, unknown> | null;
  const subscriptionId = readSubscriptionId(object);
  if (!subscriptionId) return { outcome: 'invalid', detail: `evento ${type} sem assinatura` };

  const response = await fetchImpl(`${API}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${config.secretKey}` },
  });
  if (!response.ok) return { outcome: 'invalid', detail: `assinatura respondeu ${response.status}` };

  const subscription: unknown = await response.json();
  const parsed = readSubscription(subscription);
  if (!parsed) return { outcome: 'invalid', detail: 'assinatura fora do contrato' };

  const paidUntil = new Date(parsed.periodEndSeconds * 1000 + RENEWAL_GRACE_DAYS * DAY_MS).toISOString();

  // Preserva a contagem: o webhook só sabe do pagamento, e zerar `used` aqui
  // apagaria fotos já contabilizadas.
  const stored = readStored(await store.read(parsed.userId));
  await store.write(parsed.userId, { ...stored, plan: 'pro', paidUntil });

  return { outcome: 'updated', userId: parsed.userId, paidUntil };
}

function readSubscriptionId(object: Record<string, unknown> | null): string | null {
  if (!object) return null;
  const direct = object.subscription;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  // `invoice.paid` nas versões novas da API aninha em `parent`.
  const parent = object.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  const nested = parent?.subscription_details?.subscription;
  return typeof nested === 'string' && nested.length > 0 ? nested : null;
}

function readSubscription(raw: unknown): { userId: string; periodEndSeconds: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as {
    metadata?: { userId?: unknown };
    current_period_end?: unknown;
    items?: { data?: Array<{ current_period_end?: unknown }> };
  };

  const userId = value.metadata?.userId;
  if (typeof userId !== 'string' || userId.length === 0) return null;

  // O fim do período mudou de endereço entre versões da API: era da
  // assinatura, passou a ser do item. Aceitar os dois é o que mantém o
  // webhook de pé numa migração de versão.
  const candidates = [value.current_period_end, value.items?.data?.[0]?.current_period_end];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return { userId, periodEndSeconds: candidate };
    }
  }
  return null;
}
