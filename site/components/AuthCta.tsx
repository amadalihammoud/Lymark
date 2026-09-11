'use client';

import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';

import { Link } from '../i18n/navigation';

/**
 * Os botões de conta do hero — em MODAL, sem sair da página.
 *
 * O formulário do Clerk abre por cima da landing: quem clica não perde o
 * lugar, e ao concluir vai à versão web em `/mesa` (`forceRedirectUrl`). As
 * páginas `/entrar` e `/cadastrar` continuam existindo — link direto, desktop
 * e quem navega sem JavaScript; o modal é o atalho, não o substituto.
 *
 * Com sessão, os dois botões viram um só: ninguém cria conta já logado.
 */
export default function AuthCta({
  signUp,
  signIn,
  account,
}: {
  signUp: string;
  signIn: string;
  account: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Link href="/conta">{account}</Link>;
  }

  // Depois do login no modal, a versão web canônica no mesmo domínio.
  const appWeb = '/mesa';

  return (
    <>
      <SignUpButton mode="modal" forceRedirectUrl={appWeb} signInForceRedirectUrl={appWeb}>
        <button type="button">{signUp}</button>
      </SignUpButton>
      <SignInButton mode="modal" forceRedirectUrl={appWeb} signUpForceRedirectUrl={appWeb}>
        <button type="button" className="ghost">
          {signIn}
        </button>
      </SignInButton>
    </>
  );
}
