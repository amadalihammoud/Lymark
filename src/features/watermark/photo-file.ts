import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Onde as fotos exportadas realmente moram.
 *
 * Duas decisões sustentam este módulo.
 *
 * A primeira: o arquivo sai do cache. O `view-shot` grava em diretório
 * temporário, que o sistema operacional esvazia quando o armazenamento
 * aperta — o histórico ficaria cheio de referências para arquivos sumidos.
 *
 * A segunda: o histórico guarda **caminho relativo**, nunca a URI absoluta.
 * No iOS o identificador do contêiner de dados muda a cada atualização do
 * app e em restaurações de backup. Uma URI absoluta gravada hoje aponta
 * para um caminho inexistente depois da próxima atualização: as miniaturas
 * ficariam em branco e a remoção pararia de apagar os arquivos, que se
 * acumulariam órfãos para sempre.
 */

const EXPORTS_DIRECTORY_NAME = 'exports';

/** Nome de arquivo aceito: o que este módulo gera, e nada além disso. */
const FILE_NAME_PATTERN = /^[0-9a-fA-F-]+\.jpg$/;

function exportsDirectory(): Directory {
  const directory = new Directory(Paths.document, EXPORTS_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/**
 * Um caminho é gerenciado por este módulo quando tem exatamente a forma
 * `exports/<nome>.jpg`.
 *
 * A validação é por lista de permissão, e não por lista de proibição: o
 * caminho vem de JSON no disco, que pode estar corrompido ou ter sido
 * editado. Um caminho arbitrário chegando em `deleteExportedPhoto` faria o
 * app apagar um arquivo que não é dele.
 */
export function isManagedPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const segments = value.split('/');
  if (segments.length !== 2) return false;
  if (segments[0] !== EXPORTS_DIRECTORY_NAME) return false;

  return FILE_NAME_PATTERN.test(segments[1]);
}

/**
 * Reconstrói o caminho relativo a partir do que estava gravado.
 *
 * Aceita o formato atual e recupera registros da versão que gravava URI
 * absoluta — inclusive quando o prefixo do contêiner já mudou, porque o
 * trecho `/exports/<arquivo>` sobrevive a essa troca.
 *
 * @returns o caminho relativo, ou `null` se o registro não é recuperável.
 */
export function normalizeStoredPath(stored: unknown): string | null {
  if (isManagedPath(stored)) return stored;
  if (typeof stored !== 'string') return null;

  const marker = `/${EXPORTS_DIRECTORY_NAME}/`;
  const index = stored.lastIndexOf(marker);
  if (index < 0) return null;

  const relative = stored.slice(index + 1);
  return isManagedPath(relative) ? relative : null;
}

/** Caminho relativo → URI utilizável para exibir a imagem. */
export function resolveExportedPhotoUri(path: string): string {
  return new File(Paths.document, path).uri;
}

/**
 * Move a captura temporária para o armazenamento permanente.
 *
 * @returns o caminho relativo, que é o que deve ir para o histórico.
 */
export async function persistExportedPhoto(temporaryUri: string): Promise<string> {
  const fileName = `${Crypto.randomUUID()}.jpg`;
  const destination = new File(exportsDirectory(), fileName);

  await new File(temporaryUri).move(destination);

  return `${EXPORTS_DIRECTORY_NAME}/${fileName}`;
}

/** Apaga o arquivo de uma exportação que saiu do histórico. */
export function deleteExportedPhoto(path: string): void {
  if (!isManagedPath(path)) return;

  try {
    const file = new File(Paths.document, path);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[export] não foi possível apagar o arquivo exportado.', error);
  }
}
