/**
 * Contrato de tipos para use-app-permissions.
 *
 * Este arquivo existe para que `npm run typecheck` quebre se as superfícies
 * de use-app-permissions.ts (nativo) e use-app-permissions.web.ts (web/desktop) divergirem.
 */

import type * as Native from '@/hooks/use-app-permissions';
import type * as Web from '@/hooks/use-app-permissions.web';

// Atribuições cruzadas: cada lado precisa satisfazer o outro.
const _webSatisfazNative: typeof Native = undefined as unknown as typeof Web;
const _nativeSatisfazWeb: typeof Web = undefined as unknown as typeof Native;

void _webSatisfazNative;
void _nativeSatisfazWeb;
