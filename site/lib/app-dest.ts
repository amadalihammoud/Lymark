/**
 * Para onde o login manda depois de autenticar.
 *
 * `/mesa` é a versão web canônica (studio no navegador).
 * `/web` é o Expo mobile-in-browser, fallback não promovido.
 * Qualquer outro valor (open redirect) cai em `/mesa`.
 */
export type AppDest = '/web' | '/mesa';

export function appDestFromSearch(next: unknown): AppDest {
  return next === '/web' ? '/web' : '/mesa';
}

export function withNext(path: string, dest: AppDest): string {
  if (dest === '/mesa') return path;
  return `${path}?next=${encodeURIComponent(dest)}`;
}
