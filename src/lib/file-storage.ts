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
/**
 * Limpa todas as URLs de blob e revoga as referências.
 * Deve ser chamado em casos de erro ou cancelamento para evitar memory leaks.
 */
export function clearPickedUrls(): void {
  for (const url of pickedUrls) {
    URL.revokeObjectURL(url);
  }
  pickedUrls = [];
}


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
  /**
   * Informa ao Electron o idioma escolhido na interface, para o menu do
   * sistema e os diálogos de arquivo acompanharem.
   */
  setLocale?: (locale: string) => Promise<{ ok: boolean }>;
  /** Rotas pedidas pelo menu do sistema. */
  onNavigate?: (callback: (route: string) => void) => void;
  /** Abre uma página da conta (login ou exclusão) no navegador do sistema. */
  openAccountPage?: (page?: 'login' | 'delete') => Promise<{ ok: boolean }>;
  /** Token do desktop chegando pelo deep link `lymark://login`. */
  onLoginToken?: (callback: (token: string) => void) => void;
  /** Seleciona um vídeo e devolve dimensões, duração e data do arquivo. */
  pickVideo?: () => Promise<{
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
  watermarkVideo?: (
    videoPath: string,
    overlay: Uint8Array,
    durationMs: number,
  ) => Promise<{ status: 'saved' | 'cancelled' | 'failed'; path?: string; error?: string }>;
  /**
   * Progresso da composição do vídeo, em porcentagem inteira. Devolve a
   * função que cancela a inscrição — a tela a chama ao desmontar.
   */
  onVideoProgress?: (callback: (percent: number) => void) => (() => void) | void;
  /** SHA-256 (base64url) de um arquivo de vídeo, por stream. */
  hashVideoFile?: (path: string) => Promise<{ status: 'ok' | 'failed'; hash?: string }>;
  /** Anexa a caixa do selo de autenticidade ao fim do vídeo. */
  sealVideo?: (path: string, receipt: string) => Promise<{ ok: boolean }>;
  /** Empacota relatório em PDF + fotos originais num ZIP e pergunta onde salvar. */
  exportProjectZip?: (
    html: string,
    filename: string,
    norm: 'abnt' | 'iso' | 'letter' | 'din5008' | 'ibape',
    pageWord: string,
    photoNames: string[],
    reportName: string,
  ) => Promise<{
    status: 'saved' | 'cancelled' | 'failed';
    path?: string;
    error?: string;
    /** Quantas fotos do relatório não estavam no disco e ficaram de fora. */
    missing?: number;
  }>;
  /** Imprime o HTML do relatório em PDF e pergunta onde salvar. */
  exportReportPdf?: (
    html: string,
    filename: string,
    norm: 'abnt' | 'iso' | 'letter' | 'din5008' | 'ibape',
    pageWord: string,
  ) => Promise<{ status: 'saved' | 'cancelled' | 'failed'; path?: string; error?: string }>;
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

/** De onde a foto vem. */
export type PhotoSource = 'library' | 'camera';

/**
 * Há câmera alcançável nesta plataforma?
 *
 * `isMobile()` responde "app nativo", não "celular" — num telefone acessando
 * pelo navegador a plataforma é `web`. Era essa confusão que deixava o botão
 * "Tirar foto" cair direto no erro em qualquer navegador, inclusive o do
 * celular, onde a câmera está a um atributo de distância.
 *
 * No navegador, quem abre a câmera é o atributo `capture` do input de arquivo,
 * e ele só é honrado onde existe câmera embutida. `pointer: coarse` é o sinal
 * disponível para isso: telefone e tablet casam, desktop não. Num desktop com
 * tela sensível ao toque o palpite erra, e o resultado é o seletor de arquivos
 * comum — degrada, não quebra.
 *
 * No Electron devolve `false` porque não há implementação de câmera lá; mais
 * honesto esconder o botão do que oferecer um que sempre falha.
 */
export function canUseDeviceCamera(): boolean {
  const platform = getExecutionPlatform();

  if (platform === 'mobile') return true;
  if (platform === 'desktop') return false;

  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * Seleciona um arquivo de imagem da plataforma atual.
 */
export async function pickImage(source: PhotoSource = 'library'): Promise<PickResult> {
  const platform = getExecutionPlatform();

  switch (platform) {
    case 'web':
      return pickImageWeb(source);
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

/**
 * Avisa quando o usuário fecha o seletor de arquivos sem escolher nada.
 *
 * O `change` **não** dispara ao cancelar. Sem isto, a promessa do seletor
 * ficava pendente para sempre — e a consequência não era só um `await` órfão:
 * a tela liga `picking` antes de esperar e só desliga no `finally`, que nunca
 * chegava. Cancelar o diálogo uma única vez deixava os dois botões de foto
 * mortos até recarregar a página.
 *
 * `cancel` resolve nos navegadores atuais. O retorno do foco cobre os que não
 * o implementam (Safari anterior ao 16.4): se a janela recupera o foco e o
 * input continua sem arquivo, o diálogo foi fechado sem escolha. A espera
 * existe porque o foco volta **antes** de o `change` ser entregue — sem ela,
 * uma escolha legítima seria declarada cancelamento.
 *
 * Devolve a função que encerra a vigilância, para quem resolveu primeiro.
 */
function watchDialogDismissal(input: HTMLInputElement, dismissed: () => void): () => void {
  let watching = true;

  const stop = () => {
    watching = false;
    input.removeEventListener('cancel', onCancel);
    window.removeEventListener('focus', onFocus);
  };

  const onCancel = () => {
    if (watching) dismissed();
  };

  const onFocus = () => {
    window.setTimeout(() => {
      if (watching && (input.files?.length ?? 0) === 0) dismissed();
    }, 500);
  };

  input.addEventListener('cancel', onCancel);
  window.addEventListener('focus', onFocus);

  return stop;
}

async function pickImageWeb(source: PhotoSource = 'library'): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // `capture` é o que decide entre câmera e galeria no navegador do celular,
    // e por isso depende de qual botão chamou.
    //
    // Ele já esteve aqui de forma incondicional, e o efeito era o inverso do
    // pretendido: o desktop ignora o atributo, mas o celular o obedece e abre
    // a CÂMERA. "Escolher da galeria" não escolhia da galeria, e usar uma foto
    // já tirada era impossível — defeito invisível no desktop, que é onde se
    // testa.
    if (source === 'camera') {
      input.capture = 'environment';
    }

    let settled = false;
    let stopWatching = () => {};

    // Um único ponto de saída: cancelar e escolher são caminhos concorrentes,
    // e o primeiro a chegar precisa desarmar o outro.
    const settle = (result: PickResult) => {
      if (settled) return;
      settled = true;
      stopWatching();
      resolve(result);
    };

    stopWatching = watchDialogDismissal(input, () => settle({ status: 'cancelled' }));

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        settle({ status: 'cancelled' });
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
        settle({ status: 'selected', uri: url, width: img.width, height: img.height });
      };

      img.onerror = () => {
        settle({ status: 'failed', error: new Error('Falha ao carregar imagem') });
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

    // Mesma vigilância de cancelamento do seletor de foto única, e pelo mesmo
    // motivo: sem ela, fechar o diálogo travava o lote para sempre.
    type BatchResult = Awaited<ReturnType<typeof pickImagesWeb>>;

    let settled = false;
    let stopWatching = () => {};

    const settle = (result: BatchResult) => {
      if (settled) return;
      settled = true;
      stopWatching();
      resolve(result);
    };

    stopWatching = watchDialogDismissal(input, () => settle({ status: 'cancelled' }));

    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;

      if (!files || files.length === 0) {
        settle({ status: 'cancelled' });
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
      settle({ status: 'selected', photos });
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
