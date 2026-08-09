/**
 * Contrato de tipos para export-photo.
 *
 * Este arquivo existe para que `npm run typecheck` quebre se as superfícies
 * de export-photo.ts (nativo) e export-photo.web.ts (web/desktop) divergirem.
 */

import type * as Native from '../export-photo';
import type * as Web from '../export-photo.web';

// Atribuições cruzadas: cada lado precisa satisfazer o outro.
const _webSatisfazNative: typeof Native = undefined as unknown as typeof Web;
const _nativeSatisfazWeb: typeof Web = undefined as unknown as typeof Native;

void _webSatisfazNative;
void _nativeSatisfazWeb;
