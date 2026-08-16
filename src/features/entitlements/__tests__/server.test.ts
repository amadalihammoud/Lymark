import { parseEntitlement } from '../api';
import {
  EMPTY_STORED,
  FREE_LIFETIME_QUOTA,
  LEASE_DAYS,
  readStored,
  resolveEntitlement,
} from '../server';

/**
 * A regra do servidor. Sem Clerk, sem HTTP: o registro entra e sai por valor,
 * e o agora é um parâmetro — cada borda de data se testa sem esperar um mês.
 */

const AGORA = new Date('2026-09-15T12:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;

describe('readStored', () => {
  it('sem nada gravado, começa do zero no plano grátis', () => {
    expect(readStored(undefined)).toEqual(EMPTY_STORED);
    expect(readStored(null)).toEqual(EMPTY_STORED);
    expect(readStored('lixo')).toEqual(EMPTY_STORED);
  });

  it('lê o que é válido e descarta o resto campo a campo', () => {
    expect(readStored({ plan: 'pro', used: 7, paidUntil: '2026-10-01T00:00:00.000Z' })).toEqual({
      plan: 'pro',
      used: 7,
      paidUntil: '2026-10-01T00:00:00.000Z',
    });

    // Contagem corrompida cai para zero — a favor da pessoa, que é o erro barato.
    expect(readStored({ used: -3 }).used).toBe(0);
    expect(readStored({ used: '9' }).used).toBe(0);
    expect(readStored({ used: 2.5 }).used).toBe(0);

    // Data ilegível é como se não houvesse assinatura.
    expect(readStored({ paidUntil: 'amanhã' }).paidUntil).toBeNull();

    // Plano desconhecido é grátis; só a data decide de verdade.
    expect(readStored({ plan: 'enterprise' }).plan).toBe('free');
  });
});

describe('plano grátis', () => {
  it('emite a cota vitalícia, sem período', () => {
    const { entitlement, stored, changed } = resolveEntitlement({
      stored: EMPTY_STORED,
      spent: 0,
      now: AGORA,
    });

    expect(entitlement).toEqual({
      plan: 'free',
      quota: FREE_LIFETIME_QUOTA,
      used: 0,
      periodEnd: null,
      validUntil: new Date(AGORA.getTime() + LEASE_DAYS * DIA).toISOString(),
      issuedAt: AGORA.toISOString(),
    });
    expect(stored).toEqual(EMPTY_STORED);
    expect(changed).toBe(false);
  });

  it('o que o aparelho gastou offline entra na contagem antes de emitir', () => {
    // `applyServerResponse` zera o `spentOffline` ao receber isto; se as fotos
    // não estivessem em `used`, sumiriam da conta.
    const { entitlement, stored, changed } = resolveEntitlement({
      stored: { ...EMPTY_STORED, used: 4 },
      spent: 3,
      now: AGORA,
    });

    expect(entitlement.used).toBe(7);
    expect(stored.used).toBe(7);
    expect(changed).toBe(true);
  });

  it('honra o que passou da cota em vez de recusar', () => {
    const { entitlement } = resolveEntitlement({
      stored: { ...EMPTY_STORED, used: 11 },
      spent: 5,
      now: AGORA,
    });

    // 16 gastas de 12: o aparelho vai calcular saldo zero e barrar a próxima.
    // Aqui nada é recusado — as fotos já existem.
    expect(entitlement.used).toBe(16);
  });

  it('ignora `spent` inválido', () => {
    for (const spent of [-1, 1.5, NaN, Infinity]) {
      const { stored } = resolveEntitlement({ stored: EMPTY_STORED, spent, now: AGORA });
      expect(stored.used).toBe(0);
    }
  });

  it('assinatura vencida é plano grátis, com o histórico verdadeiro', () => {
    const { entitlement, stored, changed } = resolveEntitlement({
      stored: { plan: 'pro', used: 40, paidUntil: '2026-09-01T00:00:00.000Z' },
      spent: 0,
      now: AGORA,
    });

    expect(entitlement.plan).toBe('free');
    expect(entitlement.quota).toBe(FREE_LIFETIME_QUOTA);
    // Quarenta usadas de doze: quem pagou uma temporada não ganha doze novas.
    expect(entitlement.used).toBe(40);
    expect(stored.plan).toBe('free');
    expect(changed).toBe(true);
  });

  it('`plan: pro` gravado sem data não vale como assinatura', () => {
    const { entitlement } = resolveEntitlement({
      stored: { plan: 'pro', used: 0, paidUntil: null },
      spent: 0,
      now: AGORA,
    });
    expect(entitlement.plan).toBe('free');
  });
});

describe('plano pago', () => {
  const pago = { plan: 'pro' as const, used: 3, paidUntil: '2026-12-31T00:00:00.000Z' };

  it('não tem teto, e o período é até onde a assinatura vale', () => {
    const { entitlement } = resolveEntitlement({ stored: pago, spent: 0, now: AGORA });

    expect(entitlement.plan).toBe('pro');
    expect(entitlement.quota).toBeNull();
    expect(entitlement.periodEnd).toBe(pago.paidUntil);
    expect(entitlement.validUntil).toBe(new Date(AGORA.getTime() + LEASE_DAYS * DIA).toISOString());
  });

  it('o documento nunca vale além do pagamento confirmado', () => {
    // Faltam 10 dias de assinatura; o lote de 30 é cortado nela.
    const pertoDoFim = { ...pago, paidUntil: new Date(AGORA.getTime() + 10 * DIA).toISOString() };
    const { entitlement } = resolveEntitlement({ stored: pertoDoFim, spent: 0, now: AGORA });

    expect(entitlement.validUntil).toBe(pertoDoFim.paidUntil);
  });

  it('a contagem continua subindo, para o rebaixamento futuro ser justo', () => {
    const { stored } = resolveEntitlement({ stored: pago, spent: 2, now: AGORA });
    expect(stored.used).toBe(5);
    expect(stored.plan).toBe('pro');
  });

  it('a metadata gravada como grátis vira paga assim que a data existir', () => {
    // O webhook grava `paidUntil`; o plano se corrige sozinho na leitura.
    const { stored, changed } = resolveEntitlement({
      stored: { plan: 'free', used: 3, paidUntil: pago.paidUntil },
      spent: 0,
      now: AGORA,
    });
    expect(stored.plan).toBe('pro');
    expect(changed).toBe(true);
  });
});

describe('contrato', () => {
  it('o que o servidor emite é exatamente o que o aparelho aceita', () => {
    // A ponta que serializa e a que valida têm de concordar; este teste é a
    // única coisa que impede as duas de divergirem em silêncio.
    for (const stored of [EMPTY_STORED, { plan: 'pro' as const, used: 1, paidUntil: '2026-12-31T00:00:00.000Z' }]) {
      const { entitlement } = resolveEntitlement({ stored, spent: 0, now: AGORA });
      const viaRede = JSON.parse(JSON.stringify(entitlement));
      expect(parseEntitlement(viaRede)).toEqual(entitlement);
    }
  });
});
