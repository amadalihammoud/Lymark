import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * O site mora numa subpasta do repositório do aplicativo, e a raiz tem o
 * `package-lock.json` do Expo. Diante de dois lockfiles o Turbopack escolhe o
 * de cima e passa a tratar o repositório inteiro como espaço de trabalho —
 * o que faz o build do site vigiar milhares de arquivos que não são dele.
 * Aqui a raiz é dita, e não inferida.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  turbopack: { root: here },

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
