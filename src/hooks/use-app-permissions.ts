import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useFeedback } from '@/contexts/feedback-context';

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
    title: 'Salvar na galeria',
    rationale: 'Para gravar as fotos exportadas na galeria do aparelho.',
  },
  {
    id: 'location',
    title: 'Localização',
    rationale: 'Preenche o campo de endereço automaticamente ao capturar.',
  },
];

type PermissionMap = Record<PermissionId, PermissionSnapshot | null>;

const EMPTY_MAP: PermissionMap = { camera: null, mediaLibrary: null, location: null };

/**
 * O app grava na galeria e nunca a lê — quem lê é o seletor de imagens, que
 * tem o próprio fluxo. Pedir leitura total seria privilégio sem uso, e no
 * Android 13+ um pedido genérico arrastaria vídeo e áudio junto.
 */
const MEDIA_LIBRARY_ARGS = [true, ['photo'] as MediaLibrary.GranularPermission[]] as const;

async function readPermission(id: PermissionId): Promise<PermissionSnapshot> {
  switch (id) {
    case 'camera': {
      const result = await ImagePicker.getCameraPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'mediaLibrary': {
      const result = await MediaLibrary.getPermissionsAsync(...MEDIA_LIBRARY_ARGS);
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
      const result = await MediaLibrary.requestPermissionsAsync(...MEDIA_LIBRARY_ARGS);
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
    case 'location': {
      const result = await Location.requestForegroundPermissionsAsync();
      return { granted: result.granted, canAskAgain: result.canAskAgain };
    }
  }
}

/** Consulta as três permissões de uma vez, sem tocar em estado. */
async function readAllPermissions(): Promise<PermissionMap> {
  const snapshots = await Promise.all(
    PERMISSION_IDS.map(async (id) => {
      try {
        return await readPermission(id);
      } catch (error) {
        // No Expo Go o módulo de mídia lança em vez de responder. Isso não
        // pode derrubar a leitura das outras duas permissões.
        console.warn(`[permissions] não foi possível consultar "${id}".`, error);
        return null;
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
  // Já começa em `true`: a primeira leitura dispara junto com a montagem.
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

    // A leitura inicial não reaproveita `refresh` de propósito: ele altera
    // estado de forma síncrona, e fazer isso no corpo de um efeito dispara
    // uma renderização em cascata. Aqui o primeiro setState só acontece
    // depois do await.
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

  // O usuário sai para os Ajustes do sistema, concede a permissão e volta.
  // Sem isto, a tela continuaria mostrando "não liberado" até ele achar o
  // botão de verificar novamente.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async (id: PermissionId) => {
    let snapshot: PermissionSnapshot;

    try {
      snapshot = await askPermission(id);
    } catch (error) {
      console.warn(`[permissions] falha ao solicitar "${id}".`, error);
      return;
    }

    setPermissions((current) => ({ ...current, [id]: snapshot }));

    if (snapshot.granted || snapshot.canAskAgain) return;

    // Negado em definitivo: pedir de novo não abre mais o diálogo do sistema.
    // No iOS isso acontece já na primeira recusa, então empurrar o usuário
    // direto para os Ajustes seria um salto sem explicação.
    ask({
      title: 'Permissão bloqueada',
      message: 'O sistema não vai perguntar de novo. Para liberar, abra os ajustes do aparelho.',
      actions: [
        { label: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
        { label: 'Agora não', variant: 'ghost' },
      ],
    });
  }, [ask]);

  return { permissions, refreshing, refresh, request };
}
