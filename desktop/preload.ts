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
  onDragDrop: (callback: (photo: { uri: string; width: number; height: number } | null) => void) => void;
  // Clerk Authentication
  getClerkToken: () => Promise<{ token: string | null; error: string | null }>;
  verifyClerkToken: (token: string) => Promise<{ valid: boolean }>;
  signOut: () => Promise<{ success: boolean }>;
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

  onDragDrop: (callback) => {
    ipcRenderer.on('ondragdrop', (_, filePath: string) => {
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

  // Clerk Authentication
  getClerkToken: async () => {
    return ipcRenderer.invoke('clerk-get-token');
  },

  verifyClerkToken: async (token) => {
    return ipcRenderer.invoke('clerk-verify-token', { token });
  },

  signOut: async () => {
    return ipcRenderer.invoke('clerk-sign-out');
  },
};

// Expor para o window via contextBridge
contextBridge.exposeInMainWorld('lymark', lymarkApi);

// Expor Clerk para o window (opcional)
contextBridge.exposeInMainWorld('clerk', {
  getToken: lymarkApi.getClerkToken,
  verifyToken: lymarkApi.verifyClerkToken,
  signOut: lymarkApi.signOut,
});
