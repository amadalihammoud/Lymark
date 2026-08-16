/**
 * A configuração da identidade — e a decisão de degradar sem ela.
 *
 * O mesmo princípio do site (commit "sem chave do Clerk, a landing continua
 * no ar") vale no aplicativo: sem a chave publicável, o app funciona inteiro
 * como sempre funcionou — local, sem conta. A tela de conta explica que o
 * login não está disponível, e nada mais muda. É o que permite compilar e
 * testar as três plataformas sem segredo nenhum configurado.
 *
 * `EXPO_PUBLIC_*` é inlinado pelo Expo no build; a chave publicável do Clerk
 * é pública por definição, então não há segredo aqui.
 */

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

/** `true` quando existe chave e o fluxo de conta pode ser oferecido. */
export const isAuthConfigured = CLERK_PUBLISHABLE_KEY.length > 0;

/**
 * Onde `GET /api/entitlements` mora. A rota vive no site (Next), que é o
 * único lugar com o SDK de servidor do Clerk — ver `docs/ASSINATURA.md` §6.1.
 */
export const ENTITLEMENTS_ENDPOINT =
  process.env.EXPO_PUBLIC_ENTITLEMENTS_URL ?? 'https://lymark.app/api/entitlements';
