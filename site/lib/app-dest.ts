/**
 * Para onde o login manda depois de autenticar.
 *
 * `/web` é o app de celular no navegador. `/mesa` é o de notebook e PC.
 * Qualquer outro valor (open redirect) cai em `/web`.
 */
export type AppDest = '/web' | '/mesa';

export function appDestFromSearch(next: unknown): AppDest {
  return next === '/mesa' ? '/mesa' : '/web';
}

export function withNext(path: string, dest: AppDest): string {
  if (dest === '/web') return path;
  return `${path}?next=${encodeURIComponent(dest)}`;
}
