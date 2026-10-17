import ankiSRS from '../../../hooks/sm2';

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
        materia: row[2] || 'geral',
        frente: row[3],
        verso: row[4],
        intervalo: row[5],
        repeticoes: row[6],
        repetitions: row[6],
        ease_factor: row[7],
        ef: row[7],
        next_review: row[8],
        lapses: row[9] ?? 0,
        state: row[10] || 'new',
        stepIndex: row[11] ?? 0,
        created_at: row[12] || row[9],
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
        materia: row[2] || 'geral',
        frente: row[3],
        verso: row[4],
        intervalo: row[5],
        repeticoes: row[6],
        repetitions: row[6],
        ease_factor: row[7],
        ef: row[7],
        next_review: row[8],
        lapses: row[9] ?? 0,
        state: row[10] || 'new',
        stepIndex: row[11] ?? 0,
      }));
    },

    create: (card) => {
      const db = get().db;
      if (!db) return;
      const id = card.id || `fc_${Date.now()}`;
      const materiaVal = card.materia_id ?? card.materia ?? 'geral';
      db.run(
        "INSERT INTO flashcards (id, nota_id, materia_id, frente, verso, state) VALUES (?, ?, ?, ?, ?, ?)",
        [id, card.nota_id ?? null, materiaVal, card.frente, card.verso, 'new']
      );
      saveDB();
      return id;
    },

    revisar: (id, qualidade) => {
      const db = get().db;
      if (!db) return;

      const result = db.exec("SELECT intervalo, repeticoes, ease_factor, lapses, state, step_index FROM flashcards WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return;

      const [intervalo, repeticoes, ease_factor, lapses, state, step_index] = result[0].values[0];
      const cardAtual = {
        intervalo: intervalo || 0,
        repeticoes: repeticoes || 0,
        ease_factor: ease_factor || 2.5,
        lapses: lapses || 0,
        state: state || 'new',
        stepIndex: step_index || 0,
      };

      const srsResult = ankiSRS(cardAtual, qualidade);

      db.run(
        `UPDATE flashcards SET
          intervalo = ?,
          repeticoes = ?,
          ease_factor = ?,
          lapses = ?,
          state = ?,
          step_index = ?,
          next_review = ?
        WHERE id = ?`,
        [
          srsResult.intervalo ?? 0,
          srsResult.repeticoes ?? srsResult.repetitions ?? 0,
          srsResult.ease_factor ?? srsResult.ef ?? 2.5,
          srsResult.lapses ?? 0,
          srsResult.state ?? 'review',
          srsResult.stepIndex ?? 0,
          srsResult.next_review ?? new Date().toISOString(),
          id
        ]
      );
      saveDB();
      return srsResult;
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
      if (updates.lapses !== undefined) { fields.push('lapses = ?'); values.push(updates.lapses); }
      if (updates.state !== undefined) { fields.push('state = ?'); values.push(updates.state); }
      if (updates.stepIndex !== undefined || updates.step_index !== undefined) {
        fields.push('step_index = ?');
        values.push(updates.stepIndex ?? updates.step_index);
      }
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
