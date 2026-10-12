export function createSessoesRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM sessoes_estudo ORDER BY started_at DESC LIMIT 50");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        materia_id: row[1],
        tipo: row[2],
        duracao_minutos: row[3],
        concluida: row[4] === 1,
        started_at: row[5],
        ended_at: row[6],
      }));
    },

    create: (sessao) => {
      const db = get().db;
      if (!db) return;
      const id = sessao.id || `sessao_${Date.now()}`;
      db.run(
        "INSERT INTO sessoes_estudo (id, materia_id, tipo, duracao_minutos, started_at) VALUES (?, ?, ?, ?, datetime('now'))",
        [id, sessao.materia_id, sessao.tipo || 'pomodoro', sessao.duracao_minutos || 25]
      );
      saveDB();
      return id;
    },

    completar: (id) => {
      const db = get().db;
      if (!db) return;
      db.run("UPDATE sessoes_estudo SET concluida = 1, ended_at = datetime('now') WHERE id = ?", [id]);
      saveDB();
    },
  };
}
