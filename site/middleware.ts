import createNextIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createNextIntlMiddleware({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR'
});

export default intlMiddleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\..*).*)']
};
