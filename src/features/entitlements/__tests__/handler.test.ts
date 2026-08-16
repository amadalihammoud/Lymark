// A regra da rota vive no site, e este é o único teste que a alcança — o site
// não tem harness próprio. Sem alias para `site/` no app de propósito: nada do
// aplicativo deve importar de lá fora deste teste.
// eslint-disable-next-line no-restricted-imports
import { handleEntitlements, type EntitlementStore } from '../../../../site/lib/entitlements';
import { parseEntitlement } from '../api';
import { FREE_LIFETIME_QUOTA, type StoredEntitlement } from '../server';

/**
 * A rota, sem Next e sem Clerk: o `store` é de mentira e guarda em memória.
 *
 * Mora no lado do aplicativo porque o contrato é do aplicativo — e porque é
 * aqui que o `jest` já roda. O `site/` não tem harness de teste próprio, e não
 * precisa: a rota do Next é fina de propósito e a regra está em `site/lib`.
 */

const AGORA = new Date('2026-09-15T12:00:00.000Z');

function memoria(seed: Record<string, unknown> = {}) {
  const dados = new Map<string, unknown>(Object.entries(seed));
  const escritas: StoredEntitlement[] = [];

  const store: EntitlementStore = {
    verify: async (token) => (token.startsWith('ok:') ? token.slice(3) : null),
    read: async (userId) => dados.get(userId),
    write: async (userId, stored) => {
      dados.set(userId, stored);
      escritas.push(stored);
    },
  };

  return { store, dados, escritas };
}

const chamada = (
  store: EntitlementStore,
  extra: Partial<{ method: string; authorization: string | null; body: unknown }> = {},
) =>
  handleEntitlements(
    { method: 'GET', authorization: 'Bearer ok:user_1', body: undefined, ...extra },
    store,
    () => AGORA,
  );

describe('autenticação', () => {
  it('sem cabeçalho é 401', async () => {
    const { store } = memoria();
    expect((await chamada(store, { authorization: null })).status).toBe(401);
    expect((await chamada(store, { authorization: 'Basic abc' })).status).toBe(401);
  });

  it('token que não vale é 401, e nada é lido nem gravado', async () => {
    const { store, escritas } = memoria();
    const lido = jest.spyOn(store, 'read');

    expect((await chamada(store, { authorization: 'Bearer nope' })).status).toBe(401);
    expect(lido).not.toHaveBeenCalled();
    expect(escritas).toEqual([]);
  });

  it('método fora de GET/POST é 405', async () => {
    const { store } = memoria();
    expect((await chamada(store, { method: 'DELETE' })).status).toBe(405);
  });
});

describe('GET', () => {
  it('conta nova recebe a cota vitalícia e não grava nada', async () => {
    const { store, escritas } = memoria();
    const r = await chamada(store);

    expect(r.status).toBe(200);
    expect(parseEntitlement(r.body)).toMatchObject({ plan: 'free', quota: FREE_LIFETIME_QUOTA, used: 0 });
    // Leitura pura: uma escrita aqui gastaria o limite do Clerk sem motivo.
    expect(escritas).toEqual([]);
  });

  it('devolve o que está gravado, no formato que o aparelho aceita', async () => {
    const { store } = memoria({
      user_1: { plan: 'pro', used: 30, paidUntil: '2026-12-31T00:00:00.000Z' },
    });
    const r = await chamada(store);

    expect(parseEntitlement(r.body)).toMatchObject({ plan: 'pro', quota: null, used: 30 });
  });

  it('corrige na leitura uma assinatura vencida, e grava a correção', async () => {
    const { store, escritas } = memoria({
      user_1: { plan: 'pro', used: 30, paidUntil: '2026-01-01T00:00:00.000Z' },
    });
    const r = await chamada(store);

    expect(parseEntitlement(r.body)?.plan).toBe('free');
    expect(escritas).toEqual([{ plan: 'free', used: 30, paidUntil: '2026-01-01T00:00:00.000Z' }]);
  });
});

describe('POST', () => {
  it('soma o gasto offline antes de emitir, e grava', async () => {
    const { store, escritas } = memoria({ user_1: { plan: 'free', used: 4, paidUntil: null } });
    const r = await chamada(store, { method: 'POST', body: { spent: 3 } });

    expect(parseEntitlement(r.body)?.used).toBe(7);
    expect(escritas).toEqual([{ plan: 'free', used: 7, paidUntil: null }]);
  });

  it('corpo malformado é 400 — nunca 200 com zero', async () => {
    // Um 200 aqui faria o aparelho zerar o `spentOffline` achando que as
    // fotos subiram. Elas não subiram.
    const { store, escritas } = memoria();
    for (const body of [null, undefined, {}, { spent: -1 }, { spent: 1.5 }, { spent: '3' }, 'x']) {
      expect((await chamada(store, { method: 'POST', body })).status).toBe(400);
    }
    expect(escritas).toEqual([]);
  });

  it('spent zero é aceito e equivale à leitura', async () => {
    const { store, escritas } = memoria();
    const r = await chamada(store, { method: 'POST', body: { spent: 0 } });
    expect(r.status).toBe(200);
    expect(escritas).toEqual([]);
  });

  it('o corpo do GET é ignorado — leitura não tem efeito colateral', async () => {
    const { store, escritas } = memoria();
    const r = await chamada(store, { method: 'GET', body: { spent: 5 } });
    expect(parseEntitlement(r.body)?.used).toBe(0);
    expect(escritas).toEqual([]);
  });
});
