import { ipcMain } from "electron";
import { getDB } from "../../db/database.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errorResponse.js";

export function registerPoemasHandlers() {
  ipcMain.handle("db-poemas:getAll", () => {
    try {
      const db = getDB();
      const rows = db.prepare("SELECT * FROM poemas ORDER BY titulo ASC").all();
      return createSuccessResponse(rows.map(r => ({
        ...r,
        tema: r.tema ? JSON.parse(r.tema) : [],
        tags: r.tags ? JSON.parse(r.tags) : []
      })));
    } catch (error) {
      console.error("[DB] Erro ao buscar poemas:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-poemas:getById", (event, id) => {
    try {
      const db = getDB();
      const row = db.prepare("SELECT * FROM poemas WHERE id = ?").get(id);
      if (!row) return createSuccessResponse(null);
      return createSuccessResponse({
        ...row,
        tema: row.tema ? JSON.parse(row.tema) : [],
        tags: row.tags ? JSON.parse(row.tags) : []
      });
    } catch (error) {
      console.error("[DB] Erro ao buscar poema por id:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-poemas:create", (event, poema) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO poemas (
          id, titulo, autor, corpo, epoca, tema, forma, tags, notas_usuario, ano, streak_recitacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        poema.id,
        poema.titulo,
        poema.autor || "Desconhecido",
        poema.corpo,
        poema.epoca || "",
        JSON.stringify(poema.tema || []),
        poema.forma || "",
        JSON.stringify(poema.tags || []),
        poema.notas_usuario || "",
        poema.ano || "",
        poema.streak_recitacao || 0
      );

      return createSuccessResponse(poema);
    } catch (error) {
      console.error("[DB] Erro ao criar poema:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-poemas:update", (event, { id, updates }) => {
    try {
      const db = getDB();
      const fields = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id") {
          fields.push(`${key} = ?`);
          values.push((key === "tema" || key === "tags") ? JSON.stringify(value) : value);
        }
      });

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const stmt = db.prepare(`
        UPDATE poemas
        SET ${fields.join(", ")}
        WHERE id = ?
      `);

      const result = stmt.run(...values);
      return createSuccessResponse({ success: result.changes > 0 });
    } catch (error) {
      console.error("[DB] Erro ao atualizar poema:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-poemas:delete", (event, id) => {
    try {
      const db = getDB();
      const stmt = db.prepare("DELETE FROM poemas WHERE id = ?");
      const result = stmt.run(id);
      return createSuccessResponse({ success: result.changes > 0 });
    } catch (error) {
      console.error("[DB] Erro ao deletar poema:", error);
      return createErrorResponse(error);
    }
  });

  ipcMain.handle("db-poemas:recordRecitacao", (event, id) => {
    try {
      const db = getDB();
      const poema = db.prepare("SELECT streak_recitacao, ultima_recitacao FROM poemas WHERE id = ?").get(id);
      if (!poema) return createSuccessResponse(false);

      const agora = new Date();
      let streak = poema.streak_recitacao || 0;

      if (poema.ultima_recitacao) {
        const ultima = new Date(poema.ultima_recitacao);
        const diffHoras = (agora - ultima) / (1000 * 60 * 60);

        if (diffHoras >= 20 && diffHoras <= 48) {
          streak += 1;
        } else if (diffHoras > 48) {
          streak = 1;
        }
      } else {
        streak = 1;
      }

      const stmt = db.prepare(`
        UPDATE poemas
        SET streak_recitacao = ?, ultima_recitacao = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(streak, agora.toISOString(), id);
      return createSuccessResponse({ success: true, streak });
    } catch (error) {
      console.error("[DB] Erro ao registrar recitacao:", error);
      return createErrorResponse(error);
    }
  });
}

