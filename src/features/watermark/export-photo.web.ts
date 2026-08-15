/**
 * Implementação para web e desktop (Electron).
 *
 * Na web: não há galeria (decisão 2.2) - apenas download.
 * No desktop: salva em pasta real via IPC.
 *
 * Este módulo mantém a mesma assinatura do export-photo.ts (nativo) para que
 * os consumidores não precisem saber a diferença.
 */

import { blobUrlFor, downloadBlob } from './exported-blobs.web';

// Re-exportar os tipos para manter compatibilidade
export type SaveOutcome =
  | { status: 'saved' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

export type ShareOutcome =
  | { status: 'shared' }
  /** O usuário fechou a folha de compartilhamento. Não é falha. */
  | { status: 'cancelled' }
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
  // `path` é um identificador lógico (`exports/<uuid>.jpg`), NÃO uma URI.
  // A versão anterior fazia `fetch(path)` nele: resolvia contra a origem da
  // página, dava 404, e o app informava "o aparelho recusou gravá-la,
  // verifique o espaço livre" logo depois de um download bem-sucedido.
  const fileName = path.split('/').pop() ?? 'lymark.jpg';

  if (isDesktop()) {
    // No desktop a foto já foi gravada na pasta da galeria quando nasceu,
    // sem diálogo. Não há segunda gravação a fazer.
    return { status: 'saved' };
  }

  return downloadBlob(path, fileName)
    ? { status: 'saved' }
    : {
        status: 'failed',
        error: new Error('A foto não está mais disponível nesta sessão.'),
      };
}

/**
 * Abre a folha de compartilhamento do sistema.
 *
 * Na web: usa Web Share API ou fallback para download.
 * No desktop: não implementado (pode usar clipboard no futuro).
 * No mobile: usa Sharing.shareAsync (implementação no .ts)
 */
/**
 * Os rótulos chegam por parâmetro, e não do catálogo aqui dentro: esta função
 * não é um componente React, então não pode chamar `useTranslations`. Quem a
 * chama é uma tela, e telas têm acesso ao idioma corrente.
 */
export type ShareLabels = {
  /** O que está sendo compartilhado. */
  title: string;
  /** O cabeçalho da folha de compartilhamento do sistema. */
  dialogTitle: string;
};

export async function shareWatermarkedPhoto(
  path: string,
  labels: ShareLabels,
): Promise<ShareOutcome> {
  const fileName = path.split('/').pop() ?? 'lymark.jpg';
  const blobUrl = blobUrlFor(path);

  if (typeof navigator !== 'undefined' && !isDesktop() && navigator.share && blobUrl) {
    try {
      // O blob desta sessão, e não `fetch(path)`: `path` é identificador
      // lógico e a busca dava 404.
      const blob = await (await fetch(blobUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // `share` existir não significa que ARQUIVO possa ser compartilhado —
      // é justamente o caso comum em navegador de desktop. Sem esta pergunta,
      // o caminho entrava e falhava.
      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
        return { status: 'unavailable' };
      }

      await navigator.share({ title: labels.title, files: [file] });
      return { status: 'shared' };
    } catch (error) {
      // `AbortError` é o usuário fechando a folha de compartilhamento. Tratar
      // isso como "indisponível" fazia o app anunciar uma falha do sistema
      // para uma escolha deliberada de quem usa.
      if (error instanceof Error && error.name === 'AbortError') {
        return { status: 'cancelled' };
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
