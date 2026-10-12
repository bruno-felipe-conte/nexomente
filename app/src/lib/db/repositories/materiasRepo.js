export function createMateriasRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM materias ORDER BY nome");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        nome: row[1],
        cor: row[2],
        icone: row[3],
        meta_horas: row[4],
        created_at: row[5],
      }));
    },

    getById: (id) => {
      const db = get().db;
      if (!db) return null;
      const result = db.exec("SELECT * FROM materias WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return null;
      const row = result[0].values[0];
      return {
        id: row[0],
        nome: row[1],
        cor: row[2],
        icone: row[3],
        meta_horas: row[4],
        created_at: row[5],
      };
    },

    create: (materia) => {
      const db = get().db;
      if (!db) return;
      const id = materia.id || `materia_${Date.now()}`;
      db.run(
        "INSERT INTO materias (id, nome, cor, icone, meta_horas) VALUES (?, ?, ?, ?, ?)",
        [id, materia.nome, materia.cor || '#6C63FF', materia.icone || 'book', materia.meta_horas || 0]
      );
      saveDB();
      return id;
    },

    update: (id, updates) => {
      const db = get().db;
      if (!db) return false;
      const fields = [];
      const values = [];
      if (updates.nome !== undefined) { fields.push('nome = ?'); values.push(updates.nome); }
      if (updates.cor !== undefined) { fields.push('cor = ?'); values.push(updates.cor); }
      if (updates.icone !== undefined) { fields.push('icone = ?'); values.push(updates.icone); }
      if (updates.meta_horas !== undefined) { fields.push('meta_horas = ?'); values.push(updates.meta_horas); }
      if (fields.length === 0) return false;
      values.push(id);
      db.run(`UPDATE materias SET ${fields.join(', ')} WHERE id = ?`, values);
      saveDB();
      return true;
    },

    delete: (id) => {
      const db = get().db;
      if (!db) return false;
      db.run("DELETE FROM materias WHERE id = ?", [id]);
      saveDB();
      return true;
    },
  };
}
