import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useEntitlement } from '@/contexts/entitlement-context';
import { fetchEntitlement } from '@/features/entitlements/api';
import { getExecutionPlatform } from '@/lib/file-storage';

import { ENTITLEMENTS_ENDPOINT, isAuthConfigured } from './config';
import { useDesktopAuth } from './desktop-auth';

/**
 * A ponte entre a identidade e o direito de acesso.
 *
 * Renderiza nada. O trabalho é um só: quando há sessão, buscar o entitlement
 * com o token do Clerk — subindo o que foi gasto offline — e entregar a
 * resposta ao `EntitlementProvider`, que reconcilia e grava.
 *
 * Sincroniza em dois momentos: quando o login acontece (ou o app abre já
 * logado), e quando o app volta ao primeiro plano — o mesmo gatilho que o
 * contexto usa para recalcular o agora. Não sincroniza a cada exportação de
 * propósito: quem está em campo não deve gastar rede no meio do serviço, e
 * `spentOffline` acumula até a próxima volta.
 */
export function EntitlementSync() {
  // No desktop a identidade não vem do Clerk: vem do token do deep link,
  // guardado por `DesktopAuthProvider` — ver `desktop-auth.tsx`.
  if (getExecutionPlatform() === 'desktop') return <DesktopBridge />;

  // O condicional fica fora do componente que chama hooks do Clerk: sem
  // provider, `useAuth` lança — ver `provider.tsx`.
  if (!isAuthConfigured) return null;
  return <Bridge />;
}

/**
 * A mesma ponte, com o token do desktop no lugar do token de sessão do
 * Clerk. `unauthorized` aqui significa token vencido (noventa dias) ou
 * revogado — a sessão cai, e a tela de conta volta a oferecer o navegador.
 */
function DesktopBridge() {
  const { token, hydrated: tokenHydrated, signOut } = useDesktopAuth();
  const { hydrated, sync, spentOffline } = useEntitlement();

  const spentRef = useRef(spentOffline);
  useEffect(() => {
    spentRef.current = spentOffline;
  }, [spentOffline]);

  const busy = useRef(false);

  const run = useCallback(async () => {
    if (!token || busy.current) return;
    busy.current = true;
    try {
      const result = await fetchEntitlement({
        endpoint: ENTITLEMENTS_ENDPOINT,
        token,
        spent: spentRef.current,
      });

      if (result.status === 'ok') sync(result.entitlement);
      else if (result.status === 'unauthorized') signOut();
      else if (result.status === 'invalid') {
        console.warn('[entitlement] resposta fora do contrato:', result.detail);
      }
    } finally {
      busy.current = false;
    }
  }, [token, sync, signOut]);

  const ready = Boolean(token) && tokenHydrated && hydrated;

  useEffect(() => {
    if (ready) void run();
  }, [ready, run]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) void run();
    });
    return () => subscription.remove();
  }, [ready, run]);

  return null;
}

function Bridge() {
  const { isSignedIn, getToken } = useAuth();
  const { hydrated, sync, spentOffline } = useEntitlement();

  // Lido por ref para a sincronização não se rearmar a cada exportação.
  const spentRef = useRef(spentOffline);
  useEffect(() => {
    spentRef.current = spentOffline;
  }, [spentOffline]);

  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const token = await getToken();
      if (!token) return;

      const result = await fetchEntitlement({
        endpoint: ENTITLEMENTS_ENDPOINT,
        token,
        spent: spentRef.current,
      });

      // Só o `ok` muda estado. `unreachable` é a vida em campo; `invalid` é
      // defeito nosso e fica no log; `unauthorized` resolve-se na tela de
      // conta, quando a pessoa voltar a ela.
      if (result.status === 'ok') sync(result.entitlement);
      else if (result.status === 'invalid') {
        console.warn('[entitlement] resposta fora do contrato:', result.detail);
      }
    } finally {
      busy.current = false;
    }
  }, [getToken, sync]);

  // A hidratação precisa vir antes: sincronizar por cima de um lote ainda não
  // lido descartaria o `spentOffline` real gravado no disco.
  useEffect(() => {
    if (isSignedIn && hydrated) void run();
  }, [isSignedIn, hydrated, run]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isSignedIn && hydrated) void run();
    });
    return () => subscription.remove();
  }, [isSignedIn, hydrated, run]);

  return null;
}
