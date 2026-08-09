/**
 * Implementação para web e desktop (Electron).
 *
 * Na web: não há galeria (decisão 2.2) - apenas download.
 * No desktop: salva em pasta real via IPC.
 *
 * Este módulo mantém a mesma assinatura do export-photo.ts (nativo) para que
 * os consumidores não precisem saber a diferença.
 */

// Re-exportar os tipos para manter compatibilidade
export type SaveOutcome =
  | { status: 'saved' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

export type ShareOutcome =
  | { status: 'shared' }
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/**
 * Verifica se estamos no desktop (Electron).
 * SOMENTE chamar dentro de funções, nunca no escopo do módulo.
 */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.lymark?.platform === 'desktop';
}

/**
 * Copia a imagem para a galeria do aparelho.
 *
 * Na web: não há galeria (decisão 2.2) - apenas download.
 * No desktop: salva na pasta da galeria (~/Pictures/Lymark).
 * No mobile: usa expo-media-library (implementação no .ts)
 */
export async function saveToDeviceGallery(path: string): Promise<SaveOutcome> {
  // Na web: download
  if (typeof document !== 'undefined' && !isDesktop()) {
    try {
      const response = await fetch(path);
      const bytes = new Uint8Array(await response.arrayBuffer());
      
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = path.split('/').pop() || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return { status: 'saved' };
    } catch (error) {
      return { status: 'failed', error };
    }
  }

  // No desktop: salvar na pasta da galeria (sem diálogo)
  if (isDesktop() && typeof window !== 'undefined' && window.lymark?.saveFile) {
    try {
      const response = await fetch(path);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const fileName = path.split('/').pop() || 'photo.jpg';
      await window.lymark.saveFile(bytes, fileName, 'image/jpeg');
      return { status: 'saved' };
    } catch (error) {
      return { status: 'failed', error };
    }
  }

  // Fallback: não implementado para esta plataforma
  return { status: 'failed', error: new Error('Salvamento não implementado para esta plataforma') };
}

/**
 * Abre a folha de compartilhamento do sistema.
 *
 * Na web: usa Web Share API ou fallback para download.
 * No desktop: não implementado (pode usar clipboard no futuro).
 * No mobile: usa Sharing.shareAsync (implementação no .ts)
 */
export async function shareWatermarkedPhoto(path: string): Promise<ShareOutcome> {
  // Na web: Web Share API
  if (typeof navigator !== 'undefined' && !isDesktop() && navigator.share) {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      const file = new File([blob], path.split('/').pop() || 'photo.jpg', { type: 'image/jpeg' });
      
      await navigator.share({
        title: 'Foto com marca d’água',
        files: [file],
      });
      
      return { status: 'shared' };
    } catch (error) {
      // Web Share API pode falhar se não há app para compartilhar
      if (error instanceof Error && error.name === 'AbortError') {
        return { status: 'unavailable' };
      }
      return { status: 'failed', error };
    }
  }

  // No desktop: não implementado
  if (isDesktop()) {
    return { status: 'unavailable' };
  }

  // Fallback: não implementado
  return { status: 'unavailable' };
}
