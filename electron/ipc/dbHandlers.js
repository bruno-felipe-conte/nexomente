import { ipcMain } from 'electron';
import { getDB } from '../db/database.js';

export function registerDbHandlers() {
  // ==========================================
  // NOTAS HANDLERS
  // ==========================================
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
      const id = nota.id || `nota_${Date.now()}`;
      const tagsJson = JSON.stringify(nota.tags || []);

      db.prepare(`
        INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags, criado_em, atualizado_em, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        nota.pasta_id || 'pasta_raiz',
        nota.tipo || 'nota',
        nota.titulo || 'Nova Nota',
        nota.conteudo || '',
        tagsJson,
        new Date().toISOString(),
        new Date().toISOString(),
        'ativo'
      );

      return id;
    } catch (error) {
      console.error('[DB] Erro ao criar nota:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:update', (event, { id, updates }) => {
    try {
      const db = getDB();
      const setClauses = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'tags') {
          setClauses.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      }

      setClauses.push('atualizado_em = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const sql = `UPDATE notas SET ${setClauses.join(', ')} WHERE id = ?`;
      const info = db.prepare(sql).run(...values);
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao atualizar nota:', error);
      throw error;
    }
  });

  ipcMain.handle('db-notas:delete', (event, id) => {
    try {
      const db = getDB();
      const info = db.prepare(`
        UPDATE notas SET status = 'deletado', atualizado_em = ? WHERE id = ?
      `).run(new Date().toISOString(), id);
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao deletar nota:', error);
      throw error;
    }
  });

  // ==========================================
  // PASTAS HANDLERS
  // ==========================================
  ipcMain.handle('db-pastas:getAll', () => {
    try {
      const db = getDB();
      return db.prepare('SELECT * FROM pastas ORDER BY nome').all();
    } catch (error) {
      console.error('[DB] Erro ao buscar pastas:', error);
      throw error;
    }
  });

  ipcMain.handle('db-pastas:create', (event, pasta) => {
    try {
      const db = getDB();
      const id = pasta.id || `pasta_${Date.now()}`;
      db.prepare(`
        INSERT INTO pastas (id, nome, parent_id, cor, icone, criado_em, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        pasta.nome,
        pasta.parent_id || null,
        pasta.cor || '#6C63FF',
        pasta.icone || 'folder',
        new Date().toISOString(),
        new Date().toISOString()
      );
      return id;
    } catch (error) {
      console.error('[DB] Erro ao criar pasta:', error);
      throw error;
    }
  });

  // ==========================================
  // MATERIAS HANDLERS
  // ==========================================
  ipcMain.handle('db-materias:getAll', () => {
    try {
      const db = getDB();
      return db.prepare('SELECT * FROM materias ORDER BY nome').all();
    } catch (error) {
      console.error('[DB] Erro ao buscar materias:', error);
      throw error;
    }
  });

  ipcMain.handle('db-materias:create', (event, materia) => {
    try {
      const db = getDB();
      const id = materia.id || `materia_${Date.now()}`;
      db.prepare(`
        INSERT INTO materias (id, nome, cor, icone, meta_horas, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        materia.nome,
        materia.cor || '#6C63FF',
        materia.icone || 'book',
        materia.meta_horas || 0,
        new Date().toISOString()
      );
      return id;
    } catch (error) {
      console.error('[DB] Erro ao criar materia:', error);
      throw error;
    }
  });

  // ==========================================
  // SESSOES DE ESTUDO HANDLERS
  // ==========================================
  ipcMain.handle('db-sessoes:getAll', () => {
    try {
      const db = getDB();
      return db.prepare(`
        SELECT s.*, m.nome as materia_nome, m.cor as materia_cor
        FROM sessoes_estudo s
        LEFT JOIN materias m ON s.materia_id = m.id
        ORDER BY s.started_at DESC
        LIMIT 50
      `).all();
    } catch (error) {
      console.error('[DB] Erro ao buscar sessoes:', error);
      throw error;
    }
  });

  ipcMain.handle('db-sessoes:create', (event, sessao) => {
    try {
      const db = getDB();
      const id = sessao.id || `sessao_${Date.now()}`;
      db.prepare(`
        INSERT INTO sessoes_estudo (id, materia_id, tipo, duracao_minutos, concluida, started_at, ended_at, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sessao.materia_id,
        sessao.tipo || 'pomodoro',
        sessao.duracao_minutos || 25,
        sessao.concluida ? 1 : 0,
        sessao.started_at || new Date().toISOString(),
        sessao.ended_at || null,
        new Date().toISOString()
      );
      return id;
    } catch (error) {
      console.error('[DB] Erro ao criar sessao:', error);
      throw error;
    }
  });

  ipcMain.handle('db-sessoes:completar', (event, id) => {
    try {
      const db = getDB();
      const info = db.prepare(`
        UPDATE sessoes_estudo SET concluida = 1, ended_at = ? WHERE id = ?
      `).run(new Date().toISOString(), id);
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao completar sessao:', error);
      throw error;
    }
  });

  // ==========================================
  // FLASHCARDS HANDLERS (SM-2)
  // ==========================================
  ipcMain.handle('db-flashcards:getAll', () => {
    try {
      const db = getDB();
      return db.prepare(`
        SELECT f.*,
               n.titulo as nota_titulo,
               m.nome as materia_nome
        FROM flashcards f
        LEFT JOIN notas n ON f.nota_id = n.id
        LEFT JOIN materias m ON f.materia_id = m.id
        ORDER BY f.next_review ASC
      `).all();
    } catch (error) {
      console.error('[DB] Erro ao buscar flashcards:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:getParaRevisao', () => {
    try {
      const db = getDB();
      const now = new Date().toISOString();
      return db.prepare(`
        SELECT f.*,
               n.titulo as nota_titulo,
               m.nome as materia_nome
        FROM flashcards f
        LEFT JOIN notas n ON f.nota_id = n.id
        LEFT JOIN materias m ON f.materia_id = m.id
        WHERE (f.next_review IS NULL OR f.next_review <= ?)
        ORDER BY f.next_review ASC
      `).all(now);
    } catch (error) {
      console.error('[DB] Erro ao buscar flashcards para revisao:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:create', (event, card) => {
    try {
      const db = getDB();
      const id = card.id || `fc_${Date.now()}`;
      db.prepare(`
        INSERT INTO flashcards (id, nota_id, materia_id, frente, verso, intervalo, repeticoes, ease_factor, next_review, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        card.nota_id,
        card.materia_id,
        card.frente,
        card.verso,
        card.intervalo || 1,
        card.repeticoes || 0,
        card.ease_factor || 2.5,
        card.next_review || null,
        new Date().toISOString()
      );
      return id;
    } catch (error) {
      console.error('[DB] Erro ao criar flashcard:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:revisar', (event, { id, qualidade }) => {
    try {
      const db = getDB();
      const row = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
      if (!row) return false;

      let { intervalo, repeticoes, ease_factor } = row;

      if (qualidade >= 3) {
        if (repeticoes === 0) intervalo = 1;
        else if (repeticoes === 1) intervalo = 6;
        else intervalo = Math.round(intervalo * ease_factor);
        repeticoes = (repeticoes || 0) + 1;
      } else {
        repeticoes = 0;
        intervalo = 1;
      }

      ease_factor = ease_factor + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
      if (ease_factor < 1.3) ease_factor = 1.3;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + intervalo);

      const info = db.prepare(`
        UPDATE flashcards SET
          intervalo = ?,
          repeticoes = ?,
          ease_factor = ?,
          next_review = ?
        WHERE id = ?
      `).run(intervalo, repeticoes, ease_factor, nextDate.toISOString(), id);

      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao revisar flashcard:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:update', (event, { id, updates }) => {
    try {
      const db = getDB();
      const campos = [];
      const valores = [];

      if (updates.frente !== undefined) { campos.push('frente = ?'); valores.push(updates.frente); }
      if (updates.verso !== undefined) { campos.push('verso = ?'); valores.push(updates.verso); }
      if (updates.materia_id !== undefined) { campos.push('materia_id = ?'); valores.push(updates.materia_id); }
      if (updates.nota_id !== undefined) { campos.push('nota_id = ?'); valores.push(updates.nota_id); }
      if (updates.intervalo !== undefined) { campos.push('intervalo = ?'); valores.push(updates.intervalo); }
      if (updates.repeticoes !== undefined) { campos.push('repeticoes = ?'); valores.push(updates.repeticoes); }
      if (updates.ease_factor !== undefined) { campos.push('ease_factor = ?'); valores.push(updates.ease_factor); }
      if (updates.next_review !== undefined) { campos.push('next_review = ?'); valores.push(updates.next_review); }

      if (campos.length === 0) return false;

      valores.push(id);
      const info = db.prepare(`UPDATE flashcards SET ${campos.join(', ')} WHERE id = ?`).run(...valores);
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao atualizar flashcard:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:delete', (event, id) => {
    try {
      const db = getDB();
      const info = db.prepare('DELETE FROM flashcards WHERE id = ?').run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao deletar flashcard:', error);
      throw error;
    }
  });

  // ==========================================
  // XP HANDLERS
  // ==========================================
  ipcMain.handle('db-xp:getTotal', () => {
    try {
      const db = getDB();
      const row = db.prepare('SELECT SUM(xp) as total FROM transacoes_xp').get();
      return row.total || 0;
    } catch (error) {
      console.error('[DB] Erro ao buscar total de XP:', error);
      throw error;
    }
  });

  ipcMain.handle('db-xp:add', (event, { xp, motivo, source_type, source_id }) => {
    try {
      const db = getDB();
      const info = db.prepare(`
        INSERT INTO transacoes_xp (id, xp, motivo, source_type, source_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `xp_${Date.now()}`,
        xp,
        motivo,
        source_type,
        source_id,
        new Date().toISOString()
      );
      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao adicionar XP:', error);
      throw error;
    }
  });
}
