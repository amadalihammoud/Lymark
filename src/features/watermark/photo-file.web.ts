/**
 * Implementação para web e desktop (Electron).
 *
 * Na web: não há galeria (decisão 2.2) - as fotos são apenas baixadas.
 * No desktop: as fotos são salvas em pasta real no disco.
 *
 * Este módulo mantém a MESMA assinatura do photo-file.ts (nativo) para que
 * os consumidores não precisem saber a diferença.
 */

import * as Crypto from 'expo-crypto';

const EXPORTS_DIRECTORY_NAME = 'exports';

/** Nome de arquivo aceito: o que este módulo gera, e nada além disso. */
const FILE_NAME_PATTERN = /^[0-9a-fA-F-]+\.jpg$/;

/**
 * Um caminho é gerenciado por este módulo quando tem exatamente a forma
 * `exports/<nome>.jpg`.
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

/**
 * Na web e desktop, não há URI de arquivo no sentido mobile.
 * Retornamos a URI blob ou file:// diretamente.
 */
export function resolveExportedPhotoUri(path: string): string {
  // Na web/desktop, o path já é uma URI válida (blob: ou file://)
  return path;
}

/**
 * Verifica se estamos no desktop (Electron).
 * SOMENTE chamar dentro de funções, nunca no escopo do módulo.
 */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.lymark?.platform === 'desktop';
}

/**
 * Na web: não há persistência (decisão 2.2) - apenas retorna o path.
 * No desktop: salva em pasta real via IPC.
 *
 * @returns o caminho relativo (para compatibilidade com mobile)
 */
export async function persistExportedPhoto(temporaryUri: string): Promise<string> {
  // Gerar nome de arquivo
  const fileName = `${Crypto.randomUUID()}.jpg`;
  const relativePath = `${EXPORTS_DIRECTORY_NAME}/${fileName}`;

  // Na web: não faz nada (decisão 2.2 - não há galeria)
  // No desktop: salvar na pasta da galeria (sem diálogo)
  if (isDesktop() && typeof window !== 'undefined' && window.lymark?.saveFile) {
    const response = await fetch(temporaryUri);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await window.lymark.saveFile(bytes, fileName, 'image/jpeg');
  }

  return relativePath;
}

/**
 * Na web: não há arquivo para apagar (decisão 2.2 - não há galeria).
 * No desktop: apagar via IPC.
 *
 * Na web, esta função é um no-op justificado: não há galeria, não há arquivos
 * persistidos para apagar. No desktop, apaga o arquivo da pasta da galeria.
 */
export function deleteExportedPhoto(path: string): void {
  if (!isManagedPath(path)) return;

  // Na web: no-op - não há galeria, nada foi persistido, não há o que apagar
  if (typeof window === 'undefined') {
    return;
  }

  // No desktop: apagar via IPC
  if (isDesktop() && window.lymark?.deleteFile) {
    window.lymark.deleteFile(path);
  }
}

/**
 * Na web: salva e baixa o arquivo.
 * No desktop: salva na pasta da galeria (sem diálogo) e retorna o caminho.
 *
 * O caminho antigo movia um arquivo temporário produzido pela captura de tela.
 * A composição em resolução cheia devolve os bytes do JPEG direto da memória.
 */
export function writeExportedPhoto(bytes: Uint8Array): string {
  const fileName = `${Crypto.randomUUID()}.jpg`;
  const relativePath = `${EXPORTS_DIRECTORY_NAME}/${fileName}`;

  // Na web: trigger download
  if (typeof document !== 'undefined' && !isDesktop()) {
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // No desktop: salvar na pasta da galeria (sem diálogo)
  if (isDesktop() && typeof window !== 'undefined' && window.lymark?.saveFile) {
    window.lymark.saveFile(bytes, fileName, 'image/jpeg');
  }

  return relativePath;
}
