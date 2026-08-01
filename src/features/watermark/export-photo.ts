import * as MediaLibrary from 'expo-media-library';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Achata foto + carimbo numa única imagem e salva no aparelho.
 *
 * A estratégia é capturar a própria árvore de views que já está na tela, em
 * vez de recompor a imagem por fora. Assim não existe um segundo caminho de
 * renderização que possa divergir do preview.
 */

export type ExportOutcome = {
  /** URI do arquivo gerado — sempre presente em caso de sucesso. */
  uri: string;
  /** `false` quando a imagem foi gerada mas o usuário negou acesso à galeria. */
  savedToLibrary: boolean;
};

export class PhotoExportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PhotoExportError';
  }
}

export async function exportWatermarkedPhoto(
  target: RefObject<View | null>,
): Promise<ExportOutcome> {
  let uri: string;

  try {
    uri = await captureRef(target, { format: 'jpg', quality: 0.95 });
  } catch (error) {
    throw new PhotoExportError('Não foi possível gerar a imagem com a marca d’água.', {
      cause: error,
    });
  }

  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      return { uri, savedToLibrary: false };
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    return { uri, savedToLibrary: true };
  } catch (error) {
    console.warn('[export] imagem gerada, mas não foi salva na galeria.', error);
    return { uri, savedToLibrary: false };
  }
}
