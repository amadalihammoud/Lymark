/**
 * Ponto de entrada do Electron para o Lymark Desktop.
 */

import { app, BrowserWindow, protocol, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sizeOf from 'image-size';

// Variáveis globais
let mainWindow: BrowserWindow | null = null;

// Pasta da galeria do desktop (decisão 2.2: pasta real no disco)
const GALLERY_DIR_NAME = 'Lymark';
const DEFAULT_GALLERY_PATH = path.join(os.homedir(), 'Pictures', GALLERY_DIR_NAME);

// Pasta de saída padrão para processamento em lote
let outputFolderPath: string = DEFAULT_GALLERY_PATH;

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
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Definir o sinalizador de plataforma no window
  if (mainWindow.webContents) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.executeJavaScript(`
        window.lymark = window.lymark || {};
        window.lymark.platform = 'desktop';
      `);
    });
  }

  // Carregar o app
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol();
    mainWindow.loadURL('app://./index.html');
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Configurar drag and drop para a janela
  mainWindow.on('will-navigate', (e) => e.preventDefault());

  mainWindow.webContents.on('did-navigate-in-page', (e) => {
    // Permitir navegação interna
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Registrar handlers de IPC
function registerIpcHandlers() {
  // Handler para salvar arquivo (diálogo de salvamento)
  ipcMain.handle('save-file', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
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
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Handler para salvar arquivo na pasta de saída (sem diálogo)
  ipcMain.handle('save-file-to-output', async (event, { bytes, filename, mimeType }: { bytes: number[]; filename: string; mimeType: string }) => {
    try {
      // Garantir que a pasta de saída existe
      if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
      }
      
      const filePath = path.join(outputFolderPath, filename);
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return { status: 'saved', path: filePath };
    } catch (error) {
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Handler para apagar arquivo da galeria
  // SÓ apaga arquivos dentro da pasta da galeria (segurança)
  ipcMain.handle('delete-file', async (event, { path: relativePath }: { path: string }) => {
    try {
      // Resolver o caminho absoluto
      const galleryDir = ensureGalleryDir();
      const fullPath = path.resolve(galleryDir, relativePath);
      
      // Verificar que o arquivo está dentro da pasta da galeria
      const normalizedFullPath = path.normalize(fullPath);
      const normalizedGalleryDir = path.normalize(galleryDir);
      
      if (!normalizedFullPath.startsWith(normalizedGalleryDir)) {
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
    
    try {
      const buffer = fs.readFileSync(filePath);
      const dimensions = sizeOf(buffer);
      
      return {
        status: 'selected',
        uri: `file://${filePath}`,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch {
      return {
        status: 'selected',
        uri: `file://${filePath}`,
        width: 0,
        height: 0,
      };
    }
  });

  // Handler para selecionar múltiplas imagens (processamento em lote)
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
        const buffer = fs.readFileSync(filePath);
        const dimensions = sizeOf(buffer);
        results.push({
          uri: `file://${filePath}`,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch {
        continue;
      }
    }

    return { status: 'selected', photos: results };
  });

  // Handler para selecionar pasta de saída
  ipcMain.handle('select-output-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Pasta de Saída',
      properties: ['openDirectory'],
    });

    if (!filePaths || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    outputFolderPath = filePaths[0];
    return { status: 'selected', path: outputFolderPath };
  });

  // Handler para obter pasta de saída atual
  ipcMain.handle('get-output-folder', async () => {
    return { path: outputFolderPath };
  });

  // Handler para adicionar arquivo via drag and drop
  ipcMain.handle('add-drag-drop-file', async (event, { filePath }: { filePath: string }) => {
    try {
      const buffer = fs.readFileSync(filePath);
      const dimensions = sizeOf(buffer);
      
      return {
        uri: `file://${filePath}`,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch {
      return null;
    }
  });
}

// Configurar o protocolo app:// para servir o build estático
function createProtocol() {
  protocol.handle('app', (request) => {
    let pathname = request.url.replace('app:///', '');
    
    if (pathname.startsWith('/')) {
      pathname = pathname.slice(1);
    }
    
    const distPath = path.join(__dirname, '../dist', pathname);
    
    try {
      if (fs.existsSync(distPath)) {
        const stat = fs.statSync(distPath);
        
        if (stat.isDirectory()) {
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            return new Response(fs.readFileSync(indexPath), {
              headers: { 'Content-Type': 'text/html' },
            });
          }
        } else {
          const content = fs.readFileSync(distPath);
          
          let contentType = 'application/octet-stream';
          if (pathname.endsWith('.html')) {
            contentType = 'text/html';
          } else if (pathname.endsWith('.js')) {
            contentType = 'application/javascript';
          } else if (pathname.endsWith('.css')) {
            contentType = 'text/css';
          } else if (pathname.endsWith('.png')) {
            contentType = 'image/png';
          } else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (pathname.endsWith('.wasm')) {
            contentType = 'application/wasm';
          } else if (pathname.endsWith('.json')) {
            contentType = 'application/json';
          } else if (pathname.endsWith('.ico')) {
            contentType = 'image/x-icon';
          }
          
          return new Response(content, {
            headers: { 'Content-Type': contentType },
          });
        }
      }
    } catch {
      // Ignorar
    }
    
    return new Response('Not Found', { status: 404 });
  });
}

// App pronto
app.whenReady().then(() => {
  // Garantir que a pasta da galeria existe
  ensureGalleryDir();
  outputFolderPath = DEFAULT_GALLERY_PATH;
  
  // Configurar o protocolo
  createProtocol();
  
  // Registrar handlers de IPC
  registerIpcHandlers();
  
  // Criar janela
  createWindow();
  
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
