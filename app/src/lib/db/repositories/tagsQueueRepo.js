/**
 * Repositório para a fila persistente de tags (tags_queue) no SQLite WASM.
 *
 * Gerencia o ciclo de vida dos itens pendentes de auto-tagging
 * garantindo enfileiramento seguro em modo offline/local e dreno em lote.
 */

function mapQueueRow(row) {
  return {
    id: row[0],
    nota_id: row[1],
    attempts: Number(row[2] || 0),
    created_at: Number(row[3] || 0),
    last_attempt: row[4] != null ? Number(row[4]) : null,
    status: row[5] || 'pending',
  };
}

export function createTagsQueueRepository(get, saveDB) {
  return {
    enqueue: (notaId) => {
      const db = get().db;
      if (!db || !notaId) return null;

      // Se já estiver na fila como pendente, preserva e retorna o ID existente
      const existing = db.exec(
        "SELECT id FROM tags_queue WHERE nota_id = ? AND status = 'pending'",
        [notaId]
      );
      if (existing[0]?.values?.length > 0) {
        return existing[0].values[0][0];
      }

      // Remove qualquer entrada anterior com status diferente (ex: 'failed') para esta mesma nota
      db.run("DELETE FROM tags_queue WHERE nota_id = ?", [notaId]);

      const id = `tq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();
      db.run(
        "INSERT INTO tags_queue (id, nota_id, attempts, created_at, last_attempt, status) VALUES (?, ?, 0, ?, NULL, 'pending')",
        [id, notaId, now]
      );
      saveDB();
      return id;
    },

    peek: (limit = 10) => {
      const db = get().db;
      if (!db) return [];
      const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
      const result = db.exec(
        "SELECT id, nota_id, attempts, created_at, last_attempt, status FROM tags_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
        [safeLimit]
      );
      if (!result[0]?.values) return [];
      return result[0].values.map(mapQueueRow);
    },

    dequeue: (notaId) => {
      const db = get().db;
      if (!db || !notaId) return false;
      db.run("DELETE FROM tags_queue WHERE nota_id = ? OR id = ?", [notaId, notaId]);
      saveDB();
      return true;
    },

    markFailed: (notaId) => {
      const db = get().db;
      if (!db || !notaId) return;
      const now = Date.now();
      db.run(
        "UPDATE tags_queue SET attempts = attempts + 1, last_attempt = ?, status = 'failed' WHERE nota_id = ? OR id = ?",
        [now, notaId, notaId]
      );
      saveDB();
    },

    countPending: () => {
      const db = get().db;
      if (!db) return 0;
      const result = db.exec("SELECT COUNT(*) FROM tags_queue WHERE status = 'pending'");
      return result[0]?.values?.[0]?.[0] || 0;
    },

    clear: () => {
      const db = get().db;
      if (!db) return;
      db.run("DELETE FROM tags_queue");
      saveDB();
    },
  };
}
