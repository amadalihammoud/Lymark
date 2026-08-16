import { LogoError, prepareLogo } from './logo-image';
import { LOGO_DIRECTORY_NAME, isManagedLogoPath } from './logo-path';

export { LogoError };

/**
 * Onde o logotipo da empresa mora na web e no desktop.
 *
 * Não há `expo-file-system` fora do aparelho, e o padrão do projeto é o par
 * `.ts` / `.web.ts` com a MESMA superfície (ver `photo-file.web.ts`). Aqui o
 * PNG já preparado vai para o `localStorage`, como data URL, sob o mesmo
 * caminho lógico `brand/<uuid>.png` que o nativo grava em disco — assim as
 * preferências guardadas são idênticas nas três plataformas e a validação de
 * `isManagedLogoPath` continua valendo.
 *
 * `localStorage`, e não IndexedDB, por tamanho: o arquivo é limitado a 1024 px
 * no lado maior e sai como PNG de algumas centenas de KB no pior caso — longe
 * dos 5 MB do armazenamento simples, e sem obrigar o preparo do carimbo a
 * esperar uma transação assíncrona. No Electron o `localStorage` persiste na
 * pasta de dados do usuário, como qualquer outra preferência.
 */

const STORAGE_PREFIX = 'lymark.brand.logo:';

/** Caminho lógico → data URL guardada. Vazio quando o registro sumiu. */
export function resolveLogoUri(path: string): string {
  if (!isManagedLogoPath(path)) return '';
  try {
    return globalThis.localStorage?.getItem(STORAGE_PREFIX + path) ?? '';
  } catch {
    return '';
  }
}

export async function persistLogo(
  sourceUri: string,
): Promise<{ path: string; aspect: number }> {
  const { bytes, aspect } = await prepareLogo(sourceUri);

  const path = `${LOGO_DIRECTORY_NAME}/${globalThis.crypto.randomUUID()}.png`;
  const dataUrl = `data:image/png;base64,${toBase64(bytes)}`;

  try {
    globalThis.localStorage.setItem(STORAGE_PREFIX + path, dataUrl);
  } catch (error) {
    // Cota estourada ou armazenamento bloqueado (navegação privada em alguns
    // navegadores). É a mesma falha que a tela já trata para o nativo.
    throw new LogoError('Não foi possível guardar o logotipo neste navegador.', {
      cause: error,
    });
  }

  return { path, aspect };
}

export function deleteLogo(path: string): void {
  if (!isManagedLogoPath(path)) return;
  try {
    globalThis.localStorage?.removeItem(STORAGE_PREFIX + path);
  } catch (error) {
    console.warn('[marca] não foi possível apagar o logotipo anterior.', error);
  }
}

/**
 * `btoa` recebe uma string de bytes; converter tudo de uma vez com
 * `String.fromCharCode(...bytes)` estoura a pilha em arquivos de algumas
 * centenas de KB. Por isso os pedaços.
 */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
