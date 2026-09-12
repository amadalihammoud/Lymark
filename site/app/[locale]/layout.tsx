import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { LOCALES, isRtl, type Locale } from '../../../i18n/locales';
import AccountNav from '../../components/AccountNav';
import LanguageSelector from '../../components/LanguageSelector';
import { CLERK_APPEARANCE, CLERK_LOCALIZATIONS } from '../../i18n/clerk';
import { Link, getPathname } from '../../i18n/navigation';
import { routing } from '../../i18n/routing';
import { OG_LOCALES } from '../../i18n/og-locales';
import { SITE_ORIGIN, alternatesFor, canonicalFor, urlFor } from '../../i18n/urls';

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

/**
 * Idiomas gerados no build. Os demais (`dynamicParams`) são renderizados na
 * primeira visita e ficam em cache como estáticos — o resultado é o mesmo.
 *
 * Gerar os 79 no build custa caro no lugar errado: cada idioma rende ~1,7 MB
 * de HTML + RSC (cada página gravada quatro vezes, com o catálogo dentro),
 * ~200 MB por deploy, e a Vercel guarda todos os deploys. Foi isso que
 * estourou a cota de armazenamento.
 */
const PRERENDERED_LOCALES: readonly Locale[] = ['pt', 'pt-PT', 'en', 'es'];

export const dynamicParams = true;

export function generateStaticParams() {
  return PRERENDERED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });

  return {
    /*
     * Sem `metadataBase`, o Next resolve endereço relativo contra
     * `localhost:3000` e o canônico publicado aponta para a máquina de quem
     * fez o build. De onde sai a origem está em `i18n/urls.ts`.
     */
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: t('title'),
      template: `%s · Lymark`,
    },
    description: t('description'),
    applicationName: 'Lymark',
    /*
     * As doze versões são traduções da MESMA página, e não doze páginas.
     * Sem `hreflang`, o buscador as trata como concorrentes: escolhe uma,
     * ignora as outras e mostra a errada para quem procura em outra língua —
     * o que anula o trabalho de tradução justamente onde ele deveria render.
     */
    alternates: {
      canonical: canonicalFor('/', locale as Locale),
      languages: alternatesFor('/'),
    },
    openGraph: {
      title: 'Lymark',
      description: t('description'),
      // O Open Graph pede idioma_TERRITÓRIO; o `hreflang` acima é que usa o
      // código puro. São convenções diferentes, e trocá-las invalida as duas.
      locale: OG_LOCALES[locale as Locale],
      alternateLocale: LOCALES.filter((code) => code !== locale).map((code) => OG_LOCALES[code]),
      url: urlFor('/', locale as Locale),
      siteName: 'Lymark',
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

  // Sem isto, cada página do idioma vira renderização dinâmica e a versão
  // estática (no build ou na primeira visita) não acontece.
  setRequestLocale(locale);

  const t = await getTranslations('site');

  /*
   * O que o provider recebe vai serializado no HTML de toda página. O catálogo
   * inteiro tem três namespaces e o navegador só precisa de dois pedaços: o
   * do site e o seletor de idioma (`app.language`, compartilhado com o app).
   * `app` e `desktop` completos são 2/3 do catálogo, e ninguém os lê aqui —
   * os componentes de servidor continuam lendo tudo pelo `getTranslations`.
   */
  const messages = await getMessages();
  const clientMessages = {
    site: messages.site,
    app: { language: (messages.app as { language: unknown }).language },
  };

  /*
   * As rotas da conta levam o prefixo do idioma como qualquer outra — o Clerk
   * recebe o caminho já resolvido, e não uma string fixa, senão `/en/entrar`
   * mandaria de volta para `/entrar` em português.
   */
  const at = (href: '/entrar' | '/cadastrar' | '/conta') =>
    getPathname({ href, locale: locale as Locale });

  return (
    <ClerkProvider
      localization={CLERK_LOCALIZATIONS[locale as Locale]}
      appearance={CLERK_APPEARANCE}
      signInUrl={at('/entrar')}
      signUpUrl={at('/cadastrar')}
      signInFallbackRedirectUrl={at('/conta')}
      signUpFallbackRedirectUrl={at('/conta')}
      afterSignOutUrl={getPathname({ href: '/', locale: locale as Locale })}
    >
    <html
      lang={locale}
      dir={isRtl(locale as Locale) ? 'rtl' : 'ltr'}
      className={`${barlow.variable} ${pathway.variable}`}
    >
      <body style={{ ['--font-mark' as string]: 'var(--font-body)' }}>
        <NextIntlClientProvider messages={clientMessages}>
          <a className="skip" href="#conteudo">
            {t('skipToContent')}
          </a>

          <header className="site">
            <div className="shell">
              <Link href="/" className="wordmark" aria-label={t('nav.homeLabel')}>
                Ly<em>mark</em>
              </Link>
              <nav className="site" aria-label={t('nav.label')}>
                <Link href="/verificar">{t('nav.verify')}</Link>
                <Link href="/privacidade">{t('nav.privacy')}</Link>
                <Link href="/termos">{t('nav.terms')}</Link>
                {/*
                  A conta entra no cabeçalho como qualquer outra rota. Sem sessão
                  é um link; com sessão, o botão do Clerk — que já traz o menu de
                  sair e gerir a conta no idioma da página.
                */}
                <AccountNav signIn={t('nav.signIn')} account={t('nav.account')} />
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
    </ClerkProvider>
  );
}
