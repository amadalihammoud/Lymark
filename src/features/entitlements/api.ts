import { isPlan } from './access';
import type { Entitlement } from './types';

/**
 * O cliente de `GET /api/entitlements`.
 *
 * Duas regras governam este arquivo, e as duas vêm do campo:
 *
 * **Nada aqui lança.** Uma exceção subindo para a tela de captura viraria
 * tela branca no meio de um serviço. Toda saída é um resultado descrito, e
 * quem chama decide o que fazer — normalmente, seguir com o que já tem.
 *
 * **Uma resposta estranha vale menos que nenhuma.** Rede em telhado devolve
 * portal de captura de Wi-Fi, HTML de erro de proxy e JSON truncado com
 * frequência maior que a intuição sugere. Aceitar qualquer um deles
 * substituiria um documento válido no aparelho por lixo — e é por isso que a
 * validação abaixo é literal em vez de confiar em `as Entitlement`.
 */

/** Quanto esperar antes de desistir. Ver `SYNC_TIMEOUT_MS`. */
export const SYNC_TIMEOUT_MS = 8000;

export type SyncResult =
  /** O servidor respondeu e a resposta é íntegra. */
  | { status: 'ok'; entitlement: Entitlement }
  /** Sem rede, tempo esgotado, ou o servidor não respondeu. */
  | { status: 'unreachable'; error: unknown }
  /**
   * O servidor respondeu, mas a resposta não serve — corpo inválido, ou
   * status de erro. Distinto de `unreachable` porque o certo é registrar:
   * um deles é a rede da pessoa, o outro é defeito nosso.
   */
  | { status: 'invalid'; detail: string }
  /** A sessão não vale mais. Quem chama precisa pedir login de novo. */
  | { status: 'unauthorized' };

/**
 * Valida o corpo campo a campo.
 *
 * Devolve `null` em vez de lançar, e não conserta nada pela metade: um
 * documento parcial guardado no aparelho seria pior que documento nenhum,
 * porque `evaluateAccess` passaria a decidir sobre dados inventados.
 */
export function parseEntitlement(body: unknown): Entitlement | null {
  if (typeof body !== 'object' || body === null) return null;

  const raw = body as Record<string, unknown>;

  if (!isPlan(raw.plan)) return null;

  // `quota` é `null` de propósito no plano pago — ausência de teto, e não
  // ausência de valor. `undefined` não serve.
  const quota = raw.quota;
  if (quota !== null && !isWholeNumber(quota)) return null;

  if (!isWholeNumber(raw.used)) return null;

  const periodEnd = asIsoDate(raw.periodEnd);
  const validUntil = asIsoDate(raw.validUntil);
  const issuedAt = asIsoDate(raw.issuedAt);
  if (!periodEnd || !validUntil || !issuedAt) return null;

  return { plan: raw.plan, quota, used: raw.used, periodEnd, validUntil, issuedAt };
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Aceita só o que o `Date` consegue ler. String vazia e `0` não passam. */
function asIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

/**
 * Busca o entitlement do usuário.
 *
 * `fetchImpl` e `timeoutMs` entram por parâmetro para os testes exercitarem
 * rede lenta, corpo truncado e sessão expirada sem servidor nenhum de pé.
 */
export async function fetchEntitlement(options: {
  endpoint: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<SyncResult> {
  const { endpoint, token, fetchImpl = fetch, timeoutMs = SYNC_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    // Inclui o tempo esgotado: para quem está em campo, rede que não
    // responde e rede que não existe dão no mesmo.
    return { status: 'unreachable', error };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) return { status: 'unauthorized' };

  // 5xx é problema nosso e passa. O aparelho segue com o que tem, e a
  // próxima sincronização tenta de novo — não é caso de derrubar a sessão.
  if (response.status >= 500) {
    return { status: 'unreachable', error: new Error(`servidor respondeu ${response.status}`) };
  }

  if (!response.ok) return { status: 'invalid', detail: `status ${response.status}` };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // Portal de Wi-Fi devolvendo HTML cai aqui, e é o caso mais comum.
    return { status: 'invalid', detail: 'corpo não é JSON' };
  }

  const entitlement = parseEntitlement(body);
  if (!entitlement) return { status: 'invalid', detail: 'corpo fora do contrato' };

  return { status: 'ok', entitlement };
}
