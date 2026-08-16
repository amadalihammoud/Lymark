'use client';

import { Show, UserButton } from '@clerk/nextjs';

import { Link } from '../i18n/navigation';

/**
 * A conta no cabeçalho: link para entrar sem sessão, botão do Clerk com ela.
 *
 * Componente cliente de propósito. O `Show` do lado do servidor lê a sessão na
 * requisição e tornaria toda página dinâmica — e as doze versões da landing e
 * dos documentos legais são estáticas por decisão (ver `generateStaticParams`
 * no layout). Aqui a decisão é tomada no navegador, depois de a página estática
 * chegar; até lá, nada é mostrado, o que evita o link "Entrar" piscar para
 * quem já está dentro.
 */
export default function AccountNav({ signIn, account }: { signIn: string; account: string }) {
  return (
    <>
      <Show when="signed-out">
        <Link href="/entrar">{signIn}</Link>
      </Show>
      <Show when="signed-in">
        <Link href="/conta">{account}</Link>
        <UserButton />
      </Show>
    </>
  );
}
