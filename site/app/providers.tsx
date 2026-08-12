'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={ptBR}
    >
      {children}
    </ClerkProvider>
  );
}
