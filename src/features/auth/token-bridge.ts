/**
 * O token da sessão, alcançável de fora da árvore do React.
 *
 * O selo de autenticidade precisa do token na hora da exportação — que
 * acontece dentro de funções, não de componentes, e em três plataformas com
 * fontes de token diferentes (Clerk no celular e na web, deep link no
 * desktop). Em vez de cada tela fazer ginástica de hooks condicionais, as
 * pontes de sincronização — que JÁ vivem no lugar certo da árvore e já têm
 * o token em mãos — registram aqui um fornecedor.
 *
 * Sem sessão, o fornecedor devolve `null` e o selo simplesmente não é
 * emitido: a exportação nunca depende disto.
 */

type TokenSupplier = () => Promise<string | null>;

let supplier: TokenSupplier | null = null;

export function setTokenSupplier(next: TokenSupplier | null) {
  supplier = next;
}

export async function getSessionToken(): Promise<string | null> {
  if (!supplier) return null;
  try {
    return await supplier();
  } catch {
    return null;
  }
}
