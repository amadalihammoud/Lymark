import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { pickImage, isWeb, isMobile, isDesktop } from '@/lib/file-storage';
import { extractDateFromExif, extractTimeFromExif } from '@/lib/exif';
import type { SelectedPhoto } from '@/types';

/**
 * As duas portas de entrada de uma foto: a cmera e a galeria.
 *
 * Ambas devolvem o mesmo resultado discriminado, para que a tela trate
 * "cancelou" e "negou permisso" sem precisar saber de qual origem veio 
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
  // Sem edio: recortar antes de carimbar deslocaria a marca d'gua em
  // relao ao que o usurio viu no preview.
  allowsEditing: false,
};

function toResult(response: ImagePicker.ImagePickerResult): PhotoPickResult {
  if (response.canceled) return { status: 'cancelled' };

  const asset = response.assets?.[0];
  if (!asset) return { status: 'cancelled' };

  // As dimenses seguem junto porque so elas que definem a resoluo da
  // imagem exportada  sem isso, a exportao sai no tamanho da tela.
  return {
    status: 'selected',
    photo: { uri: asset.uri, width: asset.width, height: asset.height },
  };
}

/**
 * Converte o resultado do picker abstrato para PhotoPickResult.
 */
function fromPickResult(result: Awaited<ReturnType<typeof pickImage>>): PhotoPickResult {
  switch (result.status) {
    case 'selected':
      return {
        status: 'selected',
        photo: {
          uri: result.uri,
          width: result.width,
          height: result.height,
        },
      };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'denied':
      return { status: 'denied' };
    case 'failed':
      return { status: 'failed', error: result.error };
  }
}

export async function takePhotoWithCamera(): Promise<PhotoPickResult> {
  // Cmera s funciona no mobile
  if (isMobile()) {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };

      return toResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch (error) {
      return { status: 'failed', error };
    }
  }

  // No desktop e web, cmera no  implementada ainda
  return { status: 'failed', error: new Error('Cmera no implementada para esta plataforma') };
}

export async function pickPhotoFromLibrary(): Promise<PhotoPickResult> {
  // Usar a abstrao de plataforma
  if (isWeb() || isDesktop()) {
    // Para web e desktop, usar o picker abstrato
    const result = await pickImage();
    return fromPickResult(result);
  }

  // Mobile: usar o expo-image-picker original
  try {
    // No iOS o seletor  o `PHPickerViewController`, que por desenho **no**
    // exige autorizao da fototeca  ele roda fora do processo do app e
    // devolve s o que o usurio escolheu. Pedir permisso ali abriria um
    // dilogo desnecessrio que, se recusado, bloquearia para sempre um
    // caminho que funcionaria sem permisso alguma (o iOS s pergunta uma vez).
    if (Platform.OS === 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }

    return toResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  } catch (error) {
    return { status: 'failed', error };
  }
}

/**
 * Extrai metadados EXIF de uma foto selecionada.
 *
 * Na web, a URI  um blob: ou object URL, precisamos ler o EXIF.
 * No mobile, o expo-image-picker j devolve exif no asset, mas no temos acesso aqui.
 *
 * @param photo - A foto selecionada
 * @returns Promessa com data e hora, ou vazio se no encontrado
 */
export async function extractMetadataFromPhoto(
  photo: SelectedPhoto,
): Promise<{ date?: string; time?: string }> {
  // Na web, a URI  um blob: ou object URL
  if (isWeb() && photo.uri.startsWith('blob:')) {
    try {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      
      const date = await extractDateFromExif(file);
      const time = await extractTimeFromExif(file);
      
      return { date, time };
    } catch {
      return {};
    }
  }

  // Para mobile e desktop, retornamos vazio por enquanto
  // A data ser preenchida manualmente ou via outros meios
  return {};
}
