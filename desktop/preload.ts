/**
 * Preload script do Electron.
 *
 * Este script é executado antes do renderer e expõe APIs seguras
 * para o contexto da página via contextBridge.
 *
 * NUNCA exponha: fs, child_process, ipcRenderer completo, etc.
 * Apenas exponha o que é estritamente necessário.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Tipos para as APIs expostas
export interface LymarkApi {
  platform: 'desktop';
  saveFile: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<{
    status: 'saved' | 'cancelled' | 'failed';
    path?: string;
    error?: string;
  }>;
  /** Grava no histórico do desktop, sem diálogo. Devolve o nome do arquivo. */
  saveToGallery: (bytes: Uint8Array, filename: string) => Promise<{
    status: 'saved' | 'failed';
    path?: string;
    error?: string;
  }>;
  saveFileToOutput: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<{
    status: 'saved' | 'failed';
    path?: string;
    error?: string;
  }>;
  deleteFile: (path: string) => Promise<{ ok: boolean; error?: string }>;
  pickImage: () => Promise<{
    status: 'selected' | 'cancelled' | 'failed';
    uri?: string;
    width?: number;
    height?: number;
    error?: string;
  }>;
  pickImages: () => Promise<{
    status: 'selected' | 'cancelled' | 'failed';
    photos?: Array<{ uri: string; width: number; height: number }>;
    error?: string;
  }>;
  selectOutputFolder: () => Promise<{
    status: 'selected' | 'cancelled';
    path?: string;
    error?: string;
  }>;
  getOutputFolder: () => Promise<{ path: string }>;
  /** Informa ao processo principal o idioma escolhido na interface. */
  setLocale: (locale: string) => Promise<{ ok: boolean }>;
  /** Rotas pedidas pelo menu do sistema. */
  onNavigate: (callback: (route: string) => void) => void;
  /** Abre uma página da conta (login ou exclusão) no navegador do sistema. */
  openAccountPage: (page?: 'login' | 'delete') => Promise<{ ok: boolean }>;
  /** Seleciona um vídeo e devolve dimensões, duração e data do arquivo. */
  pickVideo: () => Promise<{
    status: 'selected' | 'cancelled' | 'failed';
    path?: string;
    name?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    modifiedMs?: number;
    error?: string;
  }>;
  /** Compõe o carimbo (PNG do tamanho do quadro) sobre o vídeo, via ffmpeg. */
  watermarkVideo: (
    videoPath: string,
    overlay: Uint8Array,
    durationMs: number,
  ) => Promise<{ status: 'saved' | 'cancelled' | 'failed'; path?: string; error?: string }>;
  /** Progresso da composição do vídeo, em porcentagem inteira. */
  onVideoProgress: (callback: (percent: number) => void) => void;
  /** SHA-256 (base64url) de um arquivo de vídeo, por stream. */
  hashVideoFile: (path: string) => Promise<{ status: 'ok' | 'failed'; hash?: string }>;
  /** Anexa a caixa do selo de autenticidade ao fim do vídeo. */
  sealVideo: (path: string, receipt: string) => Promise<{ ok: boolean }>;
  /** Imprime o HTML do relatório em PDF e pergunta onde salvar. */
  exportReportPdf: (
    html: string,
    filename: string,
    norm: 'abnt' | 'iso' | 'letter' | 'din5008' | 'ibape',
    pageWord: string,
  ) => Promise<{ status: 'saved' | 'cancelled' | 'failed'; path?: string; error?: string }>;
  /** Empacota relatório em PDF + fotos originais num ZIP e pergunta onde salvar. */
  exportProjectZip: (
    html: string,
    filename: string,
    norm: 'abnt' | 'iso' | 'letter' | 'din5008' | 'ibape',
    pageWord: string,
    photoNames: string[],
    reportName: string,
  ) => Promise<{ status: 'saved' | 'cancelled' | 'failed'; path?: string; error?: string }>;
  /** Token do desktop chegando pelo deep link `lymark://login`. */
  onLoginToken: (callback: (token: string) => void) => void;
  onDragDrop: (callback: (photo: { uri: string; width: number; height: number } | null) => void) => void;
}

// Expor APIs seguras para o renderer
export const lymarkApi: LymarkApi = {
  platform: 'desktop',
  
  saveFile: async (bytes, filename, mimeType) => {
    return ipcRenderer.invoke('save-file', { bytes: Array.from(bytes), filename, mimeType });
  },
  
  saveToGallery: async (bytes, filename) => {
    return ipcRenderer.invoke('save-to-gallery', { bytes: Array.from(bytes), filename });
  },

  saveFileToOutput: async (bytes, filename, mimeType) => {
    return ipcRenderer.invoke('save-file-to-output', { bytes: Array.from(bytes), filename, mimeType });
  },
  
  deleteFile: async (path) => {
    return ipcRenderer.invoke('delete-file', { path });
  },
  
  pickImage: async () => {
    return ipcRenderer.invoke('pick-image');
  },
  
  pickImages: async () => {
    return ipcRenderer.invoke('pick-images');
  },
  
  selectOutputFolder: async () => {
    return ipcRenderer.invoke('select-output-folder');
  },
  
  getOutputFolder: async () => {
    return ipcRenderer.invoke('get-output-folder');
  },

  setLocale: async (locale) => {
    return ipcRenderer.invoke('set-locale', { locale });
  },

  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_, route: string) => callback(route));
  },

  openAccountPage: async (page) => {
    return ipcRenderer.invoke('open-account-page', { page });
  },

  pickVideo: async () => {
    return ipcRenderer.invoke('pick-video');
  },

  watermarkVideo: async (videoPath, overlay, durationMs) => {
    return ipcRenderer.invoke('watermark-video', {
      path: videoPath,
      overlay: Array.from(overlay),
      durationMs,
    });
  },

  onVideoProgress: (callback) => {
    ipcRenderer.on('video-progress', (_, percent: number) => callback(percent));
  },

  hashVideoFile: async (path) => {
    return ipcRenderer.invoke('hash-video-file', { path });
  },

  sealVideo: async (path, receipt) => {
    return ipcRenderer.invoke('seal-video', { path, receipt });
  },

  exportReportPdf: async (html, filename, norm, pageWord) => {
    return ipcRenderer.invoke('export-report-pdf', { html, filename, norm, pageWord });
  },

  exportProjectZip: async (html, filename, norm, pageWord, photoNames, reportName) => {
    return ipcRenderer.invoke('export-project-zip', {
      html,
      filename,
      norm,
      pageWord,
      photoNames,
      reportName,
    });
  },

  onLoginToken: (callback) => {
    ipcRenderer.on('login-token', (_, token: string) => callback(token));
  },
  
  onDragDrop: (callback) => {
    // Escutar o evento do main process
    ipcRenderer.on('ondragdrop', (_, filePath: string) => {
      // Processar o arquivo arrastado e chamar o callback
      ipcRenderer.invoke('add-drag-drop-file', { filePath })
        .then((photo) => {
          if (photo) {
            callback(photo);
          }
        })
        .catch(() => {
          callback(null);
        });
    });
  },
};

// Expor para o window via contextBridge
contextBridge.exposeInMainWorld('lymark', lymarkApi);
