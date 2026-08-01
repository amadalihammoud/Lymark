import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

/**
 * Estado das três permissões que o Lymark usa, num formato só.
 *
 * Cada módulo do Expo tem sua própria API de permissão; esta camada as
 * uniformiza para que a tela de Configurações trate as três com o mesmo
 * componente e o mesmo fluxo de solicitação.
 */

export const PERMISSION_IDS = ['camera', 'mediaLibrary', 'location'] as const;

export type PermissionId = (typeof PERMISSION_IDS)[number];

export type PermissionSnapshot = {
  granted: boolean;
  /** `false` quando o usuário negou em definitivo — só resta abrir os Ajustes. */
  canAskAgain: boolean;
};

export type PermissionDescriptor = {
  id: PermissionId;
  title: string;
  /** Por que o app precisa disso — texto exibido ao usuário. */
  rationale: string;
};

export const PERMISSION_DESCRIPTORS: PermissionDescriptor[] = [
  {
    id: 'camera',
    title: 'Câmera',
    rationale: 'Necessária para tirar a foto que receberá a marca d’água.',
  },
  {
    id: 'mediaLibrary',
    title: 'Fotos do aparelho',
    rationale: 'Para escolher fotos existentes e salvar as versões exportadas.',
  },
  {
    id: 'location',
    title: 'Localização',
    rationale: 'Preenche o campo de endereço automaticamente ao capturar.',
  },
];

type PermissionMap = Record<PermissionId, PermissionSnapshot | null>;

const EMPTY_MAP: PermissionMap = { camera: null, mediaLibrary: null, location: null };

async function readPermission(id: PermissionId): Promise<PermissionSnapshot> {
  switch (id) {
    case 'camera': {
      const result = await ImagePicker.getCameraPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'mediaLibrary': {
      const result = await MediaLibrary.getPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'location': {
      const result = await Location.getForegroundPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
  }
}

async function askPermission(id: PermissionId): Promise<PermissionSnapshot> {
  switch (id) {
    case 'camera': {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'mediaLibrary': {
      const result = await MediaLibrary.requestPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'location': {
      const result = await Location.requestForegroundPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
  }
}

export function useAppPermissions() {
  const [permissions, setPermissions] = useState<PermissionMap>(EMPTY_MAP);
  const [refreshing, setRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshots = await Promise.all(PERMISSION_IDS.map(readPermission));
      setPermissions(
        PERMISSION_IDS.reduce<PermissionMap>(
          (accumulator, id, index) => ({ ...accumulator, [id]: snapshots[index] }),
          { ...EMPTY_MAP },
        ),
      );
    } catch (error) {
      console.warn('[permissions] falha ao consultar o estado das permissões.', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async (id: PermissionId) => {
    const snapshot = await askPermission(id);
    setPermissions((current) => ({ ...current, [id]: snapshot }));

    // Negado em definitivo: pedir de novo não abre mais o diálogo do sistema,
    // então o único caminho é a tela de ajustes do aparelho.
    if (!snapshot.granted && !snapshot.canAskAgain) {
      void Linking.openSettings();
    }
  }, []);

  return { permissions, refreshing, refresh, request };
}
