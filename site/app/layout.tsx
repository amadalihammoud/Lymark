import type { Metadata, Viewport } from 'next';
import { Barlow, Pathway_Gothic_One } from 'next/font/google';
import Link from 'next/link';
import { Providers } from './providers';
import LanguageSelector from '@/components/LanguageSelector';
import { getMessages } from 'next-intl/server';

import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-body',
});

const pathway = Pathway_Gothic_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-clock',
});

export const metadata: Metadata = {
  title: {
    default: 'Lymark - marca de agua de data, hora e endereco em fotos de campo',
    template: '%s - Lymark',
  },
  description:
    'Aplicativo Android que carimba hora, data, dia da semana, endereco e um codigo de rastreio nas fotos de vistoria e comprovacao de servico.',
  applicationName: 'Lymark',
  openGraph: {
    title: 'Lymark',
    description:
      'Carimba hora, data, dia da semana, endereco e codigo de rastreio nas fotos de campo. Sem conta, sem servidor.',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0D2137',
  colorScheme: 'dark',
};

export default async function RootLayout({ 
  children, 
  params: { locale }
}: { 
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${barlow.variable} ${pathway.variable}`}>
      <body style={{ ['--font-mark' as string]: 'var(--font-body)' }}>
        <Providers locale={locale} messages={messages}>
          <a className="skip" href="#conteudo">
            Pular para o conteudo
          </a>

          <header className="site">
            <div className="shell">
              <Link href="/" className="wordmark" aria-label="Lymark, pagina inicial">
                Ly<em>mark</em>
              </Link>
              <nav className="site" aria-label="Principal">
                <Link href="/privacidade">Privacidade</Link>
                <Link href="/termos">Termos</Link>
                <LanguageSelector />
              </nav>
            </div>
          </header>

          <main id="conteudo" className="shell">{children}</main>

          <footer className="site">
            <div className="shell">
              <div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Lymark - registro fotografico com data, hora e endereco.
                </p>
                <p style={{ marginTop: '0.35rem' }}>
                  Suporte: <a href="mailto:contato@lymark.app">contato@lymark.app</a>
                </p>
              </div>
              <nav aria-label="Documentos">
                <Link href="/privacidade">Politica de Privacidade</Link>
                <Link href="/termos">Termos de Uso</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}