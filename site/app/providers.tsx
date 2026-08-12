'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';
import { NextIntlProvider } from 'next-intl';

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
      <NextIntlProvider locale={locale} messages={messages}>
        {children}
      </NextIntlProvider>
    </ClerkProvider>
  );
}