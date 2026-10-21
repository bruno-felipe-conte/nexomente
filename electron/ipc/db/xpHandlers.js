import { ipcMain } from "electron";
import { getDB } from "../../db/database.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errorResponse.js";

export function registerXpHandlers() {
  ipcMain.handle("db-xp:getTotal", () => {
    try {
      const db = getDB();
      const row = db.prepare("SELECT SUM(xp) as total FROM transacoes_xp").get();
      return createSuccessResponse({ total: row?.total || 0 });
    } catch (error) {
      console.error("[DB] Erro ao buscar total de XP:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-xp:add", (event, { xp, motivo, source_type, source_id }) => {
    try {
      const db = getDB();
      const id = "xp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
      const stmt = db.prepare(`
        INSERT INTO transacoes_xp (id, xp, motivo, source_type, source_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(id, xp, motivo, source_type, source_id);

      const totalRow = db.prepare("SELECT SUM(xp) as total FROM transacoes_xp").get();
      return createSuccessResponse({ success: true, totalXP: totalRow?.total || 0 });
    } catch (error) {
      console.error("[DB] Erro ao adicionar XP:", error);
      return createErrorResponse(error);
    }
  });
}

