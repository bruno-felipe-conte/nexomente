// ============================================================================
// NexoMente SQL.js WASM Database Engine
// ============================================================================

let dbInstance = null;
let initResolve = null;
let initReject = null;
let onSaveCallback = null;

export function setOnSaveCallback(callback) {
  onSaveCallback = callback;
}

export const dbPromise = new Promise((resolve, reject) => {
  initResolve = resolve;
  initReject = reject;
});

export async function initDB() {
  if (dbInstance) return dbInstance;

  // No ambiente Node/teste ou navegador com dynamic import
  let initSql = typeof window !== 'undefined' ? window.initSqlJs : null;

  if (!initSql) {
    try {
      const sqlModule = await import('sql.js');
      initSql = sqlModule.default || sqlModule;
    } catch {
      // Ignora falha de import dinamico se indisponivel no bundle
    }
  }

  // Aguarda o script global SQL.js ser carregado se ainda não estiver disponível
  let attempts = 0;
  while (!initSql && attempts < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
    if (typeof window !== 'undefined' && window.initSqlJs) {
      initSql = window.initSqlJs;
    }
  }

  try {
    if (!initSql) throw new Error("Falha ao carregar motor SQL. Verifique o index.html.");

    const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
    const SQL = await initSql(isNode ? {} : {
      locateFile: () => `https://unpkg.com/sql.js@1.12.0/dist/sql-wasm.wasm`
    });

    const savedData = typeof localStorage !== 'undefined' ? localStorage.getItem('nexomente_db') : null;
    if (savedData) {
      try {
        const data = Uint8Array.from(atob(savedData), c => c.charCodeAt(0));
        dbInstance = new SQL.Database(data);
      } catch (dbErr) {
        console.error("Banco de dados corrompido, reiniciando...", dbErr);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('nexomente_db');
        dbInstance = new SQL.Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    createTables(dbInstance);
    if (initResolve) initResolve(dbInstance);
    return dbInstance;
  } catch (error) {
    if (initReject) initReject(error);
    throw error;
  }
}

export function createTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS pastas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      parent_id TEXT,
      cor TEXT DEFAULT '#6C63FF',
      icone TEXT DEFAULT 'folder',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      pasta_id TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('livro', 'projeto', 'ideia', 'lembrete', 'diario', 'biblia', 'estudo', 'nota')),
      titulo TEXT NOT NULL,
      conteudo TEXT,
      tags TEXT DEFAULT '[]',
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'ativo',
      autor TEXT,
      pagina_atual INTEGER,
      total_paginas INTEGER,
      avaliacao INTEGER,
      prioridade TEXT,
      data_lembrete TEXT,
      materia TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS materias (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cor TEXT NOT NULL,
      icone TEXT DEFAULT 'book',
      meta_horas REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessoes_estudo (
      id TEXT PRIMARY KEY,
      materia_id TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('pomodoro', 'livre', 'foco', 'descanso')),
      duracao_minutos INTEGER NOT NULL,
      concluida INTEGER DEFAULT 0,
      started_at TEXT,
      ended_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      nota_id TEXT,
      materia_id TEXT,
      frente TEXT NOT NULL,
      verso TEXT NOT NULL,
      intervalo INTEGER DEFAULT 1,
      repeticoes INTEGER DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,
      next_review TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transacoes_xp (
      id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL,
      motivo TEXT,
      source_type TEXT,
      source_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS poemas (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT,
      corpo TEXT NOT NULL,
      epoca TEXT,
      tema TEXT DEFAULT '[]',
      forma TEXT,
      tags TEXT DEFAULT '[]',
      notas_usuario TEXT,
      ano TEXT,
      streak_recitacao INTEGER DEFAULT 0,
      ultima_recitacao TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const pastas = db.exec("SELECT COUNT(*) as count FROM pastas")[0]?.values[0][0] || 0;
  if (pastas === 0) {
    db.run("INSERT INTO pastas (id, nome, cor, icone) VALUES (?, ?, ?, ?)",
      ['pasta_raiz', 'Minha Biblioteca', '#6C63FF', 'library']);
  }

  const poemasCount = db.exec("SELECT COUNT(*) as count FROM poemas")[0]?.values[0][0] || 0;
  if (poemasCount === 0) {
    const seedPoemas = [
      {
        id: 'p1',
        titulo: 'Mar Português',
        autor: 'Fernando Pessoa',
        corpo: 'Ó mar salgado, quanto do teu sal\nSão lágrimas de Portugal!\nPor te cruzarmos, quantas mães choraram,\nQuantos filhos em vão rezaram!\nQuantas noivas ficaram por casar\nPara que fosses nosso, ó mar!',
        epoca: 'Modernismo'
      },
      {
        id: 'p2',
        titulo: 'Amor é um fogo que arde sem se ver',
        autor: 'Luís de Camões',
        corpo: 'Amor é um fogo que arde sem se ver;\nÉ ferida que dói, e não se sente;\nÉ um contentamento descontente;\nÉ dor que desatina sem doer.',
        epoca: 'Renascimento'
      }
    ];
    seedPoemas.forEach(p => {
      db.run("INSERT INTO poemas (id, titulo, autor, corpo, epoca) VALUES (?, ?, ?, ?, ?)",
        [p.id, p.titulo, p.autor, p.corpo, p.epoca]);
    });
  }

  saveDB();
}

export function saveDB() {
  if (!dbInstance || typeof localStorage === 'undefined') return;
  try {
    const data = dbInstance.export();
    const bytes = new Uint8Array(data);
    const chunkSize = 0x8000; // 32KB chunks para evitar estouro da pilha de chamadas
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    localStorage.setItem('nexomente_db', base64);

    setTimeout(() => {
      if (typeof onSaveCallback === 'function') {
        onSaveCallback();
      }
    }, 0);
  } catch (err) {
    console.error('Erro crítico ao salvar banco de dados:', err);
    if (err?.name === 'QuotaExceededError' && typeof alert === 'function') {
      alert('Aviso: Espaço de armazenamento cheio. Remova alguns itens para continuar salvando.');
    }
  }
}

export function getDB() {
  return dbInstance;
}
