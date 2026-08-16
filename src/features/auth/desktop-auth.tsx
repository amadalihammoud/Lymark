import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getExecutionPlatform } from '@/lib/file-storage';
import { readJson, remove, writeJson, StorageKeys } from '@/lib/storage';

/**
 * A sessão do desktop — o outro lado do deep link.
 *
 * No Electron não há Clerk (a origem `app://` não é um domínio que ele
 * aceite). A identidade chega pronta: a pessoa entra pelo navegador em
 * `/conta/desktop`, o site emite o token do desktop e o deep link
 * `lymark://login#token=…` o entrega aqui, via `window.lymark.onLoginToken`.
 * Este contexto guarda o token no disco, o devolve às telas e o apaga no
 * sair — a sincronização quem faz é `EntitlementSync`, com este token.
 *
 * Fora do desktop, o provider é um repasse: valor constante, sem efeito.
 */

type DesktopAuthValue = {
  /** O token do desktop, ou `null` sem sessão. */
  token: string | null;
  /** `false` enquanto o disco ainda não respondeu. */
  hydrated: boolean;
  /** Abre a página de login no navegador do sistema. */
  signIn: () => void;
  signOut: () => void;
};

const SIGNED_OUT: DesktopAuthValue = {
  token: null,
  hydrated: true,
  signIn: () => undefined,
  signOut: () => undefined,
};

const DesktopAuthContext = createContext<DesktopAuthValue>(SIGNED_OUT);

export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  if (getExecutionPlatform() !== 'desktop') {
    return <DesktopAuthContext.Provider value={SIGNED_OUT}>{children}</DesktopAuthContext.Provider>;
  }
  return <DesktopProvider>{children}</DesktopProvider>;
}

function DesktopProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    readJson<string>(StorageKeys.desktopToken)
      .then((stored) => {
        if (active && stored.status === 'found') setToken(stored.value);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    // O deep link pode chegar a qualquer momento — inclusive tendo sido ele
    // quem abriu o aplicativo (o main guarda e entrega no primeiro load).
    globalThis.window?.lymark?.onLoginToken?.((fresh) => {
      setToken(fresh);
      void writeJson(StorageKeys.desktopToken, fresh);
    });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(() => {
    void globalThis.window?.lymark?.openAccountPage?.();
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    void remove(StorageKeys.desktopToken);
  }, []);

  const value = useMemo<DesktopAuthValue>(
    () => ({ token, hydrated, signIn, signOut }),
    [token, hydrated, signIn, signOut],
  );

  return <DesktopAuthContext.Provider value={value}>{children}</DesktopAuthContext.Provider>;
}

export function useDesktopAuth(): DesktopAuthValue {
  return useContext(DesktopAuthContext);
}
