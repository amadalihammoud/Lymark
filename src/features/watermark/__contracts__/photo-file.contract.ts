/**
 * Contrato de tipos para photo-file.
 *
 * Este arquivo existe para que `npm run typecheck` quebre se as superfícies
 * de photo-file.ts (nativo) e photo-file.web.ts (web/desktop) divergirem.
 *
 * Não é código de aplicação e ninguém importa daqui. Existe para que o
 * compilador TypeScript verifique que cada lado satisfaz o outro.
 *
 * Falta de export, sobra de export ou assinatura diferente = erro de tsc.
 */

import type * as Native from '../photo-file';
import type * as Web from '../photo-file.web';

// Atribuições cruzadas: cada lado precisa satisfazer o outro.
const _webSatisfazNative: typeof Native = undefined as unknown as typeof Web;
const _nativeSatisfazWeb: typeof Web = undefined as unknown as typeof Native;

void _webSatisfazNative;
void _nativeSatisfazWeb;
