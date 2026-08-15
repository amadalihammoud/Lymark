import { parseEntitlement } from './api';
import type { LocalLease } from './types';

/**
 * A reconstrução do lote a partir do que veio do disco.
 *
 * Fica separado de `storage.ts` pela mesma razão que `preferences.ts` fica
 * separado do contexto de configurações: é regra pura, e mantê-la aqui evita
 * que quem só precisa validar um formato acabe carregando o AsyncStorage
 * junto — inclusive nos testes, onde o módulo nativo não existe.
 *
 * A validação é literal porque o disco guarda o que uma versão anterior do
 * aplicativo escreveu. Formato que mudou, gravação interrompida e arquivo
 * adulterado chegam todos por aqui, e nenhum deles pode virar saldo
 * inventado: `evaluateAccess` decidiria sobre dados que ninguém produziu.
 */
export function parseLease(stored: unknown): LocalLease | null {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return null;

  const raw = stored as Record<string, unknown>;

  const entitlement = parseEntitlement(raw.entitlement);
  if (!entitlement) return null;

  // Um contador negativo ou fracionário devolveria saldo inventado. Zero é o
  // único valor seguro para substituí-lo, e erra a favor do usuário: ele
  // recupera as fotos, em vez de perdê-las por um arquivo corrompido.
  const spentOffline =
    typeof raw.spentOffline === 'number' &&
    Number.isInteger(raw.spentOffline) &&
    raw.spentOffline >= 0
      ? raw.spentOffline
      : 0;

  // Sem um horário de servidor legível, a proteção contra relógio adulterado
  // fica sem referência. Cair para o `issuedAt` do próprio documento é o mais
  // conservador que se faz sem inventar data.
  const seen =
    typeof raw.serverTimeSeen === 'string' && !Number.isNaN(Date.parse(raw.serverTimeSeen))
      ? raw.serverTimeSeen
      : entitlement.issuedAt;

  return { entitlement, spentOffline, serverTimeSeen: seen };
}
