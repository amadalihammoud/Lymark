import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { persistExportedPhoto, resolveExportedPhotoUri } from './photo-file';

/**
 * Gerar a imagem e o que fazer com ela são coisas separadas.
 *
 * A separação existe porque "salvar na galeria do aparelho" e "compartilhar"
 * são decisões diferentes do usuário, e antes estavam fundidas num botão só
 * chamado "exportar" — que não dizia para onde a foto ia.
 *
 * A geração captura a própria árvore de views que está na tela, em vez de
 * recompor a imagem por fora: assim não existe um segundo caminho de
 * renderização que possa divergir do preview.
 *
 * LIMITAÇÃO CONHECIDA — resolução. A captura sai no tamanho em que a view
 * está na tela (entre 1000 e 1400 px de largura), não na resolução da foto
 * original. Pedir um tamanho maior ao `view-shot` **não** recupera detalhe:
 * ele rasteriza a view no tamanho de tela e só depois interpola. Resolver de
 * verdade exige compor o carimbo sobre o bitmap original, abandonando a
 * garantia de que preview e exportação são a mesma árvore de views.
 */

export class PhotoExportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PhotoExportError';
  }
}

/**
 * Achata foto + carimbo num JPEG guardado no armazenamento do app.
 *
 * @returns o caminho relativo do arquivo — o que vai para o histórico.
 */
export async function generateWatermarkedPhoto(
  target: RefObject<View | null>,
): Promise<string> {
  try {
    const temporaryUri = await captureRef(target, {
      format: 'jpg',
      quality: 0.95,
      // No iOS, o caminho padrão usa `drawViewHierarchyInRect:` — um
      // instantâneo do que está *visível na tela*. Como os botões ficam
      // abaixo da dobra, a preview costuma estar fora da viewport no momento
      // do toque, e a captura sairia em branco relatando sucesso.
      useRenderInContext: Platform.OS === 'ios',
    });

    // A captura nasce em cache; o histórico precisa de um arquivo que
    // sobreviva à limpeza automática do sistema.
    return await persistExportedPhoto(temporaryUri);
  } catch (error) {
    throw new PhotoExportError('Não foi possível gerar a imagem com a marca d’água.', {
      cause: error,
    });
  }
}

/**
 * Por que não devolvem `boolean`.
 *
 * Um único `false` obriga quem chama a inventar a causa, e a tela acabava
 * dizendo "o acesso às fotos foi negado" para qualquer falha — inclusive com a
 * permissão concedida e o armazenamento cheio. O usuário ia aos ajustes, via
 * "Liberado", tentava de novo e recebia a mesma frase. Diagnóstico errado que
 * parece acionável é pior que nenhum.
 */
export type SaveOutcome =
  | { status: 'saved' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

export type ShareOutcome =
  | { status: 'shared' }
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/**
 * Copia a imagem para a galeria do aparelho.
 *
 * Falhe como for, a imagem continua no histórico do Lymark — nada se perde.
 */
export async function saveToDeviceGallery(path: string): Promise<SaveOutcome> {
  let permission;
  try {
    // `writeOnly` e apenas fotos: o app grava na galeria e nunca a lê — quem
    // lê é o seletor de imagens, que tem o próprio fluxo. Pedir leitura total
    // seria privilégio sem uso, e no Android 13+ o pedido genérico ainda
    // arrastaria vídeo e áudio junto.
    permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  } catch (error) {
    // O módulo lança no Expo Go. Não é recusa do usuário, e mandá-lo aos
    // ajustes de permissão não resolveria nada.
    return { status: 'failed', error };
  }

  if (!permission.granted) return { status: 'denied' };

  try {
    // `saveToLibraryAsync` existe no pacote mas lança incondicionalmente no
    // SDK 57 — é a API legada. `Asset.create` é a substituta.
    await MediaLibrary.Asset.create(resolveExportedPhotoUri(path));
    return { status: 'saved' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

/**
 * Abre a folha de compartilhamento do sistema.
 *
 * A imagem já foi gerada e já entrou no histórico antes desta chamada: uma
 * falha aqui não é falha de geração, e não pode ser relatada como tal — sob
 * pena de o usuário tentar de novo e criar uma duplicata.
 */
export async function shareWatermarkedPhoto(path: string): Promise<ShareOutcome> {
  try {
    if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };

    await Sharing.shareAsync(resolveExportedPhotoUri(path), {
      mimeType: 'image/jpeg',
      UTI: 'public.jpeg',
      dialogTitle: 'Compartilhar foto com marca d’água',
    });

    return { status: 'shared' };
  } catch (error) {
    return { status: 'failed', error };
  }
}
