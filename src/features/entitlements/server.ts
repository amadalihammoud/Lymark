import type { Entitlement, Plan } from './types';

/**
 * A regra do servidor de `GET /api/entitlements`, em funções puras.
 *
 * Fica ao lado das regras do aparelho (`access.ts`) e importa os mesmos tipos,
 * para que exista uma definição só do contrato. O site importa daqui; nada
 * neste arquivo sabe de Clerk, HTTP ou banco — quem lê e grava o registro é a
 * rota, e o que ela grava é o que este módulo devolve.
 *
 * O desenho está em `docs/ASSINATURA.md` §4–6. Duas decisões que mudaram
 * depois de escrito o documento e valem aqui:
 *
 * - **A cota grátis é vitalícia por conta, não mensal.** Doze fotos para
 *   experimentar; depois, assinatura. Sem período, `periodEnd` vai `null`.
 * - **A conta é obrigatória desde a primeira abertura.** É a conta que faz a
 *   cota valer: sem ela, o contador seria do aparelho, e aparelho se limpa.
 */

/** Fotos que uma conta grátis exporta antes de precisar assinar. */
export const FREE_LIFETIME_QUOTA = 12;

/**
 * Por quantos dias o aparelho pode confiar no documento sem falar conosco.
 *
 * É o `validUntil` — o primeiro dos três relógios. Trinta dias porque a
 * renovação da assinatura é mensal: um documento mais longo que o ciclo de
 * cobrança prometeria acesso pago depois de o pagamento ter falhado.
 */
export const LEASE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * O que fica gravado por usuário — hoje em `privateMetadata` do Clerk, sob a
 * chave `entitlement`; amanhã, numa linha de banco. O contrato com o app não
 * sabe onde isto mora.
 *
 * `paidUntil` é escrito pelos webhooks de pagamento (Stripe, RevenueCat) e
 * lido aqui. Enquanto não há pagamento, é `null` — e o plano é grátis por
 * definição, ainda que alguém grave `plan: 'pro'` à mão: o que decide é a
 * data, para que uma metadata esquecida não vire assinatura eterna.
 */
export type StoredEntitlement = {
  plan: Plan;
  /** Exportações contabilizadas na vida da conta. */
  used: number;
  /** Até quando a assinatura paga vale, em ISO 8601. `null` sem assinatura. */
  paidUntil: string | null;
};

export const EMPTY_STORED: StoredEntitlement = { plan: 'free', used: 0, paidUntil: null };

/**
 * Lê o que estiver gravado sem confiar no formato.
 *
 * Metadata é JSON livre: pode faltar, estar pela metade ou trazer lixo de
 * uma versão antiga. Cada campo é validado por si; o que não serve cai no
 * padrão, e o padrão é sempre o lado seguro — plano grátis, contagem zero.
 * Zerar a contagem em caso de dado corrompido erra a favor da pessoa, o que
 * é o erro barato.
 */
export function readStored(raw: unknown): StoredEntitlement {
  if (typeof raw !== 'object' || raw === null) return EMPTY_STORED;
  const value = raw as Record<string, unknown>;

  const used =
    typeof value.used === 'number' && Number.isInteger(value.used) && value.used >= 0
      ? value.used
      : 0;

  const paidUntil =
    typeof value.paidUntil === 'string' && !Number.isNaN(Date.parse(value.paidUntil))
      ? value.paidUntil
      : null;

  const plan: Plan = value.plan === 'pro' ? 'pro' : 'free';

  return { plan, used, paidUntil };
}

/**
 * Resolve o documento a devolver e o registro a gravar.
 *
 * `spent` é o que o aparelho gastou offline desde a última sincronização e
 * está subindo agora. Entra na contagem **antes** de o documento ser emitido,
 * porque `applyServerResponse` no aparelho zera o `spentOffline` ao receber a
 * resposta — se a resposta não incluísse essas fotos, elas sumiriam da conta.
 *
 * A contagem nunca é recusada, mesmo passando da cota: a foto já foi tirada
 * num telhado sem sinal, e "honramos as fotos" é regra do §4. O que acontece
 * é o saldo ficar em zero (ou negativo por dentro) e a próxima exportação ser
 * barrada pelo aparelho, que consulta `canExport` antes.
 */
export function resolveEntitlement(input: {
  stored: StoredEntitlement;
  spent: number;
  now: Date;
}): { entitlement: Entitlement; stored: StoredEntitlement; changed: boolean } {
  const { stored, now } = input;
  const spent = Number.isInteger(input.spent) && input.spent > 0 ? input.spent : 0;

  const paidUntilMs = stored.paidUntil ? Date.parse(stored.paidUntil) : NaN;
  const isPro = !Number.isNaN(paidUntilMs) && paidUntilMs > now.getTime();

  const nextStored: StoredEntitlement = {
    plan: isPro ? 'pro' : 'free',
    // A contagem sobe também no plano pago: quando a assinatura acabar, a
    // pessoa volta ao grátis com o histórico verdadeiro — e não com doze fotos
    // novas por ter passado uma temporada pagando.
    used: stored.used + spent,
    paidUntil: stored.paidUntil,
  };

  const issuedAt = now.toISOString();
  const leaseEnd = now.getTime() + LEASE_DAYS * DAY_MS;

  const entitlement: Entitlement = isPro
    ? {
        plan: 'pro',
        quota: null,
        used: nextStored.used,
        periodEnd: stored.paidUntil,
        // Nunca além do pagamento confirmado: é o teto que impede o
        // documento de prometer mais do que a cobrança garantiu.
        validUntil: new Date(Math.min(leaseEnd, paidUntilMs)).toISOString(),
        issuedAt,
      }
    : {
        plan: 'free',
        quota: FREE_LIFETIME_QUOTA,
        used: nextStored.used,
        periodEnd: null,
        validUntil: new Date(leaseEnd).toISOString(),
        issuedAt,
      };

  const changed =
    nextStored.plan !== stored.plan ||
    nextStored.used !== stored.used ||
    nextStored.paidUntil !== stored.paidUntil;

  return { entitlement, stored: nextStored, changed };
}
