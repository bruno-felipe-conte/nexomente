import { ipcMain } from 'electron';
import { getDB } from '../../db/database.js';

export function registerNotasHandlers() {
  ipcMain.handle('db-notas:getAll', () => {
    try {
      const db = getDB();
      const rows = db.prepare(`
        SELECT n.*, p.nome as pasta_nome, p.cor as pasta_cor, p.icone as pasta_icone
        FROM notas n
        LEFT JOIN pastas p ON n.pasta_id = p.id
        WHERE n.status != 'deletado'
        ORDER BY n.atualizado_em DESC
      `).all();

      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : []
      }));
    } catch (error) {
      console.error('[DB] Erro ao buscar notas:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:getById', (event, id) => {
    try {
      const db = getDB();
      const row = db.prepare(`
        SELECT n.*, p.nome as pasta_nome, p.cor as pasta_cor, p.icone as pasta_icone
        FROM notas n
        LEFT JOIN pastas p ON n.pasta_id = p.id
        WHERE n.id = ?
      `).get(id);

      if (!row) return null;
      return {
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : []
      };
    } catch (error) {
      console.error('[DB] Erro ao buscar nota por id:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:create', (event, nota) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        nota.id,
        nota.pasta_id,
        nota.tipo || 'nota',
        nota.titulo,
        nota.conteudo || '',
        JSON.stringify(nota.tags || []),
        nota.status || 'ativo'
      );

      return {
        ...nota,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
    } catch (error) {
      console.error('[DB] Erro ao criar nota:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:update', (event, { id, updates }) => {
    try {
      const db = getDB();
      const fields = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(key === 'tags' ? JSON.stringify(value) : value);
        }
      });

      fields.push('atualizado_em = CURRENT_TIMESTAMP');
      values.push(id);

      const stmt = db.prepare(`
        UPDATE notas
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao atualizar nota:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:delete', (event, id) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        UPDATE notas
        SET status = 'deletado', atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao deletar nota:', error);
      throw error;
    }
  });

  // Pastas
  ipcMain.handle('db-pastas:getAll', () => {
    try {
      const db = getDB();
      return db.prepare('SELECT * FROM pastas ORDER BY nome ASC').all();
    } catch (error) {
      console.error('[DB] Erro ao buscar pastas:', error);
      throw error;
    }
  });

  ipcMain.handle('db-pastas:create', (event, pasta) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO pastas (id, nome, parent_id, cor, icone)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        pasta.id,
        pasta.nome,
        pasta.parent_id || null,
        pasta.cor || '#6C63FF',
        pasta.icone || 'folder'
      );

      return pasta;
    } catch (error) {
      console.error('[DB] Erro ao criar pasta:', error);
      throw error;
    }
  });
}
