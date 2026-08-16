import { createClerkClient } from '@clerk/backend';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * `POST /api/delete-account` — a exclusão do §8.5/§8.6, acionável de verdade.
 *
 * Apagar o usuário no Clerk leva junto, de uma vez, tudo que prometemos
 * apagar na hora: e-mail, identificador e a `privateMetadata` onde moram
 * plano, cota e contador. Registro fiscal de transação vive no Stripe, sob
 * retenção própria — é o desenho da tabela do §8.5, não uma omissão.
 *
 * POST de propósito: exclusão por GET seria disparável por um prefetch de
 * navegador ou um crawler logado. O formulário de `/conta/excluir` é quem
 * chega aqui.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'autenticação não configurada' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect('https://lymark.app/entrar', { status: 303 });
  }

  await createClerkClient({ secretKey }).users.deleteUser(userId);

  // Para a home, sem sessão: a conta não existe mais, e a página inicial é o
  // único lugar que não pressupõe nada sobre quem chega.
  return NextResponse.redirect('https://lymark.app/', { status: 303 });
}
