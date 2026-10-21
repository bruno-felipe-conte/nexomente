import { ipcMain, dialog, app } from "electron";
import path from "path";
import fs from "fs";
import { createErrorResponse, createSuccessResponse } from "./utils/errorResponse.js";

export function registerWindowHandlers(getMainWindow) {
  // Window controls
  ipcMain.handle("window:minimize", () => {
    getMainWindow()?.minimize();
    return createSuccessResponse({ success: true });
  });

  ipcMain.handle("window:maximize", () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
    return createSuccessResponse({ success: true });
  });

  ipcMain.handle("window:close", () => {
    getMainWindow()?.close();
    return createSuccessResponse({ success: true });
  });

  ipcMain.handle("window:isMaximized", () => {
    return createSuccessResponse({ isMaximized: getMainWindow()?.isMaximized() || false });
  });

  // Config
  ipcMain.handle("config:get", async (event, key) => {
    const configPath = path.join(app.getPath("userData"), "config.json");
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return createSuccessResponse(key ? config[key] : config);
      }
    } catch (e) {
      console.error("[CONFIG] Erro ao ler config:", e);
      return createErrorResponse(e);
    }
    return createSuccessResponse(null);
  });

  ipcMain.handle("config:set", async (event, key, value) => {
    const configPath = path.join(app.getPath("userData"), "config.json");
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
      config[key] = value;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return createSuccessResponse({ success: true });
    } catch (e) {
      console.error("[CONFIG] Erro ao gravar config:", e);
      return createErrorResponse(e);
    }
  });

  // Folder picker
  ipcMain.handle("dialog:selectFolder", async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Selecionar Pasta do Cofre",
    });
    return createSuccessResponse({ path: result.canceled ? null : result.filePaths[0] });
  });

  // Paths
  ipcMain.handle("db:getPath", () => {
    return createSuccessResponse({ path: path.join(app.getPath("userData"), "nexomente.db") });
  });

  ipcMain.handle("app:getPath", (event, name) => {
    return createSuccessResponse({ path: app.getPath(name) });
  });
}

