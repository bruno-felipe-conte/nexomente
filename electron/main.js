import { app, BrowserWindow, session, screen } from 'electron';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDB, closeDB } from './db/database.js';
import { registerWindowHandlers } from './ipc/windowHandlers.js';
import { registerDbHandlers } from './ipc/dbHandlers.js';
import { registerAiHandlers } from './ipc/aiHandlers.js';

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

const ALLOWED_ORIGINS = ['file://', 'http://localhost:5173', 'http://127.0.0.1:5173'];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

app.whenReady().then(() => {
  console.log('====================================');
  console.log('NEXOMENTE MAIN PROCESS STARTING...');
  console.log('====================================');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const requestOrigin = details.requestHeaders?.Origin || details.requestHeaders?.origin;
    const origin = Array.isArray(requestOrigin) ? requestOrigin[0] : requestOrigin;
    const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : 'file://';

    if (responseHeaders['Access-Control-Allow-Origin']) delete responseHeaders['Access-Control-Allow-Origin'];
    if (responseHeaders['access-control-allow-origin']) delete responseHeaders['access-control-allow-origin'];

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:1234 http://localhost:11434 ws://localhost:5173",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; ');

    callback({
      responseHeaders: {
        ...responseHeaders,
        'Access-Control-Allow-Origin': [allowedOrigin],
        'Access-Control-Allow-Headers': ['Content-Type', 'Authorization'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'OPTIONS'],
        'Access-Control-Allow-Credentials': ['true'],
        'Content-Security-Policy': [csp],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
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
      // Ignora erro de conexão enquanto Vite inicializa
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

async function bootstrap() {
  try {
    await initDB();
    registerWindowHandlers(() => mainWindow);
    registerDbHandlers();
    registerAiHandlers();
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
