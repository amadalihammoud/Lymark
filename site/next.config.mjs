import path from 'node:path';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';

const here = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * O catálogo de traduções mora em `i18n/messages/`, na raiz do repositório —
   * um nível acima deste diretório. Sem apontar a raiz de rastreamento para
   * lá, o build não inclui os arquivos de mensagem no pacote final.
   */
  outputFileTracingRoot: path.join(here, '..'),

  /**
   * - `/mesa` → `/web` (nome antigo da versão web)
   * - `app.lymark.app` (e www) → `https://lymark.app/web`
   * Next 16: `has: [{ type: 'host', value }]` em redirects() é suportado.
   * permanent: true → 308.
   */
  async redirects() {
    return [
      {
        source: '/mesa',
        destination: '/web',
        permanent: true,
      },
      {
        source: '/mesa/:path*',
        destination: '/web/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'app.lymark.app' }],
        destination: 'https://lymark.app/web',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.app.lymark.app' }],
        destination: 'https://lymark.app/web',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/web/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
