import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { resolveExportedPhotoUri } from './photo-file';

/**
 * O que fazer com a imagem depois de gerada.
 *
 * Gerar é responsabilidade de `render-photo.ts`, que compõe o carimbo sobre o
 * bitmap original. Aqui ficam os dois destinos, separados porque "salvar na
 * galeria" e "compartilhar" são decisões diferentes de quem usa — antes eram
 * um botão só chamado "exportar", que não dizia para onde a foto ia.
 */


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
