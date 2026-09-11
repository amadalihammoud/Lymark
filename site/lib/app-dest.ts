/**
 * Para onde o login manda depois de autenticar.
 *
 * `/web` é a versão web (studio Vite em `desktop/web`).
 * Qualquer outro valor (open redirect) cai em `/web`.
 */
export type AppDest = '/web';

export function appDestFromSearch(next: unknown): AppDest {
  void next;
  return '/web';
}

export function withNext(path: string, dest: AppDest = '/web'): string {
  void dest;
  return path;
}
