import { ipcMain } from 'electron';
import { getDB } from '../../db/database.js';
import { calculateNextReview } from '../../../app/src/hooks/sm2.js';

export function registerFlashcardsHandlers() {
  // Matérias
  ipcMain.handle('db-materias:getAll', () => {
    try {
      const db = getDB();
      return db.prepare('SELECT * FROM materias ORDER BY nome ASC').all();
    } catch (error) {
      console.error('[DB] Erro ao buscar materias:', error);
      throw error;
    }
  });

  ipcMain.handle('db-materias:create', (event, materia) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO materias (id, nome, cor, icone, meta_horas)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        materia.id,
        materia.nome,
        materia.cor || '#6C63FF',
        materia.icone || 'book',
        materia.meta_horas || 0
      );

      return materia;
    } catch (error) {
      console.error('[DB] Erro ao criar materia:', error);
      throw error;
    }
  });

  // Sessões de Estudo
  ipcMain.handle('db-sessoes:getAll', () => {
    try {
      const db = getDB();
      return db.prepare(`
        SELECT s.*, m.nome as materia_nome, m.cor as materia_cor
        FROM sessoes_estudo s
        LEFT JOIN materias m ON s.materia_id = m.id
        ORDER BY s.criado_em DESC
      `).all();
    } catch (error) {
      console.error('[DB] Erro ao buscar sessoes:', error);
      throw error;
    }
  });

  ipcMain.handle('db-sessoes:create', (event, sessao) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO sessoes_estudo (id, materia_id, tipo, duracao_minutos, concluida, started_at, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        sessao.id,
        sessao.materia_id || null,
        sessao.tipo || 'pomodoro',
        sessao.duracao_minutos || 25,
        sessao.concluida ? 1 : 0,
        sessao.started_at || new Date().toISOString(),
        sessao.ended_at || null
      );

      return sessao;
    } catch (error) {
      console.error('[DB] Erro ao criar sessao:', error);
      throw error;
    }
  });

  ipcMain.handle('db-sessoes:completar', (event, id) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        UPDATE sessoes_estudo
        SET concluida = 1, ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao completar sessao:', error);
      throw error;
    }
  });

  // Flashcards
  ipcMain.handle('db-flashcards:getAll', () => {
    try {
      const db = getDB();
      return db.prepare(`
        SELECT f.*, m.nome as materia_nome, m.cor as materia_cor
        FROM flashcards f
        LEFT JOIN materias m ON f.materia_id = m.id
        ORDER BY f.criado_em DESC
      `).all();
    } catch (error) {
      console.error('[DB] Erro ao buscar flashcards:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:getParaRevisao', () => {
    try {
      const db = getDB();
      return db.prepare(`
        SELECT f.*, m.nome as materia_nome, m.cor as materia_cor
        FROM flashcards f
        LEFT JOIN materias m ON f.materia_id = m.id
        WHERE f.next_review IS NULL OR f.next_review <= datetime('now', 'localtime')
        ORDER BY f.next_review ASC
      `).all();
    } catch (error) {
      console.error('[DB] Erro ao buscar flashcards para revisao:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:create', (event, card) => {
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT INTO flashcards (id, nota_id, materia_id, frente, verso, intervalo, repeticoes, ease_factor, next_review)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        card.id,
        card.nota_id || null,
        card.materia_id || null,
        card.frente,
        card.verso,
        card.intervalo || 1,
        card.repeticoes || 0,
        card.ease_factor || 2.5,
        card.next_review || null
      );

      return card;
    } catch (error) {
      console.error('[DB] Erro ao criar flashcard:', error);
      throw error;
    }
  });

  // I2: Usa módulo puro sm2.js
  ipcMain.handle('db-flashcards:revisar', (event, { id, qualidade }) => {
    try {
      const db = getDB();
      const row = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
      if (!row) return false;

      const calc = calculateNextReview(row, qualidade);

      const info = db.prepare(`
        UPDATE flashcards SET
          intervalo = ?,
          repeticoes = ?,
          ease_factor = ?,
          lapses = ?,
          state = ?,
          step_index = ?,
          next_review = ?
        WHERE id = ?
      `).run(
        calc.intervalo,
        calc.repeticoes,
        calc.ease_factor,
        calc.lapses,
        calc.state,
        calc.step_index,
        calc.next_review,
        id
      );

      return info.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao revisar flashcard:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:update', (event, { id, updates }) => {
    try {
      const db = getDB();
      const fields = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      values.push(id);

      const stmt = db.prepare(`
        UPDATE flashcards
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao atualizar flashcard:', error);
      throw error;
    }
  });

  ipcMain.handle('db-flashcards:delete', (event, id) => {
    try {
      const db = getDB();
      const stmt = db.prepare('DELETE FROM flashcards WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('[DB] Erro ao deletar flashcard:', error);
      throw error;
    }
  });
}
