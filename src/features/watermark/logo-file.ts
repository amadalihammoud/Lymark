import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { LogoError, prepareLogo } from './logo-image';
import { LOGO_DIRECTORY_NAME, isManagedLogoPath } from './logo-path';

export { LogoError };

/**
 * Onde o logotipo da empresa mora no aparelho.
 *
 * O arquivo é copiado para dentro do app. O seletor devolve uma URI de
 * conteúdo — no Android um `content://` com permissão temporária, no iOS um
 * arquivo em cache. As duas expiram. Um logotipo escolhido em janeiro precisa
 * continuar sendo carimbado em julho. Guarda-se **caminho relativo**, nunca a
 * URI absoluta, porque no iOS o identificador do contêiner muda a cada
 * atualização do app.
 *
 * O preparo da imagem — recorte, limite de tamanho, PNG — está em
 * `logo-image.ts`, que é o mesmo em toda plataforma. Este módulo tem par em
 * `logo-file.web.ts`, com a MESMA superfície; a paridade é verificada por
 * teste.
 */

function logoDirectory(): Directory {
  const directory = new Directory(Paths.document, LOGO_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/** Caminho relativo → URI utilizável para exibir e para decodificar no Skia. */
export function resolveLogoUri(path: string): string {
  return new File(Paths.document, path).uri;
}

/**
 * Prepara o arquivo escolhido e o guarda dentro do app.
 *
 * @returns o caminho relativo e a proporção **já recortada**, que é a que a
 *   geometria precisa conhecer.
 */
export async function persistLogo(
  sourceUri: string,
): Promise<{ path: string; aspect: number }> {
  const { bytes, aspect } = await prepareLogo(sourceUri);

  const fileName = `${Crypto.randomUUID()}.png`;
  const file = new File(logoDirectory(), fileName);
  file.create({ overwrite: true });
  file.write(bytes);

  return { path: `${LOGO_DIRECTORY_NAME}/${fileName}`, aspect };
}

/** Apaga o logotipo anterior quando outro toma o lugar dele. */
export function deleteLogo(path: string): void {
  if (!isManagedLogoPath(path)) return;

  try {
    const file = new File(Paths.document, path);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[marca] não foi possível apagar o logotipo anterior.', error);
  }
}
