import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { getExecutionPlatform } from '@/lib/file-storage';

import { CLERK_PUBLISHABLE_KEY, isAuthConfigured } from './config';
import { ClerkLoadWatchdog } from './load-watchdog';

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
 *
 * O `key` é o mecanismo de "tentar de novo" do vigia (`load-watchdog.tsx`):
 * trocá-lo desmonta e remonta o `ClerkProvider`, que refaz o arranque. No
 * desktop o vigia não entra: lá a identidade vem do token do deep link
 * (`desktop-auth.tsx`), e o Clerk não é quem decide se o app abre.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!isAuthConfigured) return <>{children}</>;

  const watched = getExecutionPlatform() !== 'desktop';

  return (
    <ClerkProvider key={attempt} publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      {watched ? <ClerkLoadWatchdog onRetry={retry}>{children}</ClerkLoadWatchdog> : children}
    </ClerkProvider>
  );
}
