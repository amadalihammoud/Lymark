import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../../i18n/locales';
import { Link, redirect } from '../../../../i18n/navigation';

/**
 * A exclusão de conta — a URL pública que as lojas e a LGPD exigem (§8.6).
 *
 * Uma página inteira, e não um botão na conta, por dois motivos: o aviso do
 * que sai na hora e do que fica retido precisa ser lido antes do clique
 * (§8.5), e as lojas pedem um endereço público que leve à exclusão — este é
 * `lymark.app/conta/excluir`, alcançável do aplicativo e de fora dele.
 *
 * O botão é um formulário POST sem JavaScript, como o resto da conta.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.deleteAccount' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function DeleteAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('site.deleteAccount');

  const { userId } = await auth();
  if (!userId) redirect({ href: '/entrar', locale: locale as Locale });

  return (
    <section className="account-shell account-page">
      <h1>{t('title')}</h1>

      <p className="account-note">{t('deletesNow')}</p>
      <p className="account-note">{t('retained')}</p>
      <p className="account-note">{t('irreversible')}</p>

      <form method="post" action="/api/delete-account" className="account-actions">
        <button type="submit" className="account-signout account-delete">
          {t('confirm')}
        </button>
        <Link href="/conta">{t('back')}</Link>
      </form>
    </section>
  );
}
