import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import type { ReactNode } from 'react';

import { CLERK_PUBLISHABLE_KEY, isAuthConfigured } from './config';

/**
 * O provider de identidade — quando há identidade a prover.
 *
 * Sem chave, devolve os filhos como estão: os hooks do Clerk não podem ser
 * chamados nesse caso, e é por isso que toda tela que os usa se esconde
 * atrás de `isAuthConfigured` **antes** de montar o componente que os chama.
 * A regra dos hooks proíbe o condicional dentro; o condicional fica na
 * árvore.
 *
 * O `tokenCache` guarda a sessão no SecureStore do aparelho — é o que faz o
 * login sobreviver ao fechamento do app. Na web o Clerk usa o próprio
 * armazenamento do navegador e o cache é ignorado.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
