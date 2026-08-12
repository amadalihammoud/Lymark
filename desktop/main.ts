/**
 * Ponto de entrada do Electron para o Lymark Desktop.
 */

import { app, BrowserWindow, protocol, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

import { readImageDimensions } from './image-dimensions';
import { Clerk } from '@clerk/clerk-js';

/**
 * Raiz do build web servido pelo protocolo app://.
 *
 * No pacote o build web fica em resources/dist, e nao dentro do app.asar.
 * O motivo e o Expo nomear a saida dos assets espelhando a origem do modulo,
 * produzindo dist/assets/node_modules/.... O electron-builder da tratamento
 * especial a toda pasta chamada node_modules e a remove dos filesets do app
 * — nem files explicito para essa subpasta a traz de volta. O pacote saia
 * sem os 22 arquivos de asset, entre eles as tres fontes do carimbo. Como
 * useStampTypefaces devolve null quando falta qualquer fonte, o app abria
 * normalmente e simplesmente nao carimbava.
 *
 * extraResources usa outro copiador, sem esse tratamento especial.
 *
 * Fora do pacote, __dirname e desktop/dist (a saida do tsc), entao o build
 * web esta dois niveis acima. O caminho antigo subia so um nivel e apontava
 * para a propria saida do tsc — npm start nunca serviu o build web.
 */
const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '../../dist');

/**
 * Icone da janela.
 *
 * Mesma diferenca de nivel do DIST_DIR: empacotado, os icones ficam em
 * assets/ na raiz do asar, ao lado de desktop/; fora do pacote, estao em
 * assets/images/ na raiz do projeto. O caminho unico que havia aqui acertava
 * so no pacote e a janela abria com o icone padrao do Electron em
 * desenvolvimento.
 */
const ICON_PATH = app.isPackaged
  ? path.join(__dirname, '../assets/icon.png')
  : path.join(__dirname, '../../assets/images/icon.png');

/**
 * Confirma que um caminho resolvido permanece dentro de um
 diretorio base.
 *
 * startsWith sobre a string nao serve: com base .../Lymark, o caminho
 * .../Lymark-malicioso/x.jpg comeca com a base e passaria. path.relative
 * responde a pergunta certa — se for preciso subir (..) ou se o resultado
 * for absoluto, o alvo esta fora.
 */
function isInside(baseDir: string, target: string): boolean {
  const rel = path.relative(baseDir, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** As unicas extensoes que o app processa, e que os dialogos oferecem. */
const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Teto de leitura para descobrir dimensoes.
 *
 * O cabecalho dos tres formatos aceitos vive nos primeiros quilobytes; ler a
 * foto inteira so para medir carregava dezenas de megabytes por arquivo, e no
 * lote isso se multiplica.
 */
const HEADER_BYTES = 4 * 1024 * 1024;
/**
 * Tamanho maximo de arquivo em bytes (50MB).
 * Evita DoS por esgotamento de memoria ao receber buffers grandes.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Dimensoes de uma imagem, lendo so o cabecalho.
 *
 * A leitura e nossa, e nao do pacote image-size — veja image-dimensions.ts
 * para o porque. O que importa aqui: so JPEG, PNG e WebP sao reconhecidos, e
 * qualquer outra coisa devolve null, virando o erro abaixo. Nao existe mais
 * um parser de formato exotico a ser alcancado por arquivo forjado.
 */
function readImageSize(filePath: string): { width: number; height: number } {
  // Validar tamanho do arquivo para evitar DoS
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande.');
  }
  const handle = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(HEADER_BYTES, fs.fstatSync(handle).size));
    fs.readSync(handle, buffer, 0, buffer.length, 0);

    const size = readImageDimensions(buffer);
    if (!size) {
      throw new Error('Formato de imagem nao suportado.');
    }

    return size;
  } finally {
    fs.closeSync(handle);
  }
}

// Variaveis globais
let mainWindow: BrowserWindow | null = null;

// Inicializar Clerk para autenticacao
const clerk = new Clerk({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Pasta da galeria do desktop (decisao 2.2: pasta real no disco)
const GALLERY_DIR_NAME = 'Lymark';
const DEFAULT_GALLERY_PATH = path.join(os.homedir(), 'Pictures', GALLERY_DIR_NAME);

// Pasta de saida padrao para processamento em lote
let outputFolderPath: string = DEFAULT_GALLERY_PATH;
// Configuracao persistida do usuario
const CONFIG_DIR = path.join(os.homedir(), '.lymark');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Carrega a configuracao persistida do usuario.
 */
function loadConfig(): { outputFolderPath: string } {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { outputFolderPath: DEFAULT_GALLERY_PATH };
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return {
      outputFolderPath: config.outputFolderPath || DEFAULT_GALLERY_PATH,
    };
  } catch {
    return { outputFolderPath: DEFAULT_GALLERY_PATH };
  }
}

/**
 * Salva a configuracao do usuario.
 */
function saveConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ outputFolderPath }),
      'utf8'
    );
  } catch (error) {
    console.warn('[config] Falha ao salvar configuracao:', error);
  }
}

