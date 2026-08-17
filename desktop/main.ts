/**
 * Ponto de entrada do Electron para o Lymark Desktop.
 */

import { app, BrowserWindow, protocol, ipcMain, dialog, shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

import { readImageDimensions } from './image-dimensions';
import {
  pendingReportHtml,
  renderReportPdf,
  REPORT_NORMS,
  type ReportNorm,
} from './report-pdf';
import { displayDimensions } from './video-rotation';
import { appendSealBox, hashFileSha256 } from './video-seal';
import { buildZip, type ZipEntry } from './zip';
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
 * sem os 22 arquivos de asset, entre eles as fontes do carimbo. Como
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
  // O documento do relatório, servido à janela oculta que o imprime em PDF.
  // Precisa ser `standard`/`secure` pela mesma razão do `media`: é dele que
  // as fotos (`media://`) são carregadas com `webSecurity` ligado.
  {
    scheme: 'report',
    privileges: { standard: true, secure: true },
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

  // Token de login que chegou antes de a página carregar: entregue agora,
  // quando o renderer já tem quem escute (`onLoginToken` no preload).
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow) flushPendingLoginToken(mainWindow.webContents);
  });

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
  /**
   * Abre uma página da conta no navegador do sistema — de uma lista fechada.
   *
   * Allowlist de propósito: um handler que abrisse qualquer URL vinda do
   * renderer daria à página, em caso de comprometimento, um caminho para
   * lançar links arbitrários no navegador da pessoa. `delete` existe porque
   * as lojas exigem exclusão de conta acionável de dentro do aplicativo.
   */
  ipcMain.handle('open-account-page', async (_event, args?: { page?: unknown }) => {
    const deleting = args?.page === 'delete';
    const url = deleting ? 'https://lymark.app/conta/excluir' : ACCOUNT_HANDOFF_URL;
    // Abrir o login é o que autoriza a volta pelo deep link (ver
    // `deliverLoginToken`): sem um pedido recente, nenhum token é aceito.
    if (!deleting) loginRequestedAt = Date.now();
    await shell.openExternal(url);
    return { ok: true };
  });

  // Seletor de vídeo, com sondagem já embutida: o renderer precisa das
  // dimensões para desenhar o carimbo no tamanho do quadro, e da data de
  // modificação para preencher data e hora como o lote faz com o EXIF.
  ipcMain.handle('pick-video', async () => {
    if (!mainWindow) return { status: 'cancelled' };
    const picked = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Vídeos', extensions: VIDEO_EXTENSIONS }],
    });
    if (picked.canceled || picked.filePaths.length === 0) return { status: 'cancelled' };

    const filePath = picked.filePaths[0];
    try {
      const info = await probeVideo(filePath);
      const stat = fs.statSync(filePath);
      // A escolha do usuário é o que AUTORIZA este caminho nos handlers de
      // vídeo (ver `allowVideoPath`): sem isto, eles aceitariam qualquer
      // caminho do disco vindo do renderer.
      allowVideoPath(filePath);
      return {
        status: 'selected',
        path: filePath,
        name: path.basename(filePath),
        width: info.width,
        height: info.height,
        durationMs: info.durationMs,
        modifiedMs: stat.mtimeMs,
      };
    } catch {
      return { status: 'failed', error: 'O arquivo não pôde ser lido como vídeo.' };
    }
  });

  /**
   * Compõe o carimbo sobre o vídeo, quadro a quadro, com o ffmpeg.
   *
   * O overlay chega pronto do renderer — um PNG transparente do tamanho
   * exato do quadro, desenhado pelo MESMO código do carimbo da foto — e o
   * ffmpeg só o sobrepõe em (0,0). O áudio é copiado sem reencodar; o vídeo
   * sai em H.264 com `faststart`, o arranjo que abre em qualquer lugar.
   *
   * O progresso vai por evento: o stderr do ffmpeg publica `time=` conforme
   * avança, e a duração veio da sondagem.
   */
  ipcMain.handle(
    'watermark-video',
    async (
      event,
      {
        path: inputPath,
        overlay,
        durationMs,
      }: { path: string; overlay: number[]; durationMs: number },
    ) => {
      // Só um vídeo que o usuário escolheu no diálogo — o ffmpeg lê o
      // arquivo e grava o resultado numa pasta alcançável pelo renderer.
      if (!isAuthorizedVideoPath(inputPath) || !Array.isArray(overlay) || overlay.length === 0) {
        return { status: 'failed', error: 'Pedido inválido.' };
      }

      // Saída: a pasta configurada do lote, ou um diálogo de salvar.
      const baseName = path.basename(inputPath).replace(/\.[^.]+$/, '');
      const fileName = `lymark_${baseName}.mp4`;
      let outputPath: string;
      if (outputFolderPath && fs.existsSync(outputFolderPath)) {
        outputPath = path.join(outputFolderPath, fileName);
      } else {
        if (!mainWindow) return { status: 'failed', error: 'Sem janela para o diálogo.' };
        const saved = await dialog.showSaveDialog(mainWindow, { defaultPath: fileName });
        if (saved.canceled || !saved.filePath) return { status: 'cancelled' };
        outputPath = saved.filePath;
      }

      const overlayPath = path.join(
        os.tmpdir(),
        `lymark-stamp-${crypto.randomBytes(6).toString('hex')}.png`,
      );
      fs.writeFileSync(overlayPath, Buffer.from(overlay));

      return new Promise((resolve) => {
        const child = spawn(ffmpegPath(), [
          '-y',
          '-i', inputPath,
          '-i', overlayPath,
          '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto[v]',
          '-map', '[v]',
          '-map', '0:a?',
          '-c:a', 'copy',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-map_metadata', '0',
          outputPath,
        ]);

        let stderr = '';
        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          stderr += text;
          const at = /time=(\d+):(\d\d):(\d\d(?:\.\d+)?)/.exec(text);
          if (at && durationMs > 0) {
            const elapsedMs =
              (Number(at[1]) * 3600 + Number(at[2]) * 60 + Number(at[3])) * 1000;
            event.sender.send(
              'video-progress',
              Math.min(99, Math.round((elapsedMs / durationMs) * 100)),
            );
          }
        });

        const cleanup = () => {
          try {
            fs.unlinkSync(overlayPath);
          } catch {
            // O temporário órfão não muda o resultado.
          }
        };

        child.on('error', (error) => {
          cleanup();
          resolve({ status: 'failed', error: String(error) });
        });
        child.on('close', (code) => {
          cleanup();
          if (code === 0) {
            event.sender.send('video-progress', 100);
            // O arquivo que acabamos de gravar é o próximo a ser hasheado e
            // selado pelo renderer — autorizado por termos sido nós a criá-lo.
            allowVideoPath(outputPath);
            resolve({ status: 'saved', path: outputPath });
          } else {
            // A última linha do stderr é onde o ffmpeg diz o motivo.
            const reason = stderr.trim().split('\n').pop() ?? 'ffmpeg falhou';
            resolve({ status: 'failed', error: reason });
          }
        });
      });
    },
  );

  /**
   * As duas metades do selo de vídeo (`docs/AUTENTICIDADE.md`): o hash por
   * stream antes do recibo, o append da caixa `lymk` depois dele. O recibo
   * em si é pedido pelo renderer, que é quem tem o token da sessão.
   */
  ipcMain.handle('hash-video-file', async (_event, { path: filePath }: { path: string }) => {
    try {
      // Sem a autorização, isto seria um oráculo de hash sobre qualquer
      // arquivo do disco — inclusive chaves e documentos fora do app.
      if (!isAuthorizedVideoPath(filePath)) return { status: 'failed' };
      return { status: 'ok', hash: await hashFileSha256(filePath) };
    } catch {
      return { status: 'failed' };
    }
  });

  ipcMain.handle(
    'seal-video',
    (_event, { path: filePath, receipt }: { path: string; receipt: string }) => {
      try {
        // `appendSealBox` grava no arquivo. Sem a autorização, seria um
        // primitivo de append em caminho arbitrário — a caixa do selo
        // corromperia qualquer documento que o renderer apontasse.
        if (!isAuthorizedVideoPath(filePath) || typeof receipt !== 'string') {
          return { ok: false };
        }
        appendSealBox(filePath, receipt);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
  );

  /**
   * O relatório em PDF: recebe o HTML já montado (e traduzido) pelo
   * renderer, imprime numa janela oculta e pergunta onde salvar.
   *
   * O HTML não carrega bytes de foto — as imagens entram por `media://` na
   * hora da impressão — então o teto aqui é folgado e o custo de IPC, baixo.
   */
  ipcMain.handle(
    'export-report-pdf',
    async (
      _event,
      args: { html?: unknown; filename?: unknown; norm?: unknown; pageWord?: unknown },
    ) => {
      const { html, filename, norm, pageWord } = args ?? {};
      if (
        typeof html !== 'string' ||
        html.length === 0 ||
        html.length > MAX_FILE_SIZE ||
        typeof filename !== 'string' ||
        !(REPORT_NORMS as readonly unknown[]).includes(norm)
      ) {
        return { status: 'failed', error: 'Pedido inválido.' };
      }

      try {
        const pdf = await renderReportPdf(
          html,
          norm as ReportNorm,
          typeof pageWord === 'string' ? pageWord : '',
        );

        const { filePath } = await dialog.showSaveDialog({
          title: translate(currentLocale, 'desktop.dialog.saveReport'),
          defaultPath: path.basename(filename),
          filters: [
            { name: 'PDF', extensions: ['pdf'] },
            { name: translate(currentLocale, 'desktop.dialog.allFiles'), extensions: ['*'] },
          ],
        });
        if (!filePath) return { status: 'cancelled' };

        fs.writeFileSync(filePath, pdf);
        return { status: 'saved', path: filePath };
      } catch {
        return { status: 'failed', error: 'Operação falhou.' };
      }
    },
  );

  /**
   * O pacote do projeto: o relatório em PDF + as fotos originais, num ZIP.
   *
   * Tudo acontece no processo principal — o PDF é impresso aqui, as fotos
   * são lidas da pasta da galeria (só por NOME, nunca por caminho, com a
   * mesma contenção do protocolo `media://`) e o ZIP é montado em modo
   * store (`zip.ts`). Nenhum byte de foto atravessa o IPC.
   */
  ipcMain.handle(
    'export-project-zip',
    async (
      _event,
      args: {
        html?: unknown;
        filename?: unknown;
        norm?: unknown;
        pageWord?: unknown;
        photoNames?: unknown;
        reportName?: unknown;
      },
    ) => {
      const { html, filename, norm, pageWord, photoNames, reportName } = args ?? {};
      if (
        typeof html !== 'string' ||
        html.length === 0 ||
        html.length > MAX_FILE_SIZE ||
        typeof filename !== 'string' ||
        typeof reportName !== 'string' ||
        !Array.isArray(photoNames) ||
        photoNames.length > 500 ||
        !(REPORT_NORMS as readonly unknown[]).includes(norm)
      ) {
        return { status: 'failed', error: 'Pedido inválido.' };
      }

      try {
        const pdf = await renderReportPdf(
          html,
          norm as ReportNorm,
          typeof pageWord === 'string' ? pageWord : '',
        );

        const galleryDir = ensureGalleryDir();
        const entries: ZipEntry[] = [
          { name: path.basename(reportName), data: pdf },
        ];

        // A numeração do pacote acompanha a do RELATÓRIO, não a dos arquivos
        // que sobreviveram: se uma foto sumiu do disco (índice dessincronizado
        // da pasta), pular sem contar faria a "Foto 3" do PDF virar o arquivo
        // 002 do pacote — o pacote entregue como prova mentiria sobre si.
        let missing = 0;
        photoNames.forEach((requested, position) => {
          if (typeof requested !== 'string') {
            missing += 1;
            return;
          }
          const safeName = path.basename(requested);
          const filePath = path.join(galleryDir, safeName);
          if (!isInside(galleryDir, filePath) || !fs.existsSync(filePath)) {
            missing += 1;
            return;
          }

          const number = String(position + 1).padStart(3, '0');
          entries.push({ name: `fotos/${number}-${safeName}`, data: fs.readFileSync(filePath) });
        });

        const { filePath: destination } = await dialog.showSaveDialog({
          title: translate(currentLocale, 'desktop.dialog.saveReport'),
          defaultPath: path.basename(filename),
          filters: [
            { name: 'ZIP', extensions: ['zip'] },
            { name: translate(currentLocale, 'desktop.dialog.allFiles'), extensions: ['*'] },
          ],
        });
        if (!destination) return { status: 'cancelled' };

        fs.writeFileSync(destination, buildZip(entries));
        // `missing` volta para a tela dizer quantas fotos do relatório não
        // estavam no disco — silêncio aqui seria o pacote parecer completo.
        return { status: 'saved', path: destination, missing };
      } catch {
        return { status: 'failed', error: 'Operação falhou.' };
      }
    },
  );

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
    // O filtro do diálogo acompanha o que está sendo salvo. Era um JPEG
    // fixo — servia à foto e atrapalhava qualquer outro formato (o Word e
    // o CSV do relatório chegam por este mesmo handler).
    const extension = path.extname(filename).toLowerCase().replace('.', '');
    const filterByExtension: Record<string, { name: string; extensions: string[] }> = {
      jpg: { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      jpeg: { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      doc: { name: 'Word', extensions: ['doc'] },
      csv: { name: 'CSV', extensions: ['csv'] },
      pdf: { name: 'PDF', extensions: ['pdf'] },
      webm: { name: 'WebM', extensions: ['webm'] },
      mp4: { name: 'MP4', extensions: ['mp4'] },
    };

    const { filePath } = await dialog.showSaveDialog({
      title: translate(currentLocale, 'desktop.dialog.savePhoto'),
      defaultPath: filename,
      filters: [
        filterByExtension[extension] ?? { name: extension.toUpperCase(), extensions: [extension] },
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
    try {
      // As dimensões vêm ANTES da URI: sem elas a foto não é utilizável, e
      // `selected` com 0x0 fazia o preview sair com proporção de espaço
      // reservado e o lote nomear o arquivo `..._0x0.jpg`. Falhar é o certo.
      const { width, height } = readImageSize(filePath);
      return { status: 'selected', uri: registerPickedImage(filePath), width, height };
    } catch {
      return { status: 'failed', error: 'A imagem não pôde ser lida.' };
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
        // O NOME vai junto: a URI é opaca (`media://picked/<id>`), e o lote
        // batiza a saída com o nome do original — sem isto, o arquivo
        // exportado sairia com o identificador hexadecimal no lugar dele.
        results.push({
          uri: registerPickedImage(filePath),
          name: path.basename(filePath),
          width,
          height,
        });
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
      return { uri: registerPickedImage(filePath), width, height };
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
    // `media:` também aqui, e não só em `img-src`: exibir a foto é `<img>`,
    // mas EXPORTAR é `fetch` (Skia.Data.fromURI, em render-photo.ts) — sem
    // isto o preview aparece e a exportação falha, que é meia correção.
    "connect-src 'self' data: blob: media:",
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
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    // `media://picked/<id>` — uma foto que o usuário escolheu no diálogo,
    // em qualquer pasta do disco. O renderer nunca vê nem escolhe o caminho:
    // recebe só o identificador que `pick-image` cunhou (ver `pickedImages`).
    if (url.hostname === 'picked') {
      const id = path.basename(decodeURIComponent(url.pathname));
      const picked = pickedImages.get(id);
      if (!picked || !fs.existsSync(picked)) {
        return new Response('Not Found', { status: 404 });
      }

      const type = CONTENT_TYPES[path.extname(picked).toLowerCase()];
      if (!type?.startsWith('image/')) {
        return new Response('Forbidden', { status: 403 });
      }

      return new Response(fs.readFileSync(picked), { headers: { 'Content-Type': type } });
    }

    const requestedName = path.basename(decodeURIComponent(url.pathname));
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

/**
 * Serve o HTML do relatório à janela oculta que o imprime.
 *
 * Não lê disco nem aceita caminho: responde SEMPRE o documento pendente do
 * momento (`report-pdf.ts`), e 404 fora de uma impressão. A janela que o
 * carrega nasce sem preload — mesmo comprometida, a página não alcança nada.
 */
function createReportProtocol() {
  protocol.handle('report', () => {
    const html = pendingReportHtml();
    if (html === null) return new Response('Not Found', { status: 404 });

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  });
}

/**
 * O ffmpeg — o compositor do vídeo carimbado.
 *
 * No pacote, o binário vai por `extraResources` (ver electron-builder.yml);
 * em desenvolvimento, é o que o `ffmpeg-static` baixou para a plataforma no
 * `npm ci`. O CI compila cada sistema no runner do próprio sistema, então o
 * binário empacotado é sempre o certo.
 */
function ffmpegPath(): string {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'ffmpeg',
      process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffmpeg-static') as string;
}

/** Extensões aceitas no seletor de vídeo. */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'];

/**
 * Os caminhos de vídeo que o USUÁRIO autorizou, escolhendo-os no diálogo do
 * sistema — mais o que o próprio app gravou como saída.
 *
 * Os handlers de vídeo recebem caminho absoluto do renderer (é o contrato:
 * o ffmpeg e o hash trabalham no processo principal). Sem esta lista, um
 * renderer comprometido poderia mandar `hash-video-file` sobre `~/.ssh/id_rsa`
 * (oráculo de hash), `seal-video` sobre qualquer arquivo (append que corrompe)
 * ou `watermark-video` sobre um documento qualquer. A contenção por diretório
 * não serve aqui — o vídeo pode estar em qualquer pasta do usuário —, mas a
 * ESCOLHA dele serve: só o que passou pelo diálogo entra.
 *
 * A lista vive na memória do processo principal e morre com ele.
 */
const authorizedVideoPaths = new Set<string>();

function allowVideoPath(filePath: string): void {
  authorizedVideoPaths.add(path.resolve(filePath));
}

function isAuthorizedVideoPath(value: unknown): value is string {
  return typeof value === 'string' && authorizedVideoPaths.has(path.resolve(value));
}

/**
 * As fotos que o usuário escolheu no diálogo (ou arrastou), por identificador.
 *
 * A janela roda sobre `app://`, e a CSP não deixa `<img>` nem `fetch`
 * carregarem `file:` — então uma foto escolhida em qualquer pasta do disco
 * precisa ser servida por um esquema autorizado. É a mesma razão que criou o
 * `media://` para a galeria. Aqui o renderer recebe só um `id` opaco
 * (`media://picked/<id>`), nunca o caminho: ele não escolhe o que é lido, e
 * a origem do caminho continua sendo a escolha do usuário.
 */
const pickedImages = new Map<string, string>();

function registerPickedImage(filePath: string): string {
  const id = crypto.randomBytes(12).toString('hex');
  pickedImages.set(id, path.resolve(filePath));
  return `media://picked/${id}`;
}

/**
 * Sonda o vídeo com o próprio ffmpeg: dimensões e duração saem do stderr de
 * `ffmpeg -i` (que termina com código 1 por não ter saída — esperado).
 * O ffprobe não vem no `ffmpeg-static`, e para dois números o ffmpeg basta.
 */
function probeVideo(filePath: string): Promise<{
  width: number;
  height: number;
  durationMs: number;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), ['-hide_banner', '-i', filePath]);
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', () => {
      // As dimensões de EXIBIÇÃO — já com a rotação declarada aplicada, que
      // é o quadro que o filtro do ffmpeg entrega (ver `video-rotation.ts`).
      const size = displayDimensions(stderr);
      const duration = /Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/.exec(stderr);
      if (!size || !duration) {
        reject(new Error('O arquivo não pôde ser lido como vídeo.'));
        return;
      }
      const durationMs =
        (Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])) * 1000;

      resolve({ width: size.width, height: size.height, durationMs });
    });
  });
}

