import { app, BrowserWindow, session, screen } from 'electron';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDB, closeDB } from './db/database.js';
import { registerWindowHandlers } from './ipc/windowHandlers.js';
import { registerDbHandlers } from './ipc/dbHandlers.js';
import { registerAiHandlers } from './ipc/aiHandlers.js';

// Tratamento global de exceções não capturadas no processo principal
process.on('uncaughtException', (err) => {
  console.error('[MAIN] Excecao nao capturada:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[MAIN] Rejeicao de promise nao tratada:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;

// ==========================================
// CONFIGURAÇÃO DE SEGURANÇA E CORS
// ==========================================
app.whenReady().then(() => {
  console.log('====================================');
  console.log('NEXOMENTE MAIN PROCESS STARTING...');
  console.log('====================================');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    if (responseHeaders['Access-Control-Allow-Origin']) delete responseHeaders['Access-Control-Allow-Origin'];
    if (responseHeaders['access-control-allow-origin']) delete responseHeaders['access-control-allow-origin'];

    callback({
      responseHeaders: {
        ...responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
      },
    });
  });
});

async function waitForUrl(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok || res.status) return true;
    } catch {
      // Falha transitória esperada durante o polling enquanto o servidor Vite inicializa
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function createWindow() {
  console.log('[WINDOW] Criando janela principal...');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const minAppWidth = Math.floor(screenWidth * 0.325);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: minAppWidth,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0F0E17',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(async (err) => {
      console.log('[WINDOW] Vite inicializando, aguardando conexao...');
      const ok = await waitForUrl('http://localhost:5173');
      if (ok) {
        await mainWindow.loadURL('http://localhost:5173');
      } else {
        console.error('[WINDOW] Vite nao respondeu:', err);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('closed', () => {
    mainWindow = null;
  });
}

// ==========================================
// INICIALIZAÇÃO DE SERVIÇOS E HANDLERS
// ==========================================
async function bootstrap() {
  try {
    // 1. Inicializa o banco de dados SQLite nativo
    await initDB();

    // 2. Registra os barramentos IPC desacoplados
    registerWindowHandlers(() => mainWindow);
    registerDbHandlers();
    registerAiHandlers();

    // 3. Cria a interface
    createWindow();
  } catch (error) {
    console.error('[BOOTSTRAP] Falha critica na inicializacao:', error);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('[MAIN] Encerrando aplicacao e liberando recursos...');
  closeDB();
});