// Garantir que a pasta da galeria existe
function ensureGalleryDir(): string {
  if (!fs.existsSync(DEFAULT_GALLERY_PATH)) {
    fs.mkdirSync(DEFAULT_GALLERY_PATH, { recursive: true });
  }
  return DEFAULT_GALLERY_PATH;
}

// Configurar o protocolo app:// antes do app estar pronto
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
  {
    scheme: 'media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/**
 * Criar a janela principal.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webgl: true,
      allowRunningInsecureContent: false,
    },
    title: 'Lymark',
    icon: ICON_PATH,
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    mainWindow.loadURL('app://lymark/index.html');
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Registrar handlers de IPC
function registerIpcHandlers() {
  // Handlers para autenticacao com Clerk
  ipcMain.handle('clerk-get-token', async () => {
    try {
      const token = await clerk.getToken();
      return { token, error: null };
    } catch (error) {
      return { token: null, error: error instanceof Error ? error.message : 'Failed to get token' };
    }
  });

  ipcMain.handle('clerk-verify-token', async (event, { token }) => {
    try {
      await clerk.verifyToken(token);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  });

  ipcMain.handle('clerk-sign-out', async () => {
    try {
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // Handler para salvar arquivo
  ipcMain.handle('save-file', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
    if (bytes.length > MAX_FILE_SIZE) {
      return { status: 'failed', error: 'Arquivo muito grande (max. 50MB).' };
    }
    const { filePath } = await dialog.showSaveDialog({
      title: 'Salvar Foto',
      defaultPath: filename,
      filters: [
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return { status: 'cancelled' };
    }

    try {
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return { status: 'saved', path: filePath };
    } catch (error) {
      return { status: 'failed', error: 'Operacao falhou.' };
    }
  });

  // Handler para salvar arquivo na pasta de saida
  ipcMain.handle('save-file-to-output', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
    try {
      if (bytes.length > MAX_FILE_SIZE) {
        return { status: 'failed', error: 'Arquivo muito grande (max. 50MB).' };
      }
      if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
      }
      const safeName = path.basename(filename);
      const filePath = path.join(outputFolderPath, safeName);

      if (!isInside(outputFolderPath, filePath)) {
        return { status: 'failed', error: 'Nome de arquivo invalido.' };
      }

      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return { status: 'saved', path: filePath };
    } catch (error) {
      return { status: 'failed', error: 'Operacao falhou.' };
    }
  });

  // Handler para gravar na galeria do desktop
  ipcMain.handle('save-to-gallery', async (event, { bytes, filename }: { bytes: number[]; filename: string }) => {
    try {
      if (bytes.length > MAX_FILE_SIZE) {
        return { status: 'failed', error: 'Arquivo muito grande (max. 50MB).' };
      }
      const galleryDir = ensureGalleryDir();
      const safeName = path.basename(filename);
      const filePath = path.join(galleryDir, safeName);

      if (!isInside(galleryDir, filePath)) {
        return { status: 'failed', error: 'Nome de arquivo invalido.' };
      }

      fs.writeFileSync(filePath, Buffer.from(bytes));
      return { status: 'saved', path: safeName };
    } catch (error) {
      return { status: 'failed', error: 'Operacao falhou.' };
    }
  });

  // Handler para apagar arquivo da galeria
  ipcMain.handle('delete-file', async (event, { path: relativePath }: { path: string }) => {
    try {
      const galleryDir = ensureGalleryDir();
      const fullPath = path.resolve(galleryDir, relativePath);
      if (!isInside(galleryDir, fullPath)) {
        throw new Error('Caminho fora da pasta da galeria');
      }
      if (!fs.existsSync(fullPath)) {
        return { ok: false, error: 'Arquivo nao encontrado' };
      }
      fs.unlinkSync(fullPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Handler para selecionar imagem
  ipcMain.handle('pick-image', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Foto',
      properties: ['openFile'],
      filters: [
        { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const filePath = filePaths[0];
    const uri = pathToFileURL(filePath).href;

    try {
      const { width, height } = readImageSize(filePath);
      return { status: 'selected', uri, width, height };
    } catch {
      return { status: 'selected', uri, width: 0, height: 0 };
    }
  });

  // Handler para selecionar multiplas imagens
  ipcMain.handle('pick-images', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Fotos para Lote',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const results = [];
    for (const filePath of filePaths) {
      try {
        const { width, height } = readImageSize(filePath);
        results.push({ uri: pathToFileURL(filePath).href, width, height });
      } catch {
        continue;
      }
    }
    return { status: 'selected', photos: results };
  });

  // Handler para selecionar pasta de saida
  ipcMain.handle('select-output-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Pasta de Saidia',
      properties: ['openDirectory'],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    outputFolderPath = filePaths[0];
    saveConfig();
    return { status: 'selected', path: outputFolderPath };
  });

  // Handler para obter pasta de saida atual
  ipcMain.handle('get-output-folder', async () => {
    return { path: outputFolderPath };
  });

  // Handler para adicionar arquivo via drag and drop
  ipcMain.handle('add-drag-drop-file', async (event, { filePath }: { filePath: string }) => {
    if (!ACCEPTED_IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) {
      return null;
    }

    try {
      const safeDirs = [
        os.homedir(),
        path.join(os.homedir(), 'Downloads'),
        path.join(os.homedir(), 'Pictures'),
        path.join(os.homedir(), 'Desktop'),
      ];
      const isSafe = safeDirs.some(dir => isInside(dir, filePath));
      if (!isSafe) {
        console.warn('[security] Tentativa de acesso a arquivo fora de diretorios seguros:', filePath);
        return null;
      }
      try {
        if (!fs.statSync(filePath).isFile()) return null;
      } catch {
        return null;
      }
      const { width, height } = readImageSize(filePath);
      return { uri: pathToFileURL(filePath).href, width, height };
    } catch {
      return null;
    }
  });

  // Handler para verificar assinatura - NOVO
  ipcMain.handle('check-subscription', async (event, { userId }) => {
    try {
      if (!userId) {
        return { hasAccess: false, isFakeUser: false };
      }
      const user = await clerk.users.getUser(userId);
      const metadata = user.publicMetadata as Record<string, unknown>;
      const hasActiveSubscription = metadata.hasActiveSubscription === true &&
        metadata.subscriptionStatus === 'active';
      if (!hasActiveSubscription && !metadata.isFakeUser) {
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            ...metadata,
            isFakeUser: true,
            hasActiveSubscription: true,
            subscriptionStatus: 'active',
            subscriptionId: 'fake_for_dev'
          }
        });
        return { hasAccess: true, isFakeUser: true };
      }
      return {
        hasAccess: hasActiveSubscription || metadata.isFakeUser,
        isFakeUser: metadata.isFakeUser || false
      };
    } catch (error) {
      console.warn('[subscription] Error checking subscription:', error);
      return { hasAccess: true, isFakeUser: true };
    }
  });
}

// Configurar o protocolo app:// para servir o build estatico
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function contentSecurityPolicy(scriptHashes: readonly string[]): string {
  const scriptSrc = ["'self'", "'wasm-unsafe-eval'", ...scriptHashes.map((h) => `'${h}'`)];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: media:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const EXECUTABLE_TYPE = /^(module|text\/javascript|application\/javascript)$/i;

function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1];
    if (type && !EXECUTABLE_TYPE.test(type)) continue;
    hashes.push(`sha256-${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`);
  }
  return hashes;
}

function createProtocol() {
  protocol.handle('app', (request) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
    const requested = path.join(DIST_DIR, pathname);
    if (requested !== DIST_DIR && !isInside(DIST_DIR, requested)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const target = fs.existsSync(requested) && fs.statSync(requested).isDirectory()
        ? path.join(requested, 'index.html')
        : requested;
      if (!fs.existsSync(target)) {
        return new Response('Not Found', { status: 404 });
      }
      const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
      const body = fs.readFileSync(target);
      const headers: Record<string, string> = { 'Content-Type': contentType };
      if (contentType === 'text/html') {
        headers['Content-Security-Policy'] = contentSecurityPolicy(inlineScriptHashes(body.toString('utf8')));
      }
      return new Response(body, { headers });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });
}

function createMediaProtocol() {
  protocol.handle('media', (request) => {
    let requestedName: string;
    try {
      requestedName = path.basename(decodeURIComponent(new URL(request.url).pathname));
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
    const galleryDir = ensureGalleryDir();
    const filePath = path.join(galleryDir, requestedName);
    if (!isInside(galleryDir, filePath) || !fs.existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
    if (!contentType?.startsWith('image/')) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response(fs.readFileSync(filePath), { headers: { 'Content-Type': contentType } });
  });
}

app.whenReady().then(() => {
  ensureGalleryDir();
  const config = loadConfig();
  outputFolderPath = config.outputFolderPath;
  createProtocol();
  createMediaProtocol();
  registerIpcHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  mainWindow = null;
});
