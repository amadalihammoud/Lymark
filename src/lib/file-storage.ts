/**
 * Abstração de armazenamento de arquivos entre plataformas.
 */

import { Platform } from 'react-native';

/**
 * Resultado de uma operação de salvamento.
 */
export type SaveResult =
  | { status: 'saved'; path?: string }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

/**
 * Resultado de uma operação de seleção de arquivo.
 */
export type PickResult =
  | { status: 'selected'; uri: string; width: number; height: number }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

/**
 * Plataforma de execução.
 */
export type ExecutionPlatform = 'mobile' | 'web' | 'desktop';

/**
 * Tipo para o objeto lymark no window (Electron).
 */
export interface WindowLymark {
  platform: 'desktop';
  saveFile?: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<SaveResult>;
  pickImage?: () => Promise<PickResult>;
}

declare global {
  interface Window {
    lymark?: WindowLymark;
  }
}

/**
 * Detecta a plataforma de execução.
 */
export function getExecutionPlatform(): ExecutionPlatform {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.lymark?.platform === 'desktop') {
      return 'desktop';
    }
    return 'web';
  }
  return 'mobile';
}

export function isDesktop(): boolean {
  return getExecutionPlatform() === 'desktop';
}

export function isWeb(): boolean {
  return getExecutionPlatform() === 'web';
}

export function isMobile(): boolean {
  return getExecutionPlatform() === 'mobile';
}

/**
 * Salva um arquivo na plataforma atual.
 */
export async function saveFile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string = 'image/jpeg',
): Promise<SaveResult> {
  const platform = getExecutionPlatform();

  switch (platform) {
    case 'web':
      return saveFileWeb(bytes, filename, mimeType);
    case 'mobile':
      return saveFileMobile(bytes, filename, mimeType);
    case 'desktop':
      return saveFileDesktop(bytes, filename, mimeType);
    default:
      return { status: 'failed', error: new Error(`Plataforma desconhecida: ${platform}`) };
  }
}

function saveFileWeb(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): SaveResult {
  try {
    const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return { status: 'saved' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

async function saveFileMobile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<SaveResult> {
  try {
    const MediaLibrary = await import('expo-media-library');
    const FileSystem = await import('expo-file-system');
    
    // @ts-ignore - Acessando propriedade dinâmica do módulo nativo
    const tempPath = `${FileSystem.documentDirectory}${filename}`;
    const base64 = Buffer.from(bytes).toString('base64');
    
    // @ts-ignore - Chamada dinâmica do módulo nativo
    await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: 'base64' });
    
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) {
      return { status: 'denied' };
    }
    
    // @ts-ignore - Chamada dinâmica do módulo nativo
    await MediaLibrary.Asset.create(tempPath);
    // @ts-ignore - Chamada dinâmica do módulo nativo
    await FileSystem.deleteAsync(tempPath);
    
    return { status: 'saved' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

async function saveFileDesktop(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<SaveResult> {
  if (typeof window !== 'undefined' && window.lymark?.saveFile) {
    try {
      const result = await window.lymark.saveFile(bytes, filename, mimeType);
      return result;
    } catch (error) {
      return { status: 'failed', error };
    }
  }
  
  return { status: 'failed', error: new Error('IPC não disponível') };
}

/**
 * Seleciona um arquivo de imagem da plataforma atual.
 */
export async function pickImage(): Promise<PickResult> {
  const platform = getExecutionPlatform();

  switch (platform) {
    case 'web':
      return pickImageWeb();
    case 'mobile':
      return pickImageMobile();
    case 'desktop':
      return pickImageDesktop();
    default:
      return { status: 'failed', error: new Error(`Plataforma desconhecida: ${platform}`) };
  }
}

async function pickImageWeb(): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      
      if (!file) {
        resolve({ status: 'cancelled' });
        return;
      }
      
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        resolve({
          status: 'selected',
          uri: url,
          width: img.width,
          height: img.height,
        });
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        resolve({ status: 'failed', error: new Error('Falha ao carregar imagem') });
      };
      
      img.src = url;
    };
    
    input.click();
  });
}

async function pickImageMobile(): Promise<PickResult> {
  try {
    const ImagePicker = await import('expo-image-picker');
    const RN = await import('react-native');
    
    if (RN.Platform.OS === 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { status: 'denied' };
      }
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    
    if (result.canceled) {
      return { status: 'cancelled' };
    }
    
    const asset = result.assets?.[0];
    if (!asset) {
      return { status: 'cancelled' };
    }
    
    return {
      status: 'selected',
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    return { status: 'failed', error };
  }
}

async function pickImageDesktop(): Promise<PickResult> {
  if (typeof window !== 'undefined' && window.lymark?.pickImage) {
    try {
      const result = await window.lymark.pickImage();
      return result;
    } catch (error) {
      return { status: 'failed', error };
    }
  }
  
  return { status: 'failed', error: new Error('IPC não disponível') };
}