/**
 * Deep link `lymark://login#token=…` — a volta do login feito no navegador.
 *
 * O Electron não roda o clerk-js (a origem `app://` não é um domínio que o
 * Clerk aceite), então entrar no desktop é: abrir `/conta/desktop` no
 * navegador do sistema, fazer login lá, e o site devolve o token do desktop
 * por este protocolo. Ver `docs/ASSINATURA.md` §7, passo 2.
 */
const ACCOUNT_HANDOFF_URL = 'https://lymark.app/conta/desktop';

/** Token que chegou antes de a janela existir — entregue no primeiro load. */
let pendingLoginToken: string | null = null;

/**
 * Quando este app pediu um login (abriu o handoff no navegador).
 *
 * O deep link é uma porta que QUALQUER programa da máquina — ou um link numa
 * página — pode bater: `lymark://login#token=…` com o token de outra conta
 * trocaria a sessão de quem estiver usando o app, sem uma palavra na tela, e
 * dali em diante os recibos do selo sairiam no nome de outra pessoa.
 *
 * Duas guardas, e as duas simples: o token só é aceito se ESTE app tiver
 * aberto o login há pouco, e ainda assim a troca é confirmada por quem está
 * na frente da máquina. Um login legítimo passa por ambas sem atrito — a
 * pessoa acabou de clicar em "Entrar" e está esperando exatamente isso.
 */
