export function createPastasRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM pastas ORDER BY nome");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        nome: row[1],
        parent_id: row[2],
        cor: row[3],
        icone: row[4],
        created_at: row[5],
      }));
    },

    create: (pasta) => {
      const db = get().db;
      if (!db) return;
      const id = pasta.id || `pasta_${Date.now()}`;
      db.run(
        "INSERT INTO pastas (id, nome, parent_id, cor, icone) VALUES (?, ?, ?, ?, ?)",
        [id, pasta.nome, pasta.parent_id || null, pasta.cor || '#6C63FF', pasta.icone || 'folder']
      );
      saveDB();
      return id;
    },
  };
}
