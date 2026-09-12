import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { pickImage, isWeb, isMobile, isDesktop } from '@/lib/file-storage';
import { extractDateFromExif, extractTimeFromExif } from '@/lib/exif';
import type { SelectedPhoto, TimeFormat } from '@/types';

/**
 * As portas de entrada da captura: câmera e galeria.
 *
 * No celular a galeria entrega foto **ou** vídeo pela mesma porta — é a
 * decisão que tirou o vídeo de uma rota escondida e o pôs na tela inicial.
 * A câmera continua com uma porta por tipo (foto, vídeo), porque o sistema
 * abre modos diferentes para cada um.
 *
 * Na web e no desktop a galeria segue só de fotos: lá o vídeo tem caminho
 * próprio (ffmpeg no desktop, navegador na web — ver `app/video.tsx`).
 */

export type PhotoPickResult =
  | { status: 'selected'; photo: SelectedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
};

const LIBRARY_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images', 'videos'],
  quality: 1,
  allowsEditing: false,
};

const VIDEO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['videos'],
  allowsEditing: false,
};

/**
 * O item do seletor como mídia escolhida.
 *
 * `kind` sai só para vídeo: foto é o padrão do tipo, e o rascunho gravado
 * antes do vídeo existir não tem o campo. `duration` vem em milissegundos
 * do seletor; quando falta, fica ausente em vez de virar zero — zero seria
 * um vídeo de duração nula, e ausente é "não sei".
 */
export function describeAsset(asset: {
  uri: string;
  width: number;
  height: number;
  type?: string | null;
  duration?: number | null;
}): SelectedPhoto {
  const photo: SelectedPhoto = { uri: asset.uri, width: asset.width, height: asset.height };
  if (asset.type !== 'video') return photo;

  photo.kind = 'video';
  if (typeof asset.duration === 'number' && asset.duration > 0) {
    photo.durationMs = asset.duration;
  }
  return photo;
}

function toResult(response: ImagePicker.ImagePickerResult): PhotoPickResult {
  if (response.canceled) return { status: 'cancelled' };

  const asset = response.assets?.[0];
  if (!asset) return { status: 'cancelled' };
  // O seletor devolve dimensões zeradas para alguns vídeos que não consegue
  // sondar; sem elas não há proporção de preview nem quadro de carimbo.
  if (!asset.width || !asset.height) {
    return { status: 'failed', error: new Error('Mídia sem dimensões') };
  }

  return { status: 'selected', photo: describeAsset(asset) };
}

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

async function openCamera(options: ImagePicker.ImagePickerOptions): Promise<PhotoPickResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    return toResult(await ImagePicker.launchCameraAsync(options));
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function takePhotoWithCamera(): Promise<PhotoPickResult> {
  if (isWeb()) {
    return fromPickResult(await pickImage('camera'));
  }

  if (isMobile()) return openCamera(PHOTO_OPTIONS);

  return { status: 'failed', error: new Error('Câmera não implementada para esta plataforma') };
}

/**
 * Gravar um vídeo agora, pela câmera do sistema — só no celular.
 *
 * O vídeo cai na mesma esteira da foto: campos preenchidos do relógio de
 * agora (o momento da gravação, desta vez de verdade) e editáveis antes de
 * exportar. Desenhar o carimbo AO VIVO sobre a gravação continua sem caminho
 * na geração atual da câmera; gravar-e-carimbar entrega o mesmo resultado.
 */
export async function recordVideoWithCamera(): Promise<PhotoPickResult> {
  if (!isMobile()) {
    return { status: 'failed', error: new Error('Gravação de vídeo só no celular') };
  }
  return openCamera(VIDEO_OPTIONS);
}

export async function pickPhotoFromLibrary(): Promise<PhotoPickResult> {
  if (isWeb() || isDesktop()) {
    const result = await pickImage();
    return fromPickResult(result);
  }

  try {
    if (Platform.OS === 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }

    return toResult(await ImagePicker.launchImageLibraryAsync(LIBRARY_OPTIONS));
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function extractMetadataFromPhoto(
  photo: SelectedPhoto,
  timeFormat: TimeFormat = '24h',
): Promise<{ date?: string; time?: string }> {
  if (isWeb() && photo.uri.startsWith('blob:')) {
    try {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      const date = await extractDateFromExif(file);
      const time = await extractTimeFromExif(file, timeFormat);

      return { date, time };
    } catch {
      return {};
    }
  }

  return {};
}
