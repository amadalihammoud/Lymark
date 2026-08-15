import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isRtl, type Locale } from '../../../i18n/locales';
import LanguageSelector from '../../components/LanguageSelector';
import { Link } from '../../i18n/navigation';
import { routing } from '../../i18n/routing';

import '../globals.css';

/*
 * As mesmas duas famílias que o aplicativo embarca: Barlow no texto e na
 * assinatura, Pathway Gothic One nos numerais. A segunda foi escolhida por
 * medição — proporção de 0,498 de largura e 0,318 de densidade de tinta —
 * e é ela que dá ao site a mesma voz tipográfica do carimbo.
 *
 * Os arquivos são servidos pelo próprio site, e não buscados no Google, por
 * três motivos: o build deixa de depender de rede — antes ele quebrava em
 * qualquer ambiente sem acesso a `fonts.googleapis.com`; o navegador de quem
 * visita para de fazer uma requisição ao Google, que sob a LGPD e o RGPD é
 * transferência de endereço IP a terceiro; e são exatamente os mesmos
 * arquivos que o aplicativo embarca, então o carimbo do site e o da foto não
 * podem divergir.
 */
const barlow = localFont({
  src: [
    { path: '../../fonts/Barlow_400Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../fonts/Barlow_500Medium.ttf', weight: '500', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-body',
});

const pathway = localFont({
  src: '../../fonts/PathwayGothicOne_400Regular.ttf',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-clock',
});

/** Gera as doze versões estáticas no build, em vez de sob demanda. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });

  return {
    title: {
      default: t('title'),
      template: `%s · Lymark`,
    },
    description: t('description'),
    applicationName: 'Lymark',
    openGraph: {
      title: 'Lymark',
      description: t('description'),
      locale,
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#0D2137',
  colorScheme: 'dark',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Sem isto, cada página do idioma vira renderização dinâmica e o build
  // estático das doze versões não acontece.
  setRequestLocale(locale);

  const t = await getTranslations('site');

  return (
    <html
      lang={locale}
      dir={isRtl(locale as Locale) ? 'rtl' : 'ltr'}
      className={`${barlow.variable} ${pathway.variable}`}
    >
      <body style={{ ['--font-mark' as string]: 'var(--font-body)' }}>
        <NextIntlClientProvider>
          <a className="skip" href="#conteudo">
            {t('skipToContent')}
          </a>

          <header className="site">
            <div className="shell">
              <Link href="/" className="wordmark" aria-label={t('nav.homeLabel')}>
                Ly<em>mark</em>
              </Link>
              <nav className="site" aria-label={t('nav.label')}>
                <Link href="/privacidade">{t('nav.privacy')}</Link>
                <Link href="/termos">{t('nav.terms')}</Link>
                <LanguageSelector />
              </nav>
            </div>
          </header>

          <main id="conteudo" className="shell">
            {children}
          </main>

          <footer className="site">
            <div className="shell">
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('footer.description')}</p>
                <p style={{ marginTop: '0.35rem' }}>
                  {t('footer.support')}{' '}
                  <a href="mailto:contato@lymark.app">contato@lymark.app</a>
                </p>
              </div>
              <nav aria-label={t('footer.documentsLabel')}>
                <Link href="/privacidade">{t('footer.privacy')}</Link>
                <Link href="/termos">{t('footer.terms')}</Link>
              </nav>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
