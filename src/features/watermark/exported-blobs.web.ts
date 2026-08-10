/**
 * Registro das fotos geradas nesta sessão do navegador.
 *
 * Existe porque na web não há arquivo em disco para apontar: o caminho
 * lógico (`exports/<uuid>.jpg`) precisa de algo exibível por trás, e esse
 * algo é uma URL de blob que vive enquanto a aba viver — exatamente o
 * alcance do histórico na web, onde não há galeria persistente.
 *
 * Fica num módulo próprio, e não dentro de `photo-file.web.ts`, para não
 * acrescentar um export que o lado nativo não tem: os dois precisam expor a
 * mesma superfície, e o teste de paridade cobra isso.
 *
 * Sufixo `.web` porque só o bundle da web e do Electron o alcançam.
 */

const urls = new Map<string, string>();

export function rememberBlob(logicalPath: string, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  urls.set(logicalPath, url);
  return url;
}

export function blobUrlFor(logicalPath: string): string | undefined {
  return urls.get(logicalPath);
}

/** Libera a URL. É o equivalente honesto de apagar, já que não há arquivo. */
export function forgetBlob(logicalPath: string): void {
  const url = urls.get(logicalPath);
  if (!url) return;
  URL.revokeObjectURL(url);
  urls.delete(logicalPath);
}

/**
 * Dispara o download de uma foto já gerada.
 *
 * Separado da geração de propósito: escrever no disco do usuário é decisão
 * dele, tomada em "Salvar". Antes, gerar a foto já baixava o arquivo e o app
 * ainda perguntava depois se queria salvar.
 */
export function downloadBlob(logicalPath: string, fileName: string): boolean {
  const url = urls.get(logicalPath);
  if (!url || typeof document === 'undefined') return false;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
