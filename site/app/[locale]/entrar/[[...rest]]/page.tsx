import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../../i18n/locales';
import { getPathname } from '../../../../i18n/navigation';

/**
 * Entrar. O componente do Clerk faz o trabalho — e-mail com código, Google,
 * Apple — no idioma da página; a rota é \`[[...rest]]\` porque o fluxo tem
 * passos internos (\`/entrar/factor-one\`, por exemplo) que ele mesmo navega.
 *
 * Não indexar: uma tela de login nos resultados de busca só confunde quem
 * procura o produto.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.account' });
  return { title: t('signInTitle'), robots: { index: false, follow: false } };
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="account-shell">
      <SignIn
        path={getPathname({ href: '/entrar', locale: locale as Locale })}
        signUpUrl={getPathname({ href: '/cadastrar', locale: locale as Locale })}
      />
    </section>
  );
}
