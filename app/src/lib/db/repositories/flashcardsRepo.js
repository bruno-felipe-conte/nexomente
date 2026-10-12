export function createFlashcardsRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM flashcards ORDER BY created_at DESC");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        nota_id: row[1],
        materia_id: row[2],
        frente: row[3],
        verso: row[4],
        intervalo: row[5],
        repeticoes: row[6],
        ease_factor: row[7],
        next_review: row[8],
        created_at: row[9],
      }));
    },

    getParaRevisao: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM flashcards WHERE next_review IS NULL OR next_review <= datetime('now') ORDER BY next_review");
      if (!result[0]) return [];
      return result[0].values.map(row => ({
        id: row[0],
        nota_id: row[1],
        materia_id: row[2],
        frente: row[3],
        verso: row[4],
        intervalo: row[5],
        repeticoes: row[6],
        ease_factor: row[7],
        next_review: row[8],
      }));
    },

    create: (card) => {
      const db = get().db;
      if (!db) return;
      const id = card.id || `fc_${Date.now()}`;
      db.run(
        "INSERT INTO flashcards (id, nota_id, materia_id, frente, verso) VALUES (?, ?, ?, ?, ?)",
        [id, card.nota_id ?? null, card.materia_id ?? null, card.frente, card.verso]
      );
      saveDB();
      return id;
    },

    revisar: (id, qualidade) => {
      const db = get().db;
      if (!db) return;

      const result = db.exec("SELECT intervalo, repeticoes, ease_factor FROM flashcards WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return;

      let [intervalo, repeticoes, ease_factor] = result[0].values[0];
      repeticoes = repeticoes || 0;
      ease_factor = ease_factor || 2.5;

      if (qualidade >= 3) {
        if (repeticoes === 0) intervalo = 1;
        else if (repeticoes === 1) intervalo = 6;
        else intervalo = Math.round(intervalo * ease_factor);
        repeticoes += 1;
      } else {
        repeticoes = 0;
        intervalo = 1;
      }

      ease_factor = ease_factor + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
      if (ease_factor < 1.3) ease_factor = 1.3;

      db.run(
        "UPDATE flashcards SET intervalo = ?, repeticoes = ?, ease_factor = ?, next_review = datetime('now', ? || ' days') WHERE id = ?",
        [intervalo, repeticoes, ease_factor, intervalo, id]
      );
      saveDB();
    },

    update: (id, updates) => {
      const db = get().db;
      if (!db) return false;
      const fields = [];
      const values = [];
      if (updates.frente !== undefined) { fields.push('frente = ?'); values.push(updates.frente); }
      if (updates.verso !== undefined) { fields.push('verso = ?'); values.push(updates.verso); }
      if (updates.materia_id !== undefined) { fields.push('materia_id = ?'); values.push(updates.materia_id); }
      if (updates.nota_id !== undefined) { fields.push('nota_id = ?'); values.push(updates.nota_id); }
      if (updates.intervalo !== undefined) { fields.push('intervalo = ?'); values.push(updates.intervalo); }
      if (updates.repeticoes !== undefined) { fields.push('repeticoes = ?'); values.push(updates.repeticoes); }
      if (updates.ease_factor !== undefined) { fields.push('ease_factor = ?'); values.push(updates.ease_factor); }
      if (updates.next_review !== undefined) { fields.push('next_review = ?'); values.push(updates.next_review); }
      if (fields.length === 0) return false;
      values.push(id);
      db.run(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`, values);
      saveDB();
      return true;
    },

    delete: (id) => {
      const db = get().db;
      if (!db) return false;
      db.run("DELETE FROM flashcards WHERE id = ?", [id]);
      saveDB();
      return true;
    },
  };
}
