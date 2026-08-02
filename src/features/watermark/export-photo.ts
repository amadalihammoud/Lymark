import * as MediaLibrary from 'expo-media-library';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { persistExportedPhoto, resolveExportedPhotoUri } from './photo-file';

/**
 * Achata foto + carimbo numa única imagem e salva no aparelho.
 *
 * A estratégia é capturar a própria árvore de views que já está na tela, em
 * vez de recompor a imagem por fora. Assim não existe um segundo caminho de
 * renderização que possa divergir do preview.
 *
 * LIMITAÇÃO CONHECIDA — resolução. A captura sai no tamanho em que a view
 * está na tela (algo entre 1000 e 1400 px de largura), não na resolução da
 * foto original. Pedir um tamanho maior ao `view-shot` **não** recupera
 * detalhe: ele rasteriza a view no tamanho de tela e só depois interpola, o
 * que produz arquivo maior, texto borrado e mais memória, sem informação
 * nova. Resolver isso de verdade exige compor o carimbo sobre o bitmap
 * original (expo-image-manipulator ou canvas), abandonando a garantia de que
 * preview e exportação são literalmente a mesma árvore de views.
 */

export type ExportOutcome = {
  /** Caminho relativo do arquivo gerado — o que vai para o histórico. */
  path: string;
  /** `false` quando a imagem foi gerada mas não entrou na galeria do aparelho. */
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
  let path: string;

  try {
    const temporaryUri = await captureRef(target, {
      format: 'jpg',
      quality: 0.95,
      // No iOS, o caminho padrão usa `drawViewHierarchyInRect:` — um
      // instantâneo do que está *visível na tela*. Como o botão de exportar
      // fica abaixo da dobra, a preview costuma estar fora da viewport no
      // momento do toque, e a captura sairia em branco relatando sucesso.
      // `renderInContext:` não depende de visibilidade.
      useRenderInContext: Platform.OS === 'ios',
    });

    // A captura nasce em cache; o histórico precisa de um arquivo que
    // sobreviva à limpeza automática do sistema.
    path = await persistExportedPhoto(temporaryUri);
  } catch (error) {
    throw new PhotoExportError('Não foi possível gerar a imagem com a marca d’água.', {
      cause: error,
    });
  }

  try {
    // `writeOnly` e apenas fotos: o app grava na galeria e nunca a lê — quem
    // lê é o seletor de imagens, que tem o próprio fluxo. Pedir leitura total
    // seria privilégio sem uso, e no Android 13+ o pedido genérico ainda
    // arrastaria vídeo e áudio junto.
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) {
      return { path, savedToLibrary: false };
    }

    // `saveToLibraryAsync` existe no pacote mas lança incondicionalmente no
    // SDK 57 — é a API legada. `Asset.create` é a substituta.
    await MediaLibrary.Asset.create(resolveExportedPhotoUri(path));
    return { path, savedToLibrary: true };
  } catch (error) {
    console.warn('[export] imagem gerada, mas não foi salva na galeria.', error);
    return { path, savedToLibrary: false };
  }
}
