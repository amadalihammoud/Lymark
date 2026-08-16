'use client';

import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

import { Link, getPathname } from '../i18n/navigation';
import type { Locale } from '../../i18n/locales';

/**
 * Os botões de conta do hero — em MODAL, sem sair da página.
 *
 * O formulário do Clerk abre por cima da landing: quem clica não perde o
 * lugar, e ao concluir é levado à conta (`forceRedirectUrl`), de onde o
 * aplicativo abre. As páginas `/entrar` e `/cadastrar` continuam existindo —
 * são o destino de link direto, do fluxo do desktop e de quem navega sem
 * JavaScript; o modal é o atalho, não o substituto.
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
  const locale = useLocale() as Locale;
  const conta = getPathname({ href: '/conta', locale });

  if (isLoaded && isSignedIn) {
    return <Link href="/conta">{account}</Link>;
  }

  return (
    <>
      <SignUpButton mode="modal" forceRedirectUrl={conta} signInForceRedirectUrl={conta}>
        <button type="button">{signUp}</button>
      </SignUpButton>
      <SignInButton mode="modal" forceRedirectUrl={conta} signUpForceRedirectUrl={conta}>
        <button type="button" className="ghost">
          {signIn}
        </button>
      </SignInButton>
    </>
  );
}
