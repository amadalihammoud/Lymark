import type { Metadata, Viewport } from 'next';
import { Barlow, Pathway_Gothic_One } from 'next/font/google';
import Link from 'next/link';
import { Providers } from './providers';

import './globals.css';

/*
 * As mesmas duas famílias que o aplicativo embarca: Barlow no texto e na
 * assinatura, Pathway Gothic One nos numerais. A segunda foi escolhida por
 * medição — proporção de 0,498 de largura e 0,318 de densidade de tinta —
 * e é ela que dá ao site a mesma voz tipográfica do carimbo.
 */
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
    default: 'Lymark — marca d'água de data, hora e endereço em fotos de campo',
    template: '%s · Lymark',
  },
  description:
    'Aplicativo Android que carimba hora, data, dia da semana, endereço e um código de rastreio nas fotos de vistoria e comprovação de serviço.',
  applicationName: 'Lymark',
  openGraph: {
    title: 'Lymark',
    description:
      'Carimba hora, data, dia da semana, endereço e código de rastreio nas fotos de campo. Sem conta, sem servidor.',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0D2137',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${pathway.variable}`}>
      <body style={{ ['--font-mark' as string]: 'var(--font-body)' }}>
        <Providers>
          <a className="skip" href="#conteudo">
            Pular para o conteúdo
          </a>

          <header className="site">
            <div className="shell">
              <Link href="/" className="wordmark" aria-label="Lymark, página inicial">
                Ly<em>mark</em>
              </Link>
              <nav className="site" aria-label="Principal">
                <Link href="/privacidade">Privacidade</Link>
                <Link href="/termos">Termos</Link>
              </nav>
            </div>
          </header>

          <main id="conteudo" className="shell">{children}</main>

          <footer className="site">
            <div className="shell">
              <div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Lymark — registro fotográfico com data, hora e endereço.
                </p>
                <p style={{ marginTop: '0.35rem' }}>
                  Suporte: <a href="mailto:contato@lymark.app">contato@lymark.app</a>
                </p>
              </div>
              <nav aria-label="Documentos">
                <Link href="/privacidade">Política de Privacidade</Link>
                <Link href="/termos">Termos de Uso</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
