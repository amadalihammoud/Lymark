/**
 * O formato do caminho do logotipo — sem sistema de arquivos.
 *
 * Separado de `logo-file.ts` porque validar o formato de um caminho é lógica
 * pura, e quem precisa dela não deveria carregar o `expo-file-system` junto:
 * as preferências fazem a validação ao ler o disco, e os scripts de calibragem
 * rodam a geometria inteira no Node, fora do aparelho.
 */

export const LOGO_DIRECTORY_NAME = 'brand';

/** Só o que `logo-file.ts` gera. A extensão acompanha o arquivo escolhido. */
const FILE_NAME_PATTERN = /^[0-9a-fA-F-]+\.(png|jpg|jpeg|webp)$/i;

/**
 * Um caminho é gerido pelo app quando tem a forma `brand/<nome>.<ext>`.
 *
 * Lista de permissão, e não de proibição, pelo mesmo motivo das exportações: o
 * caminho vem de JSON no disco, que pode estar corrompido. Um valor arbitrário
 * chegando ao desenho faria o app ler um arquivo qualquer do aparelho e
 * carimbá-lo na foto que o técnico entrega ao cliente.
 */
export function isManagedLogoPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const segments = value.split('/');
  if (segments.length !== 2) return false;
  if (segments[0] !== LOGO_DIRECTORY_NAME) return false;

  return FILE_NAME_PATTERN.test(segments[1]);
}
