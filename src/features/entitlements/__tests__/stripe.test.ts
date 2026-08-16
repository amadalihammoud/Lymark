import { createHmac } from 'node:crypto';

// A regra vive no site, e este é o único teste que a alcança — a mesma
// exceção, pelo mesmo motivo, de `handler.test.ts` logo ao lado.
// eslint-disable-next-line no-restricted-imports
import {
  RENEWAL_GRACE_DAYS,
  SIGNATURE_TOLERANCE_SECONDS,
  handleStripeEvent,
  verifyStripeSignature,
  type StripeConfig,
} from '../../../../site/lib/stripe';
// eslint-disable-next-line no-restricted-imports
import type { EntitlementStore } from '../../../../site/lib/entitlements';

const SECRET = 'whsec_teste';
const NOW = new Date('2026-08-16T12:00:00Z');

function signedHeader(payload: string, at: Date = NOW, secret: string = SECRET): string {
  const timestamp = Math.floor(at.getTime() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('assinatura do webhook', () => {
  it('aceita o que o Stripe assinou agora', () => {
    const payload = '{"id":"evt_1"}';
    expect(verifyStripeSignature(payload, signedHeader(payload), SECRET, NOW)).toBe(true);
  });

  it('recusa corpo trocado, segredo errado e cabeçalho ausente', () => {
    const payload = '{"id":"evt_1"}';
    expect(verifyStripeSignature('{"id":"evt_2"}', signedHeader(payload), SECRET, NOW)).toBe(false);
    expect(
      verifyStripeSignature(payload, signedHeader(payload, NOW, 'outro'), SECRET, NOW),
    ).toBe(false);
    expect(verifyStripeSignature(payload, null, SECRET, NOW)).toBe(false);
  });

  it('recusa replay: assinatura velha demais não vale', () => {
    const payload = '{"id":"evt_1"}';
    const stale = new Date(NOW.getTime() - (SIGNATURE_TOLERANCE_SECONDS + 1) * 1000);
    expect(verifyStripeSignature(payload, signedHeader(payload, stale), SECRET, NOW)).toBe(false);
  });
});

describe('tratamento do evento', () => {
  const config: StripeConfig = { secretKey: 'sk_teste', webhookSecret: SECRET, priceId: 'price_1' };

  function memoryStore(initial: Record<string, unknown> = {}) {
    const data: Record<string, unknown> = { ...initial };
    const store: EntitlementStore = {
      verify: async () => null,
      read: async (userId) => data[userId],
      write: async (userId, stored) => {
        data[userId] = stored;
      },
    };
    return { store, data };
  }

  const PERIOD_END_SECONDS = Math.floor(NOW.getTime() / 1000) + 30 * 24 * 60 * 60;

  function subscriptionFetch(subscription: unknown): typeof fetch {
    return (async () =>
      new Response(JSON.stringify(subscription), { status: 200 })) as unknown as typeof fetch;
  }

  it('grava paidUntil com a folga, preservando a contagem', async () => {
    const { store, data } = memoryStore({
      user_1: { plan: 'free', used: 7, paidUntil: null },
    });

    const result = await handleStripeEvent(
      { type: 'checkout.session.completed', data: { object: { subscription: 'sub_1' } } },
      config,
      store,
      subscriptionFetch({
        metadata: { userId: 'user_1' },
        current_period_end: PERIOD_END_SECONDS,
      }),
    );

    expect(result.outcome).toBe('updated');
    const written = data.user_1 as { plan: string; used: number; paidUntil: string };
    expect(written.plan).toBe('pro');
    expect(written.used).toBe(7);
    expect(Date.parse(written.paidUntil)).toBe(
      PERIOD_END_SECONDS * 1000 + RENEWAL_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it('lê o fim do período do item quando a assinatura não o traz', async () => {
    const { store, data } = memoryStore();

    const result = await handleStripeEvent(
      { type: 'invoice.paid', data: { object: { subscription: 'sub_1' } } },
      config,
      store,
      subscriptionFetch({
        metadata: { userId: 'user_1' },
        items: { data: [{ current_period_end: PERIOD_END_SECONDS }] },
      }),
    );

    expect(result.outcome).toBe('updated');
    expect((data.user_1 as { plan: string }).plan).toBe('pro');
  });

  it('ignora evento que não é de pagamento', async () => {
    const { store, data } = memoryStore();
    const result = await handleStripeEvent(
      { type: 'customer.updated', data: { object: {} } },
      config,
      store,
    );
    expect(result.outcome).toBe('ignored');
    expect(data).toEqual({});
  });

  it('acusa evento de pagamento sem assinatura, para o Stripe reapresentar', async () => {
    const { store } = memoryStore();
    const result = await handleStripeEvent(
      { type: 'invoice.paid', data: { object: {} } },
      config,
      store,
    );
    expect(result.outcome).toBe('invalid');
  });

  it('acusa assinatura sem userId — pagamento que não sabemos de quem é', async () => {
    const { store } = memoryStore();
    const result = await handleStripeEvent(
      { type: 'invoice.paid', data: { object: { subscription: 'sub_1' } } },
      config,
      store,
      subscriptionFetch({ metadata: {}, current_period_end: PERIOD_END_SECONDS }),
    );
    expect(result.outcome).toBe('invalid');
  });
});
