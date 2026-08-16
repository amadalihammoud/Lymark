import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import VerifyTool from '../../../components/VerifyTool';

/**
 * A verificação pública de autenticidade — `docs/AUTENTICIDADE.md`.
 *
 * Página estática nos doze idiomas; todo o trabalho acontece no navegador
 * de quem verifica (ver `VerifyTool`). É a URL que se manda para um cético:
 * "arraste a foto aqui e veja você mesmo".
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.verify' });
  return { title: t('title'), description: t('intro') };
}

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('site.verify');

  return (
    <section className="account-shell account-page">
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>
      <p className="account-note">{t('caveat')}</p>
      <VerifyTool />
    </section>
  );
}
