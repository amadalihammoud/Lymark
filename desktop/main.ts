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
import { DEFAULT_LOCALE, availableLocales, translate } from './i18n';
import { buildApplicationMenu } from './menu';

/**
 * Raiz do build web servido pelo protocolo `app://`.
 *
 * No pacote o build web fica em `resources/dist`, e não dentro do `app.asar`.
 * O motivo é o Expo nomear a saída dos assets espelhando a origem do módulo,
 * produzindo `dist/assets/node_modules/…`. O electron-builder dá tratamento
 * especial a toda pasta chamada `node_modules` e a remove dos filesets do app
 * — nem `files` explícito para essa subpasta a traz de volta. O pacote saía
 * sem os 22 arquivos de asset, entre eles as três fontes do carimbo. Como
 * `useStampTypefaces` devolve `null` quando falta qualquer fonte, o app abria
 * normalmente e simplesmente não carimbava.
 *
 * `extraResources` usa outro copiador, sem esse tratamento especial.
 *
 * Fora do pacote, `__dirname` é `desktop/dist` (a saída do tsc), então o build
 * web está dois níveis acima. O caminho antigo subia só um nível e apontava
 * para a própria saída do tsc — `npm start` nunca serviu o build web.
 */
const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '../../dist');

/**
 * Ícone da janela.
 *
 * Mesma diferença de nível do `DIST_DIR`: empacotado, os ícones ficam em
 * `assets/` na raiz do asar, ao lado de `desktop/`; fora do pacote, estão em
 * `assets/images/` na raiz do projeto. O caminho único que havia aqui acertava
 * só no pacote e a janela abria com o ícone padrão do Electron em
 * desenvolvimento.
 */
const ICON_PATH = app.isPackaged
  ? path.join(__dirname, '../assets/icon.png')
  : path.join(__dirname, '../../assets/images/icon.png');

/**
 * Confirma que um caminho resolvido permanece dentro de um diretório base.
 *
 * `startsWith` sobre a string não serve: com base `.../Lymark`, o caminho
 * `.../Lymark-malicioso/x.jpg` começa com a base e passaria. `path.relative`
 * responde a pergunta certa — se for preciso subir (`..`) ou se o resultado
 * for absoluto, o alvo está fora.
 */
