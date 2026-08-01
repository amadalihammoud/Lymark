import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Onde as fotos exportadas realmente moram.
 *
 * O `view-shot` grava em diretório de cache, que o sistema operacional pode
 * esvaziar quando o armazenamento aperta — o histórico da Galeria ficaria
 * cheio de referências para arquivos que sumiram. Toda exportação é movida
 * para o diretório de documentos do app, que só é apagado com o app.
 */

const EXPORTS_DIRECTORY_NAME = 'exports';

function exportsDirectory(): Directory {
  const directory = new Directory(Paths.document, EXPORTS_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/**
 * Move a captura temporária para o armazenamento permanente.
 *
 * @returns a URI definitiva, que é a que deve ir para o histórico.
 */
export async function persistExportedPhoto(temporaryUri: string): Promise<string> {
  const destination = new File(exportsDirectory(), `${Crypto.randomUUID()}.jpg`);
  await new File(temporaryUri).move(destination);
  return destination.uri;
}

/**
 * Apaga o arquivo de uma exportação removida do histórico.
 *
 * A verificação de prefixo não é decorativa: sem ela, um registro com URI
 * apontando para a galeria do aparelho faria o app apagar uma foto do
 * usuário. Só mexemos no que este módulo criou.
 */
export function deleteExportedPhoto(uri: string): void {
  if (!uri.startsWith(exportsDirectory().uri)) return;

  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[export] não foi possível apagar o arquivo exportado.', error);
  }
}
