import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { evaluateAccess, recordExport as addOne, applyServerResponse } from '@/features/entitlements/access';
import { readLease, writeLease } from '@/features/entitlements/storage';
import type { AccessState, Entitlement, LocalLease } from '@/features/entitlements/types';

/**
 * O direito de acesso, do ponto de vista das telas.
 *
 * A regra vive em `features/entitlements`, em funções puras. Este arquivo só
 * cuida do ciclo de vida: ler do disco, sincronizar quando dá, gravar o que
 * mudou e recalcular o estado.
 *
 * A separação importa porque a regra é a parte que não pode errar, e ela é
 * testável sem React, sem disco e sem rede — enquanto isto aqui é encanamento.
 */

type EntitlementContextValue = {
  /** A decisão pronta para a interface consumir. */
  access: AccessState;
  /** `false` enquanto o disco ainda não respondeu. */
  hydrated: boolean;
  /**
   * Contabiliza uma exportação carimbada.
   *
   * Não recusa: quem decide é a tela, consultando `access.canExport` antes.
   * Uma foto que chegou a ser carimbada é sempre contada — melhor o contador
   * ficar devendo do que a pessoa perder o registro que veio fazer.
   */
  recordExport: () => void;
  /** Aplica o que o servidor respondeu. */
  sync: (fresh: Entitlement) => void;
  /**
   * O que foi gasto desde a última sincronização. Quem sincroniza sobe este
   * número junto — e `applyServerResponse` o zera quando o servidor confirma.
   */
  spentOffline: number;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [lease, setLease] = useState<LocalLease | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /**
   * O agora, recalculado quando o app volta ao primeiro plano.
   *
   * Sem isto, um aplicativo aberto por duas semanas seguidas continuaria
   * exibindo o estado do dia em que foi aberto — e a tolerância offline nunca
   * pareceria vencer. Guardar em estado, e não chamar `Date.now()` no corpo
   * do componente, é o que mantém a renderização previsível.
   */
  const [now, setNow] = useState(() => Date.now());

  /**
   * Trava de gravação: leitura que falhou não é disco vazio. A mesma do
   * contexto de preferências, pelo mesmo motivo — gravar depois de uma falha
   * de leitura apagaria o lote real.
   */
  const writable = useRef(false);

  useEffect(() => {
    let active = true;

    readLease()
      .then((stored) => {
        if (!active) return;
        setLease(stored);
        writable.current = true;
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.warn('[entitlement] falha ao hidratar o lote.', error);
        writable.current = false;
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });

    return () => subscription.remove();
  }, []);

  const persist = useCallback((next: LocalLease) => {
    setLease(next);
    if (writable.current) void writeLease(next);
  }, []);

  const recordExport = useCallback(() => {
    // Sem lote não há o que contabilizar: é alguém que nunca sincronizou, e
    // o servidor acerta a conta na primeira vez que houver rede.
    setLease((current) => {
      if (!current) return current;
      const next = addOne(current);
      if (writable.current) void writeLease(next);
      return next;
    });
  }, []);

  const sync = useCallback(
    (fresh: Entitlement) => {
      setLease((current) => {
        const next = applyServerResponse(current, fresh);
        if (writable.current) void writeLease(next);
        return next;
      });
      // A resposta do servidor traz um horário confiável; aproveitá-lo evita
      // exibir estado calculado sobre um relógio que pode estar errado.
      setNow(Date.now());
    },
    [],
  );

  const access = useMemo(() => evaluateAccess(lease, now), [lease, now]);

  const spentOffline = lease?.spentOffline ?? 0;

  const value = useMemo<EntitlementContextValue>(
    () => ({ access, hydrated, recordExport, sync, spentOffline }),
    [access, hydrated, recordExport, sync, spentOffline],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('useEntitlement precisa estar dentro de <EntitlementProvider>.');
  }
  return context;
}