function isInside(baseDir: string, target: string): boolean {
  const rel = path.relative(baseDir, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** As únicas extensões que o app processa, e que os diálogos oferecem. */
const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Teto de leitura para descobrir dimensões.
 *
 * O cabeçalho dos três formatos aceitos vive nos primeiros quilobytes; ler a
 * foto inteira só para medir carregava dezenas de megabytes por arquivo, e no
 * lote isso se multiplica.
 */
const HEADER_BYTES = 4 * 1024 * 1024;
/**
 * Tamanho máximo de arquivo em bytes (50MB).
 * Evita DoS por esgotamento de memória ao receber buffers grandes.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Dimensões de uma imagem, lendo só o cabeçalho.
 *
 * A leitura é nossa, e não do pacote `image-size` — veja `image-dimensions.ts`
 * para o porquê. O que importa aqui: só JPEG, PNG e WebP são reconhecidos, e
 * qualquer outra coisa devolve `null`, virando o erro abaixo. Não existe mais
 * um parser de formato exótico a ser alcançado por arquivo forjado.
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
      throw new Error('Formato de imagem não suportado.');
    }

    return size;
  } finally {
    fs.closeSync(handle);
  }
}

// Variáveis globais
let mainWindow: BrowserWindow | null = null;

/**
 * O idioma do menu e dos diálogos.
 *
 * Guardado aqui porque o processo principal precisa dele **antes** de a
 * página existir: o menu é montado na inicialização, e esperar o renderer
 * responder faria o menu piscar em português no primeiro instante para
 * quem usa o app em outro idioma.
 */
let currentLocale: string = DEFAULT_LOCALE;

// Pasta da galeria do desktop (decisão 2.2: pasta real no disco)
const GALLERY_DIR_NAME = 'Lymark';
const DEFAULT_GALLERY_PATH = path.join(os.homedir(), 'Pictures', GALLERY_DIR_NAME);

// Pasta de saída padrão para processamento em lote
let outputFolderPath: string = DEFAULT_GALLERY_PATH;
// Configuração persistida do usuário
const CONFIG_DIR = path.join(os.homedir(), '.lymark');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Carrega a configuração persistida do usuário.
 */
function loadConfig(): { outputFolderPath: string; locale: string } {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { outputFolderPath: DEFAULT_GALLERY_PATH, locale: systemLocale() };
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return {
      outputFolderPath: config.outputFolderPath || DEFAULT_GALLERY_PATH,
      locale: isKnownLocale(config.locale) ? config.locale : systemLocale(),
    };
  } catch {
    return { outputFolderPath: DEFAULT_GALLERY_PATH, locale: systemLocale() };
  }
}

/**
 * O idioma do sistema, reduzido ao que o catálogo tem.
 *
 * `app.getLocale()` devolve etiquetas completas — `pt-BR`, `zh-Hans-CN`. A
 * comparação usa só a parte primária, pela mesma razão do aplicativo: não
 * existem catálogos por região, e aproximar é melhor do que cair no padrão.
 */
function systemLocale(): string {
  const primary = app.getLocale().split(/[-_]/)[0]?.toLowerCase() ?? '';
  return isKnownLocale(primary) ? primary : DEFAULT_LOCALE;
}

function isKnownLocale(value: unknown): value is string {
  return typeof value === 'string' && availableLocales().includes(value);
}

/**
 * Salva a configuração do usuário.
 */
function saveConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ outputFolderPath, locale: currentLocale }),
      'utf8'
    );
  } catch (error) {
    console.warn('[config] Falha ao salvar configuração:', error);
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
  // Esquema separado só para as fotos da galeria. A janela roda sobre
  // `app://`, e com `webSecurity` ligado uma origem dessas não carrega
  // `file://` — sem isto, a galeria do desktop exibiria imagens quebradas.
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

  // O sinalizador de plataforma NÃO é injetado aqui. O preload já expõe
  // `window.lymark.platform` pelo contextBridge, que cria a propriedade como
  // somente-leitura — reatribuir por executeJavaScript não teria efeito, ou
  // sobrescreveria a ponte. Havia ainda uma corrida: `did-finish-load` chega
  // depois de o módulo do app já ter lido o sinalizador.

  // Nenhuma navegação para fora do app. Sem isto, uma URL externa carregaria
  // NESTA janela, com o preload anexado — dando à página remota acesso a
  // saveFile, deleteFile e aos seletores de arquivo.
  //
  // O evento é de `webContents`, não de `BrowserWindow`: a versão anterior
  // registrava em `mainWindow`, que não emite `will-navigate`, então a
  // proteção existia no código e nunca era executada.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) event.preventDefault();
  });

  // Janela nova (window.open, target=_blank) é sempre negada. Se um dia for
  // preciso abrir um link, o certo é entregar ao navegador do sistema com
  // shell.openExternal, nunca abrir uma BrowserWindow com preload.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Carregar o app. O protocolo já foi registrado em `whenReady`; registrar
  // de novo aqui lançava "Attempted to register a second handler for 'app'".
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
  /**
   * O idioma escolhido na interface, informado pelo renderer.
   *
   * A escolha vive na página — é lá que está a tela de idiomas e o
   * armazenamento do aplicativo. O processo principal só precisa saber para
   * refazer o menu e traduzir os diálogos de arquivo, e guarda o valor para
   * já abrir certo na próxima execução.
   */
  ipcMain.handle('set-locale', (_event, { locale }: { locale: unknown }) => {
    if (!isKnownLocale(locale) || locale === currentLocale) return { ok: true };

    currentLocale = locale;
    saveConfig();
    buildApplicationMenu(currentLocale, mainWindow);
    return { ok: true };
  });

  // Handler para salvar arquivo (diálogo de salvamento)
  ipcMain.handle('save-file', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
    // Validar tamanho do buffer para evitar DoS
    if (bytes.length > MAX_FILE_SIZE) {
      return { status: 'failed', error: 'Arquivo muito grande (máx. 50MB).' };
    }
    const { filePath } = await dialog.showSaveDialog({
      title: translate(currentLocale, 'desktop.dialog.savePhoto'),
      defaultPath: filename,
      filters: [
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: translate(currentLocale, 'desktop.dialog.allFiles'), extensions: ['*'] },
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
      return { status: 'failed', error: 'Operação falhou.' };
    }
  });

  // Handler para salvar arquivo na pasta de saída (sem diálogo)
  ipcMain.handle('save-file-to-output', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
    try {
      // Validar tamanho do buffer para evitar DoS
      if (bytes.length > MAX_FILE_SIZE) {
        return { status: 'failed', error: 'Arquivo muito grande (máx. 50MB).' };
      }
      // Garantir que a pasta de saída existe
      if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
      }
      
      // O nome vem do renderer. Sem reduzi-lo ao último segmento, um
      // "../../.bashrc" ou "..\\Startup\\x.exe" sairia da pasta de saída e
      // gravaria em qualquer lugar do disco — este handler grava SEM diálogo,
      // então não há confirmação do usuário no caminho.
      const safeName = path.basename(filename);
      const filePath = path.join(outputFolderPath, safeName);

      if (!isInside(outputFolderPath, filePath)) {
        return { status: 'failed', error: 'Nome de arquivo inválido.' };
      }

      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return { status: 'saved', path: filePath };
    } catch (error) {
      return { status: 'failed', error: 'Operação falhou.' };
    }
  });

  // Handler para gravar na galeria do desktop, SEM diálogo.
  //
  // O `save-file` abre um seletor a cada chamada, o que serve para "exportar
  // para outro lugar" mas não para "guardar no histórico": a captura avulsa
  // grava sozinha, como no celular.
  ipcMain.handle('save-to-gallery', async (event, { bytes, filename }: { bytes: number[]; filename: string }) => {
    try {
      // Validar tamanho do buffer para evitar DoS
      if (bytes.length > MAX_FILE_SIZE) {
        return { status: 'failed', error: 'Arquivo muito grande (máx. 50MB).' };
      }
      const galleryDir = ensureGalleryDir();
      const safeName = path.basename(filename);
      const filePath = path.join(galleryDir, safeName);

      if (!isInside(galleryDir, filePath)) {
        return { status: 'failed', error: 'Nome de arquivo inválido.' };
      }

      fs.writeFileSync(filePath, Buffer.from(bytes));
      return { status: 'saved', path: safeName };
    } catch (error) {
      return { status: 'failed', error: 'Operação falhou.' };
    }
  });

  // Handler para apagar arquivo da galeria
  // SÓ apaga arquivos dentro da pasta da galeria (segurança)
  ipcMain.handle('delete-file', async (event, { path: relativePath }: { path: string }) => {
    try {
      // Resolver o caminho absoluto
      const galleryDir = ensureGalleryDir();
      const fullPath = path.resolve(galleryDir, relativePath);
      
      // Esta checagem já foi corrigida uma vez (commit 29adb69) e voltou ao
      // estado vulnerável quando o arquivo foi reescrito por inteiro. Se
      // reaparecer um `startsWith` aqui, é regressão — não simplificação.
      if (!isInside(galleryDir, fullPath)) {
        throw new Error('Caminho fora da pasta da galeria');
      }
      
      // Verificar que o arquivo existe
      if (!fs.existsSync(fullPath)) {
        return { ok: false, error: 'Arquivo não encontrado' };
      }
      
      // Apagar o arquivo
      fs.unlinkSync(fullPath);
      return { ok: true };
    } catch (error) {
      return { 
        ok: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  // Handler para selecionar imagem
  ipcMain.handle('pick-image', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: translate(currentLocale, 'desktop.dialog.pickPhoto'),
      properties: ['openFile'],
      filters: [
        { name: translate(currentLocale, 'desktop.dialog.images'), extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: translate(currentLocale, 'desktop.dialog.allFiles'), extensions: ['*'] },
      ],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const filePath = filePaths[0];
    // `file://` + caminho cru produz URI inválida no Windows: barras
    // invertidas, sem a terceira barra, e espaço ou `#` no nome quebram tudo.
    // `pathToFileURL` codifica corretamente nas três plataformas.
    const uri = pathToFileURL(filePath).href;

    try {
      const { width, height } = readImageSize(filePath);
      return { status: 'selected', uri, width, height };
    } catch {
      return { status: 'selected', uri, width: 0, height: 0 };
    }
  });

  // Handler para selecionar múltiplas imagens (processamento em lote)
  ipcMain.handle('pick-images', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: translate(currentLocale, 'desktop.dialog.pickPhotos'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: translate(currentLocale, 'desktop.dialog.images'), extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: translate(currentLocale, 'desktop.dialog.allFiles'), extensions: ['*'] },
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
        // Um arquivo ilegível não pode derrubar o lote inteiro.
        continue;
      }
    }

    return { status: 'selected', photos: results };
  });

  // Handler para selecionar pasta de saída
  ipcMain.handle('select-output-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: translate(currentLocale, 'desktop.dialog.pickFolder'),
      properties: ['openDirectory'],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    outputFolderPath = filePaths[0];
    saveConfig();
    return { status: 'selected', path: outputFolderPath };
  });

  // Handler para obter pasta de saída atual
  ipcMain.handle('get-output-folder', async () => {
    return { path: outputFolderPath };
  });

  // Handler para adicionar arquivo via drag and drop
  ipcMain.handle('add-drag-drop-file', async (event, { filePath }: { filePath: string }) => {
    // O caminho vem do renderer, não de um diálogo do sistema. Aceitar
    // qualquer um daria ao renderer um primitivo de leitura de arquivo
    // arbitrário. Restringimos ao que o app sabe processar e exigimos
    // arquivo comum — o mesmo conjunto de extensões dos diálogos.
    if (!ACCEPTED_IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) {
      return null;
    }

    try {
      // Validar que o arquivo está em um diretório seguro (evita path traversal)
      const safeDirs = [
        os.homedir(),
        path.join(os.homedir(), 'Downloads'),
        path.join(os.homedir(), 'Pictures'),
        path.join(os.homedir(), 'Desktop'),
      ];
      const isSafe = safeDirs.some(dir => isInside(dir, filePath));
      if (!isSafe) {
        console.warn('[security] Tentativa de acesso a arquivo fora de diretórios seguros:', filePath);
        return null;
      }
      try {
      if (!fs.statSync(filePath).isFile()) return null;
    } catch {
      return null; // Arquivo não existe ou não é acessível
    }
      const { width, height } = readImageSize(filePath);
      return { uri: pathToFileURL(filePath).href, width, height };
    } catch {
      return null;
    }
  });
}

