export function createXpRepository(get, saveDB) {
  return {
    getTotal: () => {
      const db = get().db;
      if (!db) return 0;
      const result = db.exec("SELECT COALESCE(SUM(xp), 0) FROM transacoes_xp");
      return result[0]?.values[0][0] || 0;
    },

    add: (xp, motivo, source_type, source_id) => {
      const db = get().db;
      if (!db) return;
      const id = `xp_${Date.now()}`;
      db.run(
        "INSERT INTO transacoes_xp (id, xp, motivo, source_type, source_id) VALUES (?, ?, ?, ?, ?)",
        [id, xp, motivo, source_type, source_id]
      );
      saveDB();
      get().syncXP();
    },
  };
}
