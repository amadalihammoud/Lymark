/**
 * Ponto de entrada do Electron para o Lymark Desktop.
 */

import { app, BrowserWindow, protocol, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import sizeOf from 'image-size';

// Variáveis globais
let mainWindow: BrowserWindow | null = null;

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
    // Modo produção - carregar do build estático
    mainWindow.loadURL('app://./index.html');
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
  // Handler para salvar arquivo
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

  // Handler para arrastar e soltar (para processamento em lote)
  ipcMain.handle('pick-images', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Fotos',
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
}

// Configurar o protocolo app:// para servir o build estático
function setupProtocol() {
  protocol.handle('app', (request) => {
    let pathname = request.url.replace('app:///', '');
    
    // Normalizar o path
    if (pathname.startsWith('/')) {
      pathname = pathname.slice(1);
    }
    
    // Tentar servir do diretório dist
    const distPath = path.join(__dirname, '../dist', pathname);
    
    try {
      if (fs.existsSync(distPath)) {
        const stat = fs.statSync(distPath);
        
        if (stat.isDirectory()) {
          // Servir index.html para diretórios
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            return new Response(fs.readFileSync(indexPath), {
              headers: { 'Content-Type': 'text/html' },
            });
          }
        } else {
          // Servir o arquivo
          const content = fs.readFileSync(distPath);
          
          // Determinar o Content-Type
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
    
    // Arquivo não encontrado
    return new Response('Not Found', { status: 404 });
  });
}

// App pronto
app.whenReady().then(() => {
  // Configurar o protocolo
  setupProtocol();
  
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
