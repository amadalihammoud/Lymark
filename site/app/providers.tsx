'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';

export function Providers({ children, locale, messages }: { 
  children: React.ReactNode;
  locale: string;
  messages: any;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={ptBR}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}