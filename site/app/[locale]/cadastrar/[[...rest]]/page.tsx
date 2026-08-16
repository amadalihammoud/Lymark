import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../../i18n/locales';
import { getPathname } from '../../../../i18n/navigation';

/** Cadastrar. O par de \`entrar/\`; ver o comentário de lá. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.account' });
  return { title: t('signUpTitle'), robots: { index: false, follow: false } };
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="account-shell">
      <SignUp
        path={getPathname({ href: '/cadastrar', locale: locale as Locale })}
        signInUrl={getPathname({ href: '/entrar', locale: locale as Locale })}
      />
    </section>
  );
}
