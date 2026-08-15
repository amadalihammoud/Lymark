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

  async headers() {
    return [
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
