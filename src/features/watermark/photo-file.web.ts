/**
 * Implementação para web e desktop (Electron).
 *
 * Na web: não há galeria (decisão 2.2) - as fotos são apenas baixadas.
 * No desktop: as fotos são salvas em pasta real no disco.
 *
 * Este módulo mantém a MESMA assinatura do photo-file.ts (nativo) para que
 * os consumidores não precisem saber a diferença.
 */

import { blobUrlFor, forgetBlob, rememberBlob } from './exported-blobs.web';

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

// O registro das URLs de blob vive em `exported-blobs.web.ts`. Mantê-lo aqui
// obrigaria a exportar funções que o lado nativo não tem, e a paridade de
// superfície entre `.ts` e `.web.ts` é verificada por teste.

/**
 * Converte o caminho lógico em algo exibível.
 *
 * Este é o contrato que o nativo cumpre com `new File(Paths.document, path).uri`
 * e que a versão web não cumpria: ela devolvia `exports/<uuid>.jpg` como se
 * fosse URI. Todo consumidor — o cartão da galeria, a tela da foto — recebia
 * um caminho relativo e não conseguia carregar nada.
 */
export function resolveExportedPhotoUri(path: string): string {
  if (!isManagedPath(path)) return path;

  // No desktop o arquivo existe no disco, e a janela roda sobre `app://`.
  // O esquema `media://` é servido pelo processo principal a partir da pasta
  // da galeria — `file://` seria bloqueado pela política de origem.
  if (isDesktop()) return `media://gallery/${path.split('/')[1]}`;

  return blobUrlFor(path) ?? '';
}

/**
 * Verifica se estamos no desktop (Electron).
 * SOMENTE chamar dentro de funções, nunca no escopo do módulo.
 */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.lymark?.platform === 'desktop';
}

/**
 * Gera UUID usando crypto do navegador ou fallback.
 * expo-crypto NÃO funciona na web - usar crypto.randomUUID nativo.
 */
function randomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para Node (harness)
  // @ts-ignore - crypto existe no Node
  if (typeof require !== 'undefined') {
    const { randomUUID } = require('crypto');
    return randomUUID();
  }
  // Fallback final (não deve acontecer)
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Na web: não há persistência (decisão 2.2) - apenas retorna o path.
 * No desktop: salva em pasta real via IPC.
 *
 * @returns o caminho relativo (para compatibilidade com mobile)
 */
export async function persistExportedPhoto(temporaryUri: string): Promise<string> {
  // Já é uma foto do app: nada a mover, e refazer o arquivo criaria um órfão.
  if (isManagedPath(temporaryUri)) return temporaryUri;

  const response = await fetch(temporaryUri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return writeExportedPhoto(bytes);
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
  if (typeof window === 'undefined') return;

  if (isDesktop() && window.lymark?.deleteFile) {
    void window.lymark.deleteFile(path.split('/')[1]);
    return;
  }

  // Na web não há arquivo em disco, mas há o blob desta sessão: liberar é o
  // equivalente honesto de apagar, e sem isso a memória cresce a cada foto.
  forgetBlob(path);
}

/**
 * Guarda a foto e devolve o caminho lógico — nunca uma URI.
 *
 * Quem quiser exibir chama `resolveExportedPhotoUri`. Manter as duas coisas
 * separadas é o que faz esta implementação cumprir o mesmo contrato do
 * nativo; misturá-las foi a origem da galeria com imagens quebradas.
 *
 * A gravação NÃO acontece aqui: escrever é decisão do usuário, tomada em
 * "Salvar". Antes, gerar a foto já disparava um download na web e um diálogo
 * no desktop, e depois o app ainda perguntava se queria salvar.
 */
export function writeExportedPhoto(bytes: Uint8Array): string {
  const fileName = `${randomUUID()}.jpg`;
  const relativePath = `${EXPORTS_DIRECTORY_NAME}/${fileName}`;

  if (isDesktop() && typeof window !== 'undefined' && window.lymark?.saveToGallery) {
    // No desktop existe histórico em pasta real, então a foto é gravada assim
    // que nasce — o mesmo comportamento do celular.
    void window.lymark.saveToGallery(bytes, fileName);
    return relativePath;
  }

  if (typeof URL !== 'undefined' && typeof Blob !== 'undefined') {
    // Sem revogação por temporizador: a URL vive enquanto a entrada existir, e
    // `deleteExportedPhoto` é quem a libera. O `setTimeout(1000)` anterior
    // matava a imagem depois de um segundo, ou vazava se ninguém a usasse.
    rememberBlob(relativePath, new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' }));
  }

  return relativePath;
}