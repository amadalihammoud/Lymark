import { authMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['pt', 'en', 'es', 'fr', 'it', 'de', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar'],
  defaultLocale: 'pt',
});

export default authMiddleware({
  beforeAuth: (req) => {
    return intlMiddleware(req);
  },
  publicRoutes: ['/', '/privacidade', '/termos', '/api/clerk-webhook(.*)'],
});

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
