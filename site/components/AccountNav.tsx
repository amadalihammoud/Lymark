'use client';

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

import { Link, getPathname } from '../i18n/navigation';
import type { Locale } from '../../i18n/locales';

/**
 * A conta no cabeçalho: link para entrar sem sessão, botão do Clerk com ela.
 *
 * Componente cliente de propósito. Decidir no servidor tornaria toda página
 * dinâmica — e as doze versões da landing e dos documentos legais são
 * estáticas por decisão (ver `generateStaticParams` no layout).
 *
 * Enquanto o Clerk carrega, o link "Entrar" já aparece. A primeira versão
 * escondia tudo até a resposta, para o link não piscar para quem já está
 * dentro — e o efeito real era pior: numa rede lenta, o cabeçalho ficava
 * segundos sem botão nenhum, e parecia que entrar não era possível. Quem já
 * tem sessão e clica em "Entrar" é redirecionado à conta pelo próprio Clerk,
 * então o custo do link provisório é um clique inofensivo — o custo do
 * cabeçalho vazio era não achar a porta.
 */
export default function AccountNav({ signIn, account }: { signIn: string; account: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const locale = useLocale() as Locale;

  if (!isLoaded || !isSignedIn) {
    // Em MODAL, como no hero: entrar não deveria custar a página. A rota
    // `/entrar` continua existindo para link direto e para o desktop.
    return (
      <SignInButton mode="modal" forceRedirectUrl={getPathname({ href: '/conta', locale })}>
        <button type="button" className="nav-auth">
          {signIn}
        </button>
      </SignInButton>
    );
  }

  return (
    <>
      <Link href="/conta">{account}</Link>
      <UserButton />
    </>
  );
}
