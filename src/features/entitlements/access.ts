import { PLANS, type AccessReason, type AccessState, type LocalLease } from './types';

/**
 * A decisão de acesso, em funções puras.
 *
 * Todo o resto da assinatura — Clerk, Stripe, lojas, webhooks — é encanamento
 * que muda de fornecedor. Isto aqui é a regra do produto, e é a parte que não
 * pode errar: ela decide se alguém em cima de um telhado consegue carimbar a
 * foto que veio fazer.
 *
 * Nada aqui lê relógio, disco ou rede. O agora entra por parâmetro, o que
 * torna cada borda de data testável sem esperar quinze dias.
 *
 * O desenho e a justificativa de cada regra estão em `docs/ASSINATURA.md`.
 */

/**
 * Quantos dias o app aceita um documento vencido quando não consegue falar
 * com o servidor.
 *
 * Duas semanas cobrem a borda que realmente acontece: a renovação cai no meio
 * de um período sem sinal, e o aparelho não tem como saber que ela passou.
 */
export const OFFLINE_TOLERANCE_DAYS = 14;

/**
 * A cota do plano grátis, quando o servidor ainda não respondeu uma vez.
 *
 * O valor de verdade é o do servidor (`FREE_LIFETIME_QUOTA`, em `server.ts`);
 * este vale até a primeira sincronização, e coincide de propósito. É vitalícia
 * por conta — doze fotos para experimentar —, não mensal.
 */
export const FREE_QUOTA = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * A decisão completa, a partir do que está gravado no aparelho e do agora.
 *
 * `canExport` é `true` em quase todos os caminhos, e isso é intencional. O
 * único caso que bloqueia é a cota do plano grátis esgotada — porque aí o
 * limite é o produto funcionando como prometido, não uma falha. Documento
 * vencido, tolerância estourada e relógio adulterado **rebaixam** para o
 * plano grátis; nenhum deles tranca a pessoa do lado de fora.
 */
export function evaluateAccess(lease: LocalLease | null, now: number): AccessState {
  // Sem documento nenhum: primeira execução, ou disco que falhou. Vale o
  // plano grátis inteiro. Errar a favor de quem está em campo é barato; o
  // servidor corrige na primeira sincronização.
  if (!lease) {
    return {
      plan: 'free',
      reason: 'expired',
      quota: FREE_QUOTA,
      remaining: FREE_QUOTA,
      canExport: true,
      shouldWarn: false,
    };
  }

  const reason = classify(lease, now);
  const effectivePlan = reason === 'valid' || reason === 'tolerated' ? lease.entitlement.plan : 'free';

  if (effectivePlan === 'pro') {
    return {
      plan: 'pro',
      reason,
      quota: null,
      remaining: null,
      canExport: true,
      shouldWarn: reason !== 'valid',
    };
  }

  const quota = effectiveQuota(lease, effectivePlan);
  const remaining = remainingQuota(lease, effectivePlan);

  return {
    plan: 'free',
    reason,
    quota,
    remaining,
    canExport: remaining > 0,
    shouldWarn: reason === 'tolerated',
  };
}

/**
 * Em qual dos quatro estados o documento está.
 *
 * A ordem das verificações importa: o relógio adulterado é checado primeiro,
 * porque um aparelho com a data atrasada faria qualquer documento parecer
 * dentro da validade.
 */
function classify(lease: LocalLease, now: number): AccessReason {
  const seen = parse(lease.serverTimeSeen);
  const validUntil = parse(lease.entitlement.validUntil);

  // Data anterior ao último horário que o próprio servidor informou. Como o
  // tempo não anda para trás, ou o relógio foi mexido ou está errado —
  // e nos dois casos ele deixa de servir para decidir validade.
  if (seen !== null && now < seen) return 'clock-tampered';

  // Documento sem data legível é documento corrompido. Tratado como vencido,
  // e não como válido: o erro tem de cair para o lado do plano grátis.
  if (validUntil === null) return 'expired';

  if (now <= validUntil) return 'valid';

  const toleranceEnd = validUntil + OFFLINE_TOLERANCE_DAYS * DAY_MS;
  return now <= toleranceEnd ? 'tolerated' : 'expired';
}

/**
 * Quantas fotos ainda cabem no período.
 *
 * Soma o que o servidor já contabilizou com o que foi gasto offline e ainda
 * não subiu. Os dois vivem separados no armazenamento justamente para que
 * esta conta não os some duas vezes depois de uma reconciliação.
 */
function remainingQuota(lease: LocalLease, plan: 'free'): number {
  const ceiling = effectiveQuota(lease, plan);

  // `used` só vale quando o documento é do plano que está valendo. Um
  // documento `pro` rebaixado por vencimento não traz contagem de plano
  // grátis nenhuma, e herdar a dele daria um saldo inventado.
  const alreadyUsed = lease.entitlement.plan === plan ? lease.entitlement.used : 0;

  return Math.max(0, ceiling - alreadyUsed - lease.spentOffline);
}

/**
 * O teto que vale agora.
 *
 * Um documento de outro plano não traz teto de plano grátis nenhum — nesse
 * caso vale o padrão, e não o que estava escrito lá.
 */
function effectiveQuota(lease: LocalLease, plan: 'free'): number {
  if (lease.entitlement.plan !== plan) return FREE_QUOTA;
  return lease.entitlement.quota ?? FREE_QUOTA;
}

/**
 * Registra uma exportação carimbada.
 *
 * Devolve um lote novo — nada é mutado — e **não recusa** quando a cota já
 * acabou. Recusar é decisão da camada de cima, que consulta `canExport`
 * antes. Se algo passar mesmo assim, é melhor a foto existir e o contador
 * ficar devendo do que a pessoa perder o registro que veio fazer.
 */
export function recordExport(lease: LocalLease): LocalLease {
  return { ...lease, spentOffline: lease.spentOffline + 1 };
}

/**
 * Aplica o que o servidor respondeu.
 *
 * O `spentOffline` zera porque a resposta do servidor **já inclui** o que
 * subiu na mesma sincronização. Mantê-lo cobraria as mesmas fotos duas vezes.
 *
 * `serverTimeSeen` só anda para frente. Um relógio de servidor que voltasse
 * atrás — por troca de instância ou correção de NTP — não pode desarmar a
 * proteção contra adulteração no aparelho.
 */
export function applyServerResponse(previous: LocalLease | null, fresh: LocalLease['entitlement']): LocalLease {
  const previousSeen = previous ? (parse(previous.serverTimeSeen) ?? 0) : 0;
  const freshIssued = parse(fresh.issuedAt) ?? 0;

  return {
    entitlement: fresh,
    spentOffline: 0,
    serverTimeSeen: new Date(Math.max(previousSeen, freshIssued)).toISOString(),
  };
}

/** Verdadeiro para strings que são um plano conhecido. */
export function isPlan(value: unknown): value is (typeof PLANS)[number] {
  return typeof value === 'string' && (PLANS as readonly string[]).includes(value);
}
