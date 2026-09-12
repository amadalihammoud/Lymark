import { useAuth } from '@clerk/expo';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { LoadFailure } from '@/components/ui/load-failure';

/**
 * Quanto tempo o Clerk tem para dizer `isLoaded` antes de a espera virar
 * falha na tela.
 *
 * Doze segundos é folga para uma rede de campo ruim (o SDK faz duas
 * chamadas ao arrancar, `environment` e `client`) sem deixar o usuário
 * olhando o fundo azul por um minuto. Quem está em campo prefere saber
 * logo que "não deu" e tocar em tentar de novo.
 */
export const CLERK_LOAD_TIMEOUT_MS = 12_000;

/**
 * O vigia do arranque do Clerk.
 *
 * O portão (`gate.tsx`) renderiza nada enquanto `isLoaded` é falso — e está
 * certo: mostrar as telas e arrancá-las meio segundo depois pareceria o app
 * quebrando. Mas "nada" precisa ter prazo. Quando a API nativa do Clerk
 * estava desligada na instância de produção, o SDK recebia 400 em silêncio,
 * `isLoaded` nunca virava verdadeiro e o app ficava na cor da splash para
 * sempre, sem uma palavra. Este componente é o prazo: passado o limite sem
 * carregar, mostra a tela de falha com "tentar de novo".
 *
 * Tentar de novo remonta o `ClerkProvider` (é o `key` em `provider.tsx`),
 * que refaz as chamadas de arranque. Nada se perde na remontagem: até aqui o
 * portão não deixou tela nenhuma aparecer, então não há rascunho nem
 * navegação a preservar.
 *
 * Precisa viver **dentro** do `ClerkProvider` — `useAuth` lança sem ele — e
 * por isso é o provider quem o monta, e só quando há chave.
 */
export function ClerkLoadWatchdog({
  onRetry,
  children,
}: {
  onRetry: () => void;
  children: ReactNode;
}) {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Se carregou depois do prazo, o `isLoaded` manda: a falha some sozinha.
  if (!isLoaded && timedOut) return <LoadFailure onRetry={onRetry} />;

  return <>{children}</>;
}
