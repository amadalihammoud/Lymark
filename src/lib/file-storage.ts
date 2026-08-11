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
/**
 * URLs de blob das fotos escolhidas nesta sessão.
 *
 * Object URL vive até ser revogado ou a aba fechar. A foto precisa continuar
 * legível enquanto estiver em uso — o preview a exibe, a exportação busca os
 * bytes dela, e o EXIF é lido dela. Revogar cedo demais entrega uma URI que
 * já não resolve.
 *
 * Guardamos apenas a última: ao escolher outra foto, a anterior deixou de ser
 * necessária e é liberada. Sem isso, cada escolha reteria o arquivo inteiro
 * em memória até a aba ser fechada.
 */
let pickedUrls: string[] = [];

function rememberPickedUrl(url: string) {
  for (const anterior of pickedUrls) URL.revokeObjectURL(anterior);
  pickedUrls = [url];
}

/** Guarda um conjunto de URLs (lote), liberando o conjunto anterior. */
function rememberPickedUrls(urls: string[]) {
  for (const anterior of pickedUrls) URL.revokeObjectURL(anterior);
  pickedUrls = urls;
}

/** Reduz um erro de origem desconhecida a texto exibível. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type PickResult =
  | { status: 'selected'; uri: string; width: number; height: number }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'failed'; error: unknown };

/**
 * Resultado de seleção de pasta.
 */
export type FolderResult =
  | { status: 'selected'; path: string }
  | { status: 'cancelled' }
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
  saveFileToOutput?: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<SaveResult>;
  deleteFile?: (path: string) => Promise<{ ok: boolean; error?: string }>;
  /** Grava no histórico do desktop, sem diálogo. */
  saveToGallery?: (
    bytes: Uint8Array,
    filename: string,
  ) => Promise<{ status: 'saved' | 'failed'; path?: string; error?: string }>;
  pickImage?: () => Promise<PickResult>;
  pickImages?: () => Promise<{ status: 'selected' | 'cancelled' | 'failed'; photos?: Array<{ uri: string; width: number; height: number }>; error?: string }>;
  selectOutputFolder?: () => Promise<FolderResult>;
  getOutputFolder?: () => Promise<{ path: string }>;
  // O preload já resolve o caminho em dimensões antes de chamar de volta, e
  // devolve `null` quando o arquivo não é uma imagem aceita. Esta declaração
  // dizia `filePath: string`, contradizendo o contrato real.
  onDragDrop?: (
    callback: (photo: { uri: string; width: number; height: number } | null) => void,
  ) => void;
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

/**
 * Salva um arquivo na pasta de saída (para processamento em lote).
 * No desktop, usa a API saveFileToOutput do IPC.
 */
export async function saveFileToOutput(
  bytes: Uint8Array,
  filename: string,
  mimeType: string = 'image/jpeg',
): Promise<SaveResult> {
  const platform = getExecutionPlatform();

  // Para desktop, usar a API específica do IPC
  if (platform === 'desktop') {
    if (typeof window !== 'undefined' && window.lymark?.saveFileToOutput) {
      try {
        const result = await window.lymark.saveFileToOutput(bytes, filename, mimeType);
        return result;
      } catch (error) {
        return { status: 'failed', error };
      }
    }
    // Fallback para saveFile se saveFileToOutput não estiver disponível
    return saveFile(bytes, filename, mimeType);
  }

  // Para web e mobile, usar saveFile normal
  return saveFile(bytes, filename, mimeType);
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

/**
 * Seleciona múltiplas imagens (para processamento em lote).
 */
export async function pickImages(): Promise<{ status: 'selected' | 'cancelled' | 'failed'; photos?: Array<{ uri: string; width: number; height: number }>; error?: string }> {
  const platform = getExecutionPlatform();

  switch (platform) {
    case 'web':
      return pickImagesWeb();
    case 'mobile': {
      // No mobile, não há suporte para múltipla seleção ainda
      const result = await pickImage();
      if (result.status === 'selected') {
        return { status: 'selected', photos: [{ uri: result.uri, width: result.width, height: result.height }] };
      }
      // `PickResult` tem um estado a mais ('denied') e carrega `error` como
      // `unknown`; aqui a superfície é mais estreita, então o desfecho é
      // reduzido e o erro vira texto.
      if (result.status === 'cancelled') return { status: 'cancelled' };
      return {
        status: 'failed',
        error: result.status === 'denied' ? 'Acesso às fotos negado.' : describeError(result.error),
      };
    }
    case 'desktop':
      return pickImagesDesktop();
    default:
      return { status: 'failed', error: `Plataforma desconhecida: ${platform}` };
  }
}

async function pickImageWeb(): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // `capture` NÃO entra aqui.
    //
    // Esta função atende só o botão "Escolher da galeria" — na web,
    // `takePhotoWithCamera` devolve erro, porque câmera não é implementada
    // nesta plataforma. Então `capture` não habilitava caminho nenhum.
    //
    // O que ele fazia era estragar: navegador de desktop ignora o atributo,
    // mas navegador de celular o obedece e abre a CÂMERA no lugar do seletor
    // de arquivos. No celular, "Escolher da galeria" não escolhia da galeria —
    // e escolher uma foto já tirada era impossível. O defeito é invisível no
    // desktop, que é onde se testa.
    //
    // Sem o atributo, o seletor do sistema aparece e no celular ele oferece
    // tanto a galeria quanto a câmera.

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        resolve({ status: 'cancelled' });
        return;
      }
      
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        // A URL NÃO é revogada aqui. Ela é justamente o que está sendo
        // devolvido: revogar na linha seguinte entregava uma URI já morta.
        // A imagem do preview funcionava porque o <img> já havia carregado,
        // mas a exportação, que busca os bytes depois, falhava com
        // "Failed to fetch" — e o app mostrava esse texto em inglês.
        //
        // Quem cria é quem libera, quando a foto é trocada.
        rememberPickedUrl(url);
        resolve({ status: 'selected', uri: url, width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        resolve({ status: 'failed', error: new Error('Falha ao carregar imagem') });
      };
      
      img.src = url;
    };
    
    input.click();
  });
}

