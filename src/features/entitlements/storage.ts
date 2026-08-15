import { StorageKeys, readJson, remove, writeJson } from '@/lib/storage';

import { parseLease } from './lease-format';
import type { LocalLease } from './types';

/**
 * O lote de créditos, no disco.
 *
 * Só a entrada e a saída moram aqui; a validação do formato é regra pura e
 * fica em `lease-format.ts`.
 */

export async function readLease(): Promise<LocalLease | null> {
  const result = await readJson<unknown>(StorageKeys.entitlement);

  // `failed` e `empty` levam ao mesmo lugar: sem lote, `evaluateAccess`
  // trata como "nunca sincronizou" e libera o plano grátis inteiro. O erro
  // cai para o lado de quem está em campo.
  if (result.status !== 'found') return null;

  return parseLease(result.value);
}

export async function writeLease(lease: LocalLease): Promise<void> {
  await writeJson(StorageKeys.entitlement, lease);
}

/**
 * Apaga o lote.
 *
 * Chamado no logout: o direito de acesso é de quem estava logado, e deixá-lo
 * no disco daria acesso pago ao próximo que abrisse o aplicativo naquele
 * aparelho.
 */
export async function clearLease(): Promise<void> {
  await remove(StorageKeys.entitlement);
}
