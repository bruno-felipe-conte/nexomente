import { create } from 'zustand';
import { initDB, saveDB, getDB, createTables, dbPromise, setOnSaveCallback } from '../lib/db/wasmEngine';

export { initDB, saveDB, getDB, createTables, dbPromise };

export const useDBStore = create((set, get) => ({
  db: null,
  loading: true,
  error: null,
  totalXP: 0,
  version: 0,
  
  incrementVersion: () => set(state => ({ version: state.version + 1 })),
  
  init: async () => {
    try {
      const db = await initDB();
      set({ db, loading: false });
      get().syncXP();
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  syncXP: () => {
    const total = get().XP.getTotal();
    set({ totalXP: total });
  },
  
 Notas: {
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
        `INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags) VALUES (?, ?, ?, ?, ?, ?)`,
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
  },
  
  Pastas: {
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
  },
  
  Materias: {
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
  },
  
  SessoesEstudo: {
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
  },
  
  Flashcards: {
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
        "INSERT INTO flashcards (id, nota_id, materia_id, frente, verso) VALUES (?, ?, ?, ?)",
        [id, card.nota_id, card.materia_id, card.frente, card.verso]
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
  },
  
  XP: {
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
  },

  Poemas: {
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
        const now = new Date().toISOString();
        const stmt = db.prepare(`INSERT INTO poemas (id, titulo, autor, corpo, epoca, tema, forma, tags, notas_usuario, ano) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        list.forEach(p => {
          const id = `poema_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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
  },
}));

setOnSaveCallback(() => {
  if (useDBStore.getState().incrementVersion) {
    useDBStore.getState().incrementVersion();
  }
});