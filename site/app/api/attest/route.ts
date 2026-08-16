import { NextResponse } from 'next/server';

import { attestConfig, issueReceipt } from '../../../lib/attest';
import { clerkStore } from '../../../lib/clerk-store';

/**
 * `POST /api/attest` — emite o selo de autenticidade.
 *
 * Autentica pelo MESMO `verify` da API de entitlements: token de sessão do
 * Clerk ou token do desktop, indistintamente. O corpo é um hash e nada
 * mais; a resposta é o recibo e nada mais. Sem banco, sem efeito colateral
 * — o servidor assina e esquece (`docs/AUTENTICIDADE.md` §1).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** SHA-256 em base64url tem exatamente 43 caracteres. */
const HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  const config = attestConfig();
  const store = clerkStore();
  if (!config || !store) {
    return NextResponse.json({ error: 'selo não configurado' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  const token = /^Bearer\s+(.+)$/i.exec(authorization ?? '')?.[1];
  if (!token) return NextResponse.json({ error: 'sem token' }, { status: 401 });

  const userId = await store.verify(token);
  if (!userId) return NextResponse.json({ error: 'token inválido' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'corpo não é JSON' }, { status: 400 });
  }
  const hash = (body as { hash?: unknown } | null)?.hash;
  if (typeof hash !== 'string' || !HASH_PATTERN.test(hash)) {
    return NextResponse.json({ error: 'hash fora do contrato' }, { status: 400 });
  }

  const receipt = issueReceipt(config, { hash, userId, now: new Date() });
  return NextResponse.json({ receipt }, { headers: { 'Cache-Control': 'no-store' } });
}
