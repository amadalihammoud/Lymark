import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { isVideoStampAvailable, stampVideo } from '@modules/video-stamp';
import { composeStampOverlay } from '@/features/watermark/render-overlay';
import type { SaveOutcome, ShareLabels, ShareOutcome } from '@/features/watermark/export-photo';
import type { StampRenderer } from '@/features/watermark/skia-stamp';
import { bytesToBase64 } from '@/lib/base64';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

/**
 * O vídeo carimbado no celular, pela mesma esteira da foto.
 *
 * É o que a rota `/video` fazia num fluxo à parte, agora como funções para a
 * tela inicial chamar dos mesmos botões Salvar e Compartilhar. O carimbo é o
 * MESMO da foto: desenhado pelo mesmo código, com as mesmas preferências,
 * num PNG transparente do tamanho do quadro (`render-overlay.ts`); quem
 * compõe sobre o vídeo é o módulo nativo (`modules/video-stamp`).
 *
 * Os resultados reaproveitam os tipos da foto (`SaveOutcome`, `ShareOutcome`)
 * para a tela tratar os dois com as mesmas caixas de diálogo.
 */

/** O celular sem o módulo nativo (Expo Go) não carimba vídeo. */
export const canStampVideoHere = isVideoStampAvailable;

/**
 * Compõe o carimbo sobre o vídeo e devolve o MP4 no cache (`file://`).
 *
 * O overlay vai ao módulo por arquivo, não por bytes: atravessar a ponte com
 * um PNG de quadro inteiro em array seria cópia atrás de cópia. O
 * Transformer quer caminhos simples, sem esquema `file://`. O PNG é apagado
 * sempre; o MP4 fica para quem chamou salvar ou compartilhar — e apagar
 * depois, se quiser.
 */
export async function renderStampedVideo({
  video,
  metadata,
  preferences,
  renderer,
}: {
  video: SelectedPhoto;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  renderer: StampRenderer;
}): Promise<string> {
  const base = `${FileSystem.cacheDirectory}lymark-stamp-${Date.now()}`;
  const overlayUri = `${base}.png`;
  const outputUri = `${base}.mp4`;

  try {
    const overlay = await composeStampOverlay({
      width: video.width,
      height: video.height,
      metadata,
      preferences,
      renderer,
    });
    await FileSystem.writeAsStringAsync(overlayUri, bytesToBase64(overlay), {
      encoding: 'base64',
    });
    await stampVideo(video.uri, stripScheme(overlayUri), stripScheme(outputUri));
    return outputUri;
  } finally {
    void FileSystem.deleteAsync(overlayUri, { idempotent: true });
  }
}

/**
 * Mesmo padrão de `export-photo.ts` (SDK 57): `saveToLibraryAsync` lança
 * incondicionalmente; `requestPermissionsAsync` + `Asset.create` é a API
 * vigente, com `video` nas permissões granulares. Import dinâmico porque na
 * web o módulo lança na carga — e este arquivo entra no bundle da web pela
 * tela de captura, mesmo sem nunca ser chamado lá.
 */
export async function saveVideoToGallery(uri: string): Promise<SaveOutcome> {
  let MediaLibrary: typeof import('expo-media-library');
  let permission;
  try {
    MediaLibrary = await import('expo-media-library');
    permission = await MediaLibrary.requestPermissionsAsync(true, ['photo', 'video']);
  } catch (error) {
    return { status: 'failed', error };
  }

  if (!permission.granted) return { status: 'denied' };

  try {
    await MediaLibrary.Asset.create(uri);
    return { status: 'saved' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function shareStampedVideo(uri: string, labels: ShareLabels): Promise<ShareOutcome> {
  try {
    if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };

    await Sharing.shareAsync(uri, {
      mimeType: 'video/mp4',
      UTI: 'public.mpeg-4',
      dialogTitle: labels.dialogTitle,
    });

    return { status: 'shared' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

/** Apaga o MP4 do cache depois de a galeria ter a cópia. */
export function discardStampedVideo(uri: string): void {
  void FileSystem.deleteAsync(uri, { idempotent: true });
}

function stripScheme(uri: string): string {
  return uri.replace('file://', '');
}