// Configurar o protocolo app:// para servir o build estático
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  // Sem este, `WebAssembly.instantiateStreaming` recusa o CanvasKit e o
  // carimbo nunca é desenhado no desktop.
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Política de conteúdo do aplicativo empacotado.
 *
 * Tudo vem do próprio pacote; nada é buscado na rede. `wasm-unsafe-eval` é
 * exigido pelo CanvasKit, `unsafe-inline` em estilos pelo react-native-web,
 * que injeta as folhas em tempo de execução, e `blob:`/`data:` pelas imagens
 * que o app gera em memória.
 *
 * `scriptHashes` cobre os scripts embutidos no HTML que o Expo gera — veja
 * `inlineScriptHashes`.
 */
function contentSecurityPolicy(scriptHashes: readonly string[]): string {
  const scriptSrc = ["'self'", "'wasm-unsafe-eval'", ...scriptHashes.map((h) => `'${h}'`)];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    // `media:` é o esquema das fotos da galeria, servido por createMediaProtocol.
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

/**
 * Autoriza, por hash, os scripts embutidos no HTML exportado pelo Expo.
 *
 * O `index.html` do Expo traz um script inline que inicializa o roteador. Sem
 * autorização ele é bloqueado e o aplicativo abre em tela branca — foi o que
 * acontecia no pacote antes desta função.
 *
 * O hash é calculado ao servir, e não fixado no código, porque o conteúdo do
 * script muda a cada build do bundle. Um valor fixo passaria a bloquear o
 * script na primeira recompilação, e o sintoma — tela branca — não aponta para
 * a causa. Calcular aqui mantém `script-src` restrito sem exigir manutenção.
 *
 * Isto não afrouxa a política: o hash cobre exatamente os bytes que acabaram
 * de ser lidos de dentro do pacote, que é somente leitura. Um script injetado
 * depois, em tempo de execução, continua sem hash e continua bloqueado.
 */
function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];

  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    // Script externo já é coberto por 'self'; hash nem se aplicaria.
    if (/\bsrc\s*=/i.test(attrs)) continue;

    // `type="application/json"` e afins carregam dados, não executam. Emitir
    // hash para eles só aumentaria o cabeçalho.
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1];
    if (type && !EXECUTABLE_TYPE.test(type)) continue;

    hashes.push(`sha256-${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`);
  }

  return hashes;
}

