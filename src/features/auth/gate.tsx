import { useAuth } from '@clerk/expo';
import type { ReactNode } from 'react';

import { getExecutionPlatform } from '@/lib/file-storage';

import { isAuthConfigured } from './config';
import { useDesktopAuth } from './desktop-auth';
import { DesktopSignIn, SignInFlow } from './sign-in-flow';

/**
 * O portão: a conta é obrigatória desde a primeira abertura.
 *
 * É a regra do §6 do `docs/ASSINATURA.md` — é a conta que faz a cota valer;
 * sem ela o contador seria do aparelho, e aparelho se limpa. Antes deste
 * portão, o botão da landing abria o app web direto e o login era opcional:
 * a cota inteira podia ser gasta sem conta nenhuma.
 *
 * Sem chave do Clerk (e, no desktop, sempre que o segredo do site faltar), o
 * portão fica aberto: é a degradação que permite desenvolver e testar sem
 * segredo nenhum — a mesma do site e da tela de conta.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (getExecutionPlatform() === 'desktop') return <DesktopGate>{children}</DesktopGate>;
  if (!isAuthConfigured) return <>{children}</>;
  return <ClerkGate>{children}</ClerkGate>;
}

function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Nada de app por baixo enquanto o Clerk decide: mostrar as telas e
  // arrancá-las meio segundo depois pareceria o app quebrando.
  if (!isLoaded) return null;

  return isSignedIn ? <>{children}</> : <SignInFlow />;
}

function DesktopGate({ children }: { children: ReactNode }) {
  const { token, hydrated } = useDesktopAuth();

  if (!hydrated) return null;

  return token ? <>{children}</> : <DesktopSignIn />;
}
