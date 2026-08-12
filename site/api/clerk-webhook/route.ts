import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const headersList = headers();
    const svix_id = headersList.get('svix-id');
    const svix_timestamp = headersList.get('svix-timestamp');
    const svix_signature = headersList.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing Svix headers' },
        { status: 400 }
      );
    }

    const wh = new Webhook(webhookSecret);
    const verified = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid Svix signature' },
        { status: 401 }
      );
    }

    const event = payload as {
      type: string;
      data: {
        id: string;
        email_addresses?: Array<{ email_address: string }>;
        public_metadata?: Record<string, unknown>;
        private_metadata?: Record<string, unknown>;
      };
    };

    // Atualizar metadata do usuário com status de assinatura
    if (event.type === 'user.updated' || event.type === 'user.created') {
      console.log('[Clerk Webhook] User event:', event.type, event.data.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
