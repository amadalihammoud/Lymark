/** @type {import('next').NextConfig} */
export default {
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
  i18n: {
    locales: ['pt', 'en', 'es', 'fr', 'it', 'de', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar'],
    defaultLocale: 'pt',
    localeDetection: false,
  },
};
