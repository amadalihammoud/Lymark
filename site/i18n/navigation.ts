import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Substitutos de `Link`, `useRouter` e `usePathname` que já sabem em que
 * idioma a pessoa está. Importar os originais de `next/navigation` numa página
 * traduzida perde o prefixo do idioma na navegação.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
