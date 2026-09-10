import { NextResponse } from 'next/server';

/**
 * Chave publicável do Clerk para SPAs no mesmo domínio (`/mesa`).
 * Não é segredo — o bundle do site já a entrega no HTML.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '' },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