function createProtocol() {
  protocol.handle('app', (request) => {
    // `new URL` em vez de manipular a string: a versão anterior fazia
    // `replace('app:///', '')` enquanto a janela carregava `app://./…` — com
    // duas barras, não três. O replace não casava, o caminho resultante era
    // literalmente "app:/…" e nada era encontrado.
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const requested = path.join(DIST_DIR, pathname);

    // O handler nunca deve servir nada fora do build. A normalização de
    // segmentos que o Chromium faz em esquemas `standard` já barra o caso
    // óbvio, mas depender disso é apoiar a segurança num detalhe implícito
    // do navegador em vez de numa verificação nossa.
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

      const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()]
        ?? 'application/octet-stream';

      const body = fs.readFileSync(target);

      const headers: Record<string, string> = { 'Content-Type': contentType };
      if (contentType === 'text/html') {
        headers['Content-Security-Policy'] =
          contentSecurityPolicy(inlineScriptHashes(body.toString('utf8')));
      }

      return new Response(body, { headers });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });
}

/**
 * Serve as fotos da galeria para a janela.
 *
 * Aceita apenas o nome do arquivo, nunca um caminho: o renderer não escolhe
 * diretório. A contenção é conferida de novo aqui, e não só na origem do
 * nome, porque este handler responde a qualquer URL que a página pedir.
 */
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

    return new Response(fs.readFileSync(filePath), {
      headers: { 'Content-Type': contentType },
    });
  });
}

// App pronto
app.whenReady().then(() => {
  // Garantir que a pasta da galeria existe
  ensureGalleryDir();
  // Carregar configuração persistida
  const config = loadConfig();
  outputFolderPath = config.outputFolderPath;
  currentLocale = config.locale;

  // Configurar o protocolo
  createProtocol();
  createMediaProtocol();
  
  // Registrar handlers de IPC
  registerIpcHandlers();
  
  // Criar janela
  createWindow();

  // Depois da janela: os itens do menu precisam de alguém para quem navegar.
  buildApplicationMenu(currentLocale, mainWindow);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  mainWindow = null;
});
