'use client';

import { UserButton, useAuth } from '@clerk/nextjs';

import { Link } from '../i18n/navigation';

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

  if (!isLoaded || !isSignedIn) {
    return <Link href="/entrar">{signIn}</Link>;
  }

  return (
    <>
      <Link href="/conta">{account}</Link>
      <UserButton />
    </>
  );
}