async function pickImagesWeb(): Promise<{ status: 'selected' | 'cancelled' | 'failed'; photos?: Array<{ uri: string; width: number; height: number }>; error?: string }> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    // Sem `capture`, pelo mesmo motivo explicado em `pickImageWeb` — e aqui
    // ele era ainda mais contraditório, porque pedir a câmera num seletor
    // `multiple` é pedir várias fotos de uma vez a quem só tira uma.

    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      
      if (!files || files.length === 0) {
        resolve({ status: 'cancelled' });
        return;
      }
      
      const photos: Array<{ uri: string; width: number; height: number }> = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const img = new Image();
        
        await new Promise<void>((imgResolve) => {
          img.onload = () => {
            // Mesma razão do seletor de foto única: a URL devolvida precisa
            // continuar viva, senão o lote falha ao buscar os bytes de cada
            // arquivo. A liberação acontece na próxima escolha.
            photos.push({ uri: url, width: img.width, height: img.height });
            imgResolve();
          };

          img.onerror = () => {
            // Este arquivo não entra na lista, então a URL dele pode ir agora.
            URL.revokeObjectURL(url);
            imgResolve();
          };

          img.src = url;
        });
      }

      rememberPickedUrls(photos.map((p) => p.uri));
      resolve({ status: 'selected', photos });
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

async function pickImagesDesktop(): Promise<{ status: 'selected' | 'cancelled' | 'failed'; photos?: Array<{ uri: string; width: number; height: number }>; error?: string }> {
  if (typeof window !== 'undefined' && window.lymark?.pickImages) {
    try {
      const result = await window.lymark.pickImages();
      return result;
    } catch (error) {
      return { status: 'failed', error: describeError(error) };
    }
  }

  return { status: 'failed', error: 'IPC não disponível' };
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

/**
 * Seleciona pasta de saída (apenas desktop).
 */
export async function selectOutputFolder(): Promise<FolderResult> {
  const platform = getExecutionPlatform();

  if (platform !== 'desktop') {
    return { status: 'failed', error: new Error('Seleção de pasta só disponível no desktop') };
  }

  if (typeof window !== 'undefined' && window.lymark?.selectOutputFolder) {
    try {
      const result = await window.lymark.selectOutputFolder();
      return result;
    } catch (error) {
      return { status: 'failed', error };
    }
  }
  
  return { status: 'failed', error: new Error('IPC não disponível') };
}

/**
 * Obtém a pasta de saída atual (apenas desktop).
 */
export async function getOutputFolder(): Promise<string> {
  const platform = getExecutionPlatform();

  if (platform !== 'desktop') {
    return '';
  }

  if (typeof window !== 'undefined' && window.lymark?.getOutputFolder) {
    try {
      const result = await window.lymark.getOutputFolder();
      return result.path || '';
    } catch {
      return '';
    }
  }
  
  return '';
}
