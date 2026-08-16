import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../../i18n/locales';
import { clerkStore } from '../../../../lib/clerk-store';
import { mintDesktopToken } from '../../../../lib/desktop-token';
import { Link, redirect } from '../../../../i18n/navigation';

/**
 * A ponte do desktop: onde o login do navegador vira sessão no Electron.
 *
 * O aplicativo de computador abre ESTA página no navegador do sistema — é lá
 * que o Clerk funciona inteiro. Com a sessão feita, o servidor emite o token
 * do desktop (`desktop-token.ts`) e o botão abaixo o devolve ao aplicativo
 * pelo deep link `lymark://login#token=…`.
 *
 * O token vai no fragmento (`#`), não na query: fragmento não sai do
 * navegador — não entra em log de servidor, não vai em `Referer` — e o
 * registro do protocolo `lymark://` entrega a URL inteira ao Electron.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.desktop' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function DesktopHandoffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('site.desktop');

  const secret = process.env.DESKTOP_TOKEN_SECRET;
  if (!clerkStore() || !secret) {
    return (
      <section className="account-shell account-page">
        <h1>{t('title')}</h1>
        <p className="account-note">{t('unavailable')}</p>
      </section>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect({ href: '/entrar', locale: locale as Locale });

  const token = mintDesktopToken(userId!, secret);

  return (
    <section className="account-shell account-page">
      <h1>{t('title')}</h1>
      <p className="account-note">{t('explanation')}</p>

      <p className="cta account-open-app">
        <a href={`lymark://login#token=${token}`}>{t('open')}</a>
      </p>

      <p className="account-actions">
        <Link href="/conta">{t('backAccount')}</Link>
      </p>
    </section>
  );
}
