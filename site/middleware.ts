import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  // Protege todas as rotas EXCETO as públicas
  publicRoutes: ['/', '/privacidade', '/termos', '/api/clerk-webhook(.*)'],
});

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
