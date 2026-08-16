import { SignOutButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../i18n/locales';
import { readStored, resolveEntitlement } from '../../../../src/features/entitlements/server';
import { clerkStore } from '../../../lib/clerk-store';
import { Link, redirect } from '../../../i18n/navigation';

/**
 * A conta: quem sou, que plano tenho, quanto sobra.
 *
 * É a única página do site que exige sessão — as outras são públicas por
 * definição. Sem sessão, vai para `/entrar`, e volta para cá depois.
 *
 * O plano é lido pelo MESMO caminho da API (`clerkStore` → `resolveEntitlement`),
 * e não por uma segunda consulta ao Clerk: se a conta dissesse uma coisa e o
 * aplicativo outra, a pessoa não teria como saber em qual acreditar.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.account' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect({ href: '/entrar', locale: locale as Locale });

  const t = await getTranslations('site.account');
  const user = await currentUser();
  const store = clerkStore();

  // Sem chave secreta o site publica, mas não sabe ler o plano — diz isso, em
  // vez de inventar um.
  const entitlement = store
    ? resolveEntitlement({ stored: readStored(await store.read(userId!)), spent: 0, now: new Date() })
        .entitlement
    : null;

  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <section className="account-shell account-page">
      <h1>{t('title')}</h1>
      <p className="account-email">{email}</p>

      <dl className="account-plan">
        <dt>{t('plan')}</dt>
        <dd>{entitlement ? t(`plans.${entitlement.plan}`) : t('planUnavailable')}</dd>

        {entitlement && entitlement.quota !== null ? (
          <>
            <dt>{t('photos')}</dt>
            <dd>
              {t('photosLeft', {
                remaining: Math.max(0, entitlement.quota - entitlement.used),
                quota: entitlement.quota,
              })}
            </dd>
          </>
        ) : null}
      </dl>

      {/*
        Assinar ainda não existe. Dizer isso é melhor que esconder a seção: a
        pessoa que chegou aqui procurando o botão sabe que ele vem, e não fica
        procurando por onde ele estaria.
      */}
      <p className="account-note">{t('subscribeSoon')}</p>

      <p className="account-actions">
        <Link href="/">{t('backHome')}</Link>
        <SignOutButton>
          <button type="button" className="account-signout">
            {t('signOut')}
          </button>
        </SignOutButton>
      </p>
    </section>
  );
}
