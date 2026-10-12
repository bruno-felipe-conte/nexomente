export function createNotasRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM notas WHERE status = 'ativo' ORDER BY atualizado_em DESC");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        pasta_id: row[1],
        tipo: row[2],
        titulo: row[3],
        conteudo: row[4],
        tags: JSON.parse(row[5] || '[]'),
        criado_em: row[6],
        atualizado_em: row[7],
        status: row[8],
      }));
    },

    getById: (id) => {
      const db = get().db;
      if (!db) return null;
      const result = db.exec("SELECT * FROM notas WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return null;
      const row = result[0].values[0];
      return {
        id: row[0],
        pasta_id: row[1],
        tipo: row[2],
        titulo: row[3],
        conteudo: row[4],
        tags: JSON.parse(row[5] || '[]'),
        criado_em: row[6],
        atualizado_em: row[7],
        status: row[8],
      };
    },

    search: (query) => {
      const db = get().db;
      if (!db || !query) return [];
      const result = db.exec(`
        SELECT * FROM notas
        WHERE (titulo LIKE ? OR conteudo LIKE ?)
        AND status = 'ativo'
        ORDER BY atualizado_em DESC
        LIMIT 50
      `, [`%${query}%`, `%${query}%`]);
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        pasta_id: row[1],
        tipo: row[2],
        titulo: row[3],
        conteudo: row[4],
        tags: JSON.parse(row[5] || '[]'),
        criado_em: row[6],
        atualizado_em: row[7],
        status: row[8],
      }));
    },

    create: (nota) => {
      const db = get().db;
      if (!db) return;
      const id = nota.id || `nota_${Date.now()}`;
      db.run(
        "INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags) VALUES (?, ?, ?, ?, ?, ?)",
        [id, nota.pasta_id || 'pasta_raiz', nota.tipo || 'nota', nota.titulo, nota.conteudo || '', JSON.stringify(nota.tags || [])]
      );
      saveDB();
      return id;
    },

    update: (id, updates) => {
      const db = get().db;
      if (!db) return;
      const fields = [];
      const values = [];
      if (updates.titulo !== undefined) { fields.push('titulo = ?'); values.push(updates.titulo); }
      if (updates.conteudo !== undefined) { fields.push('conteudo = ?'); values.push(updates.conteudo); }
      if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
      if (updates.pasta_id !== undefined) { fields.push('pasta_id = ?'); values.push(updates.pasta_id); }
      if (updates.tipo !== undefined) { fields.push('tipo = ?'); values.push(updates.tipo); }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      fields.push("atualizado_em = datetime('now')");
      values.push(id);
      db.run(`UPDATE notas SET ${fields.join(', ')} WHERE id = ?`, values);
      saveDB();
    },

    delete: (id) => {
      const db = get().db;
      if (!db) return;
      db.run("UPDATE notas SET status = 'deletado' WHERE id = ?", [id]);
      saveDB();
    },
  };
}
