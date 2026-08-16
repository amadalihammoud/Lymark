/**
 * O direito de acesso de uma pessoa, e o lote de créditos que o acompanha.
 *
 * Estes tipos são o contrato entre o servidor e as três plataformas. Ficam
 * em `src/features` porque quem os consome é o aplicativo; o servidor
 * importa daqui para que exista uma definição só — a duplicação entre
 * cliente e API é a origem clássica da divergência silenciosa.
 *
 * O desenho está em `docs/ASSINATURA.md`.
 */

/** Nome do plano. Vem do servidor; o app nunca o deduz. */
export const PLANS = ['free', 'pro'] as const;

export type Plan = (typeof PLANS)[number];

/**
 * O que o servidor responde em `GET /api/entitlements`.
 *
 * Todas as datas são ISO 8601 em UTC, decididas pelo servidor. O relógio do
 * aparelho não participa de nenhuma delas — é o que impede que mudar a data
 * do celular renda cota infinita.
 */
export type Entitlement = {
  plan: Plan;
  /** Fotos concedidas. `null` no plano pago: não há teto. */
  quota: number | null;
  /** Quantas o servidor já contabilizou. */
  used: number;
  /**
   * Fim do período, em ISO 8601 — no plano pago, até quando a assinatura vale.
   *
   * `null` quando não há período: a cota grátis é vitalícia por conta, doze
   * fotos para experimentar e depois assinar. Não é mensal de propósito — uma
   * cota que renova todo mês é um produto grátis com limite, e o Lymark grátis
   * é uma amostra.
   */
  periodEnd: string | null;
  /**
   * Até quando o aparelho pode confiar neste documento sem falar com o
   * servidor. É o primeiro dos três relógios de `docs/ASSINATURA.md`.
   */
  validUntil: string;
  /** Momento em que o servidor emitiu — a referência de tempo confiável. */
  issuedAt: string;
};

/**
 * O que o aparelho guarda entre uma sincronização e outra.
 *
 * `spentOffline` é o que ainda não chegou ao servidor. Fica separado de
 * `entitlement.used` de propósito: misturar os dois faria a reconciliação
 * contar duas vezes as mesmas fotos.
 */
export type LocalLease = {
  entitlement: Entitlement;
  /** Exportações feitas desde a última sincronização bem-sucedida. */
  spentOffline: number;
  /**
   * O horário mais tarde já visto vindo do servidor.
   *
   * Guardado para recusar que o relógio ande para trás: sem isto, atrasar a
   * data do aparelho esticaria a tolerância offline indefinidamente.
   */
  serverTimeSeen: string;
};

/** Por que o app está em determinado estado — o que a interface explica. */
export type AccessReason =
  /** Documento dentro da validade. O caso normal. */
  | 'valid'
  /** Venceu, mas dentro da tolerância offline: segue valendo, com aviso. */
  | 'tolerated'
  /** Tolerância esgotada. Cai para o plano grátis, nunca para o bloqueio. */
  | 'expired'
  /** O relógio do aparelho está atrás do último horário visto do servidor. */
  | 'clock-tampered';

/** A decisão que a interface consome. */
export type AccessState = {
  plan: Plan;
  reason: AccessReason;
  /**
   * O teto do período. `null` quando não há.
   *
   * Vai junto com `remaining` porque a interface mostra a fração — "11/15" —
   * e deduzi-la somando o que foi gasto daria número errado assim que um
   * documento pago fosse rebaixado.
   */
  quota: number | null;
  /** `null` quando não há teto. */
  remaining: number | null;
  /** `true` quando a captura pode acontecer. Ver `evaluateAccess`. */
  canExport: boolean;
  /** `true` quando cabe mostrar "reconecte para confirmar a assinatura". */
  shouldWarn: boolean;
};
