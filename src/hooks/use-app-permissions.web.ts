/**
 * Implementação para web e desktop (Electron).
 *
 * Na web: não há permissões de galeria (decisão 2.2) - apenas camera e location.
 * No desktop: não há permissões no sentido mobile.
 *
 * Este módulo mantém a mesma assinatura do use-app-permissions.ts (nativo).
 */

import { useCallback, useEffect, useState } from 'react';

import { useFeedback } from '@/contexts/feedback-context';

/**
 * Estado das três permissões que o Lymark usa, num formato só.
 */
export const PERMISSION_IDS = ['camera', 'mediaLibrary', 'location'] as const;

export type PermissionId = (typeof PERMISSION_IDS)[number];

export type PermissionSnapshot = {
  granted: boolean;
  /** `false` quando o usuário negou em definitivo — só resta abrir os Ajustes. */
  canAskAgain: boolean;
};

/** Mesmas chaves da versão nativa — ver `use-app-permissions.ts`. */
export function permissionLabelKey(id: PermissionId): string {
  return id;
}

export function permissionRationaleKey(id: PermissionId): string {
  return `${id}Rationale`;
}

type PermissionMap = Record<PermissionId, PermissionSnapshot | null>;

const EMPTY_MAP: PermissionMap = { camera: null, mediaLibrary: null, location: null };

/**
 * Na web e desktop, não há permissões de galeria no sentido mobile.
 * Camera e location também não são aplicáveis da mesma forma.
 *
 * mediaLibrary: sempre false (não há galeria na web, no desktop usa IPC)
 * camera: sempre false (não implementado ainda)
 * location: sempre false (decisão 2.3: não há geocodificação reversa)
 */
async function readPermission(id: PermissionId): Promise<PermissionSnapshot> {
  // mediaLibrary: não aplicável na web/desktop
  if (id === 'mediaLibrary') {
    return { granted: false, canAskAgain: false };
  }

  // location: não aplicável (decisão 2.3)
  if (id === 'location') {
    return { granted: false, canAskAgain: false };
  }

  // camera: não implementado ainda na web/desktop
  return { granted: false, canAskAgain: false };
}

async function askPermission(id: PermissionId): Promise<void> {
  // Na web/desktop, não podemos solicitar permissões no sentido mobile
  // Não retornamos nada (void) para manter compatibilidade com o nativo
  return;
}

/** Consulta as três permissões de uma vez, sem tocar em estado. */
async function readAllPermissions(): Promise<PermissionMap> {
  const snapshots = await Promise.all(
    PERMISSION_IDS.map(async (id) => {
      try {
        return await readPermission(id);
      } catch (error) {
        // Não engolir o erro - deixar quebrar o teste
        throw error;
      }
    }),
  );

  return PERMISSION_IDS.reduce<PermissionMap>(
    (accumulator, id, index) => ({ ...accumulator, [id]: snapshots[index] }),
    { ...EMPTY_MAP },
  );
}

export function useAppPermissions() {
  const { ask } = useFeedback();
  const [permissions, setPermissions] = useState<PermissionMap>(EMPTY_MAP);
  const [refreshing, setRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPermissions(await readAllPermissions());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    readAllPermissions()
      .then((snapshot) => {
        if (active) setPermissions(snapshot);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(
    async (id: PermissionId) => {
      const before = permissions[id];
      await askPermission(id);

      if (before?.granted) {
        // Se já estava concedido, não precisa fazer nada
        return;
      }

      // Atualizar estado para mostrar que não está disponível
      setPermissions((current) => ({
        ...current,
        [id]: { granted: false, canAskAgain: false },
      }));
    },
    [permissions],
  );

  return { permissions, refreshing, refresh, request };
}