let loginRequestedAt = 0;

/** Quanto tempo um pedido de login continua valendo. */
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

function extractLoginToken(candidate: string): string | null {
  if (!candidate.startsWith('lymark://')) return null;
  const match = /#token=([^&\s]+)/.exec(candidate);
  return match ? match[1] : null;
}

/**
 * Confirma com quem está na máquina antes de trocar a sessão.
 *
 * `null` de janela é o caso do app aberto PELO deep link: aí não há sessão
 * para roubar (ninguém estava usando), e o pedido recente já basta.
 */
async function confirmLoginToken(): Promise<boolean> {
  if (!mainWindow) return true;

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: [
      translate(currentLocale, 'desktop.login.confirm'),
      translate(currentLocale, 'desktop.login.cancel'),
    ],
    defaultId: 0,
    cancelId: 1,
    title: translate(currentLocale, 'desktop.login.title'),
    message: translate(currentLocale, 'desktop.login.message'),
  });

  return response === 0;
}

function deliverLoginToken(candidate: string) {
  const token = extractLoginToken(candidate);
  if (!token) return;

  // Ninguém pediu login por aqui: o link veio de fora, e entrar em silêncio
  // seria trocar a conta de quem está usando o aplicativo.
  if (Date.now() - loginRequestedAt > LOGIN_WINDOW_MS) return;
  loginRequestedAt = 0;

  if (mainWindow && !mainWindow.webContents.isLoading()) {
    void confirmLoginToken().then((confirmed) => {
      if (confirmed && mainWindow) mainWindow.webContents.send('login-token', token);
    });
  } else {
    // A janela ainda não está de pé (o app acabou de ser aberto pelo próprio
    // deep link). Guardar e entregar quando o load terminar — ver
    // `createWindow`, que despacha o pendente em `did-finish-load`.
    pendingLoginToken = token;
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

export function flushPendingLoginToken(contents: Electron.WebContents) {
  if (!pendingLoginToken) return;
  contents.send('login-token', pendingLoginToken);
  pendingLoginToken = null;
}

// Instância única: no Windows e no Linux o deep link abre uma segunda
// instância com a URL no argv — sem a trava, o clique no navegador abriria
// um segundo Lymark em vez de entregar o token ao que já está aberto.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', (_event, argv) => {
  for (const argument of argv) deliverLoginToken(argument);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// macOS entrega o deep link por evento, não por argv.
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Sem janela, o evento é o que ABRIU o app: não há sessão para trocar, e
  // o próprio arranque conta como o pedido (mesma razão do argv em
  // `whenReady`). Com o app já aberto, a guarda e a confirmação valem.
  if (!mainWindow) loginRequestedAt = Date.now();
  deliverLoginToken(url);
});

// App pronto
app.whenReady().then(() => {
  // Registrar o esquema junto ao sistema. Fora do pacote (desenvolvimento),
  // o registro precisa apontar o executável do Electron para este projeto —
  // sem os argumentos, o clique no link abriria um Electron vazio.
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('lymark');
  } else if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lymark', process.execPath, [path.resolve(process.argv[1])]);
  }

  // Deep link que INICIOU este processo (Windows/Linux): está no argv.
  //
  // Aqui não havia sessão para trocar — o app nem estava aberto —, então o
  // próprio arranque por deep link conta como o pedido de login. Sem esta
  // linha, a guarda de `deliverLoginToken` descartaria todo token de quem
  // fecha o app antes de concluir o login no navegador.
  if (process.argv.some((argument) => argument.startsWith('lymark://'))) {
    loginRequestedAt = Date.now();
  }
  for (const argument of process.argv) deliverLoginToken(argument);
  // Garantir que a pasta da galeria existe
  ensureGalleryDir();
  // Carregar configuração persistida
  const config = loadConfig();
  outputFolderPath = config.outputFolderPath;
  currentLocale = config.locale;

  // Configurar o protocolo
  createProtocol();
  createMediaProtocol();
  createReportProtocol();
  
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
