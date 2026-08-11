import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Pathway_Gothic_One, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';

import './globals.css';

/*
 * As duas famílias do Manual de Marca: Space Grotesk em títulos e interface,
 * IBM Plex Mono reservada a rótulos curtos em caixa alta, números, códigos e
 * legendas técnicas — nunca em texto corrido.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-body',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

/*
 * A terceira fica só dentro das molduras. Pathway Gothic One é a fonte que o
 * aplicativo embarca e desenha no carimbo de cada foto exportada; trocá-la
 * aqui faria o site mostrar um carimbo que o aplicativo não produz.
 */
const pathway = Pathway_Gothic_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-clock',
});

export const metadata: Metadata = {
  title: {
    default: 'Lymark — marca d’água de data, hora e endereço em fotos de campo',
    template: '%s · Lymark',
  },
  description:
    'Aplicativo Android que carimba hora, data, dia da semana, endereço e um código de rastreio nas fotos de vistoria e comprovação de serviço. Funciona sem conta e sem servidor.',
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
  themeColor: '#15243C',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${plexMono.variable} ${pathway.variable}`}
    >
      <body>
        <a className="skip" href="#conteudo">
          Pular para o conteúdo
        </a>

        <header className="site">
          <div className="shell">
            <Link href="/" className="wordmark" aria-label="Lymark, página inicial">
              Ly<em>mark</em>
            </Link>
            {/* O manual vem primeiro: é a única página sobre usar a coisa.
                Os outros dois existem por obrigação legal. */}
            <nav className="site" aria-label="Principal">
              <Link href="/manual">Manual</Link>
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/termos">Termos</Link>
            </nav>
          </div>
        </header>

        <main id="conteudo" className="shell">
          {children}
        </main>

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
              <Link href="/manual">Manual de uso</Link>
              <Link href="/privacidade">Política de Privacidade</Link>
              <Link href="/termos">Termos de Uso</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
