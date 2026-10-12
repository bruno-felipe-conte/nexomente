export function createPoemasRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM poemas ORDER BY created_at DESC");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        titulo: row[1],
        autor: row[2],
        corpo: row[3],
        epoca: row[4],
        tema: JSON.parse(row[5] || '[]'),
        forma: row[6],
        tags: JSON.parse(row[7] || '[]'),
        notas_usuario: row[8],
        ano: row[9],
        streak_recitacao: row[10],
        ultima_recitacao: row[11],
        created_at: row[12],
        updated_at: row[13]
      }));
    },

    getById: (id) => {
      const db = get().db;
      if (!db) return null;
      const result = db.exec("SELECT * FROM poemas WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return null;
      const row = result[0].values[0];
      return {
        id: row[0],
        titulo: row[1],
        autor: row[2],
        corpo: row[3],
        epoca: row[4],
        tema: JSON.parse(row[5] || '[]'),
        forma: row[6],
        tags: JSON.parse(row[7] || '[]'),
        notas_usuario: row[8],
        ano: row[9],
        streak_recitacao: row[10],
        ultima_recitacao: row[11],
        created_at: row[12],
        updated_at: row[13]
      };
    },

    createMany: (list) => {
      const db = get().db;
      if (!db || !Array.isArray(list)) return;
      try {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT INTO poemas (id, titulo, autor, corpo, epoca, tema, forma, tags, notas_usuario, ano) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        list.forEach(p => {
          const id = `poema_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          stmt.run([
            id, p.titulo || 'Sem título', p.autor || '', p.corpo || '',
            p.epoca || '', JSON.stringify(p.tema || []), p.forma || '',
            JSON.stringify(p.tags || []), p.notas_usuario || '', p.ano || ''
          ]);
        });

        stmt.free();
        db.run("COMMIT");
        saveDB();
      } catch (err) {
        db.run("ROLLBACK");
        console.error('Erro ao salvar lote de poemas:', err);
        throw err;
      }
    },

    create: (p) => {
      const db = get().db;
      if (!db) return;
      try {
        const id = p.id || `poema_${Date.now()}`;
        db.run(
          `INSERT INTO poemas (id, titulo, autor, corpo, epoca, tema, forma, tags, notas_usuario, ano)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            p.titulo,
            p.autor || '',
            p.corpo,
            p.epoca || '',
            JSON.stringify(p.tema || []),
            p.forma || '',
            JSON.stringify(p.tags || []),
            p.notas_usuario || '',
            p.ano || ''
          ]
        );
        saveDB();
        return id;
      } catch (err) {
        console.error('Erro ao criar poema:', err);
        return null;
      }
    },

    update: (id, updates) => {
      const db = get().db;
      if (!db) return;
      const fields = [];
      const values = [];

      const map = {
        titulo: 'titulo', autor: 'autor', corpo: 'corpo',
        epoca: 'epoca', forma: 'forma', notas_usuario: 'notas_usuario',
        ano: 'ano'
      };

      for (const [key, field] of Object.entries(map)) {
        if (updates[key] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(updates[key]);
        }
      }

      if (updates.tema !== undefined) {
        fields.push('tema = ?');
        values.push(JSON.stringify(updates.tema));
      }

      if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }

      if (fields.length === 0) return;

      fields.push("updated_at = datetime('now')");
      values.push(id);

      db.run(`UPDATE poemas SET ${fields.join(', ')} WHERE id = ?`, values);
      saveDB();
    },

    delete: (id) => {
      const db = get().db;
      if (!db) return;
      db.run("DELETE FROM poemas WHERE id = ?", [id]);
      saveDB();
    },

    registrarRecitacao: (id) => {
      const db = get().db;
      if (!db) return;
      const p = get().Poemas.getById(id);
      if (!p) return;

      const hoje = new Date().toISOString().split('T')[0];
      const ultima = p.ultima_recitacao ? p.ultima_recitacao.split('T')[0] : null;

      let novoStreak = p.streak_recitacao || 0;
      if (ultima !== hoje) {
        if (ultima) {
          const ontem = new Date();
          ontem.setDate(ontem.getDate() - 1);
          const ontemStr = ontem.toISOString().split('T')[0];
          if (ultima === ontemStr) novoStreak += 1;
          else novoStreak = 1;
        } else {
          novoStreak = 1;
        }
      }

      db.run(
        "UPDATE poemas SET streak_recitacao = ?, ultima_recitacao = ?, updated_at = datetime('now') WHERE id = ?",
        [novoStreak, new Date().toISOString(), id]
      );
      saveDB();
      return novoStreak;
    }
  };
}
