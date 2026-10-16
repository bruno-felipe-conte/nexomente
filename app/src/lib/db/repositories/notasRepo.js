const VALID_TIPOS = ['livro', 'projeto', 'ideia', 'lembrete', 'diario', 'biblia', 'estudo', 'nota', 'referencia'];
const TIPO_MAP = { livros: 'livro', projetos: 'projeto', ideias: 'ideia', referencia: 'nota' };

function normalizeTipo(rawTipo, allowReferencia = false) {
  const mapped = TIPO_MAP[rawTipo] || rawTipo || 'nota';
  if (allowReferencia && rawTipo === 'referencia') return 'referencia';
  return VALID_TIPOS.includes(mapped) ? mapped : 'nota';
}

function mapNotaRow(row) {
  return {
    id: row[0],
    pasta_id: row[1],
    tipo: row[2],
    titulo: row[3],
    conteudo: row[4],
    tags: JSON.parse(row[5] || '[]'),
    criado_em: row[6],
    atualizado_em: row[7],
    status: row[8] || 'ativo',
    autor: row[9] || '',
    pagina_atual: row[10] ?? 0,
    total_paginas: row[11] ?? 0,
    avaliacao: row[12] ?? 0,
    prioridade: row[13] || null,
    data_lembrete: row[14] || null,
    materia: row[15] || null,
    resumo_ia: row[16] || '',
  };
}

export function createNotasRepository(get, saveDB) {
  return {
    getAll: () => {
      const db = get().db;
      if (!db) return [];
      const result = db.exec("SELECT * FROM notas WHERE status NOT IN ('deletado', 'lixeira') ORDER BY atualizado_em DESC");
      if (!result[0]) return [];
      return result[0].values.map(mapNotaRow);
    },

    getById: (id) => {
      const db = get().db;
      if (!db) return null;
      const result = db.exec("SELECT * FROM notas WHERE id = ?", [id]);
      if (!result[0]?.values[0]) return null;
      return mapNotaRow(result[0].values[0]);
    },

    search: (query) => {
      const db = get().db;
      if (!db || !query) return [];
      const result = db.exec(`
        SELECT * FROM notas
        WHERE (titulo LIKE ? OR conteudo LIKE ?)
        AND status NOT IN ('deletado', 'lixeira')
        ORDER BY atualizado_em DESC
        LIMIT 50
      `, [`%${query}%`, `%${query}%`]);
      if (!result[0]) return [];
      return result[0].values.map(mapNotaRow);
    },

    create: (nota) => {
      const db = get().db;
      if (!db) return;
      const id = nota.id || `nota_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const safeTipo = normalizeTipo(nota.tipo);
      const safeStatus = nota.status && !['deletado', 'lixeira'].includes(nota.status) ? nota.status : 'ativo';
      db.run(
        "INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags, status, autor, pagina_atual, total_paginas, avaliacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          nota.pasta_id || 'pasta_raiz',
          safeTipo,
          nota.titulo || 'Nova Nota',
          nota.conteudo || '',
          JSON.stringify(nota.tags || []),
          safeStatus,
          nota.autor || '',
          nota.pagina_atual ?? 0,
          nota.total_paginas ?? 0,
          nota.avaliacao ?? 0,
        ]
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
      if (updates.tipo !== undefined) {
        fields.push('tipo = ?');
        values.push(normalizeTipo(updates.tipo));
      }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      if (updates.autor !== undefined) { fields.push('autor = ?'); values.push(updates.autor); }
      if (updates.pagina_atual !== undefined) { fields.push('pagina_atual = ?'); values.push(updates.pagina_atual); }
      if (updates.total_paginas !== undefined) { fields.push('total_paginas = ?'); values.push(updates.total_paginas); }
      if (updates.avaliacao !== undefined) { fields.push('avaliacao = ?'); values.push(updates.avaliacao); }
      if (updates.resumo_ia !== undefined) {
        try {
          db.run("ALTER TABLE notas ADD COLUMN resumo_ia TEXT");
        } catch {
          // Coluna já existe
        }
        fields.push('resumo_ia = ?');
        values.push(updates.resumo_ia);
      }
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
