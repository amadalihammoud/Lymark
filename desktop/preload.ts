/**
 * Preload script do Electron.
 *
 * Este script é executado antes do renderer e expõe APIs seguras
 * para o contexto da página via contextBridge.
 *
 * NUNCA exponha: fs, child_process, ipcRenderer completo, etc.
 * Apenas exponha o que é estritamente necessário.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Tipos para as APIs expostas
export interface LymarkApi {
  platform: 'desktop';
  saveFile: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<{
    status: 'saved' | 'cancelled' | 'failed';
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
}

// Expor APIs seguras para o renderer
export const lymarkApi: LymarkApi = {
  platform: 'desktop',
  
  saveFile: async (bytes, filename, mimeType) => {
    return ipcRenderer.invoke('save-file', { bytes: Array.from(bytes), filename, mimeType });
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
};

// Expor para o window via contextBridge
contextBridge.exposeInMainWorld('lymark', lymarkApi);