import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs';

export function registerWindowHandlers(getMainWindow) {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return getMainWindow()?.isMaximized() || false;
  });

  // Config
  ipcMain.handle('config:get', async (event, key) => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return key ? config[key] : config;
      }
    } catch (e) {
      console.error('[CONFIG] Erro ao ler config:', e);
    }
    return null;
  });

  ipcMain.handle('config:set', async (event, key, value) => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      config[key] = value;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (e) {
      console.error('[CONFIG] Erro ao gravar config:', e);
      return false;
    }
  });

  // Folder picker
  ipcMain.handle('dialog:selectFolder', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Selecionar Pasta do Cofre',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Paths
  ipcMain.handle('db:getPath', () => {
    return path.join(app.getPath('userData'), 'nexomente.db');
  });

  ipcMain.handle('app:getPath', (event, name) => {
    return app.getPath(name);
  });
}
