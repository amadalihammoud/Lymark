import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { SelectedPhoto } from '@/types';

/**
 * As duas portas de entrada de uma foto: a câmera e a galeria.
 *
 * Ambas devolvem o mesmo resultado discriminado, para que a tela trate
 * "cancelou" e "negou permissão" sem precisar saber de qual origem veio —
 * e sem `try/catch` espalhado pela camada de UI.
 */

export type PhotoPickResult =
  | { status: 'selected'; photo: SelectedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  // Sem edição: recortar antes de carimbar deslocaria a marca d'água em
  // relação ao que o usuário viu no preview.
  allowsEditing: false,
};

function toResult(response: ImagePicker.ImagePickerResult): PhotoPickResult {
  if (response.canceled) return { status: 'cancelled' };

  const asset = response.assets?.[0];
  if (!asset) return { status: 'cancelled' };

  // As dimensões seguem junto porque são elas que definem a resolução da
  // imagem exportada — sem isso, a exportação sai no tamanho da tela.
  return {
    status: 'selected',
    photo: { uri: asset.uri, width: asset.width, height: asset.height },
  };
}

export async function takePhotoWithCamera(): Promise<PhotoPickResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    return toResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function pickPhotoFromLibrary(): Promise<PhotoPickResult> {
  try {
    // No iOS o seletor é o `PHPickerViewController`, que por desenho **não**
    // exige autorização da fototeca — ele roda fora do processo do app e
    // devolve só o que o usuário escolheu. Pedir permissão ali abriria um
    // diálogo desnecessário que, se recusado, bloquearia para sempre um
    // caminho que funcionaria sem permissão alguma (o iOS só pergunta uma vez).
    if (Platform.OS === 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }

    return toResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  } catch (error) {
    return { status: 'failed', error };
  }
}
