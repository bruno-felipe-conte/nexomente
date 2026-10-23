import { app } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export async function initDB() {
  if (db) return db;
  try {
    const Database = await import('better-sqlite3');
    const dbPath = join(app.getPath('userData'), 'nexomente.db');
    db = new Database.default(dbPath);

    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS pastas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        parent_id TEXT,
        cor TEXT DEFAULT '#6C63FF',
        icone TEXT DEFAULT 'folder',
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notas (
        id TEXT PRIMARY KEY,
        pasta_id TEXT NOT NULL,
        tipo TEXT DEFAULT 'nota',
        titulo TEXT NOT NULL,
        conteudo TEXT,
        tags TEXT, -- JSON string
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ativo',
        FOREIGN KEY (pasta_id) REFERENCES pastas (id)
      );

      CREATE TABLE IF NOT EXISTS materias (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cor TEXT DEFAULT '#6C63FF',
        icone TEXT DEFAULT 'book',
        meta_horas INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessoes_estudo (
        id TEXT PRIMARY KEY,
        materia_id TEXT,
        tipo TEXT DEFAULT 'pomodoro',
        duracao_minutos INTEGER DEFAULT 25,
        concluida BOOLEAN DEFAULT 0,
        started_at TEXT,
        ended_at TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (materia_id) REFERENCES materias (id)
      );

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
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nota_id) REFERENCES notas (id),
        FOREIGN KEY (materia_id) REFERENCES materias (id)
      );

      CREATE TABLE IF NOT EXISTS transacoes_xp (
        id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL,
        motivo TEXT,
        source_type TEXT,
        source_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- I5: Índices de Alta Performance SQLite
      CREATE INDEX IF NOT EXISTS idx_notas_pasta_id ON notas (pasta_id);
      CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards (next_review);
      CREATE INDEX IF NOT EXISTS idx_sessoes_materia_started ON sessoes_estudo (materia_id, started_at);
      CREATE INDEX IF NOT EXISTS idx_flashcards_materia ON flashcards (materia_id);
    `);

    // Insert root pasta if it doesn't exist
    const rootPasta = db.prepare('SELECT * FROM pastas WHERE id = ?').get('pasta_raiz');
    if (!rootPasta) {
      db.prepare(`
        INSERT INTO pastas (id, nome, cor, icone)
        VALUES (?, ?, ?, ?)
      `).run('pasta_raiz', 'Minha Biblioteca', '#6C63FF', 'library');
    }

    // Remove poemas de seed legados (p1, p2) para garantir início 100% limpo
    db.prepare(`DELETE FROM poemas WHERE id IN ('p1', 'p2')`).run();

    console.log('[DATABASE] SQLite nativo inicializado com sucesso em:', dbPath);

    // I4 & E2: Executa migrações versionadas de schema SQLite (001, 002, 003...)
    try {
      const migrationsDir = join(__dirname, 'migrations');
      runMigrations(db, migrationsDir);
    } catch (migErr) {
      console.warn('[DATABASE] Aviso ao aplicar migrações:', migErr.message);
    }

    // Agenda backup automático diário
    import('./backupService.js').then(({ performDatabaseBackup }) => {
      performDatabaseBackup().catch(err => console.warn('[DATABASE] Backup diário falhou:', err.message));
    }).catch(() => {});

    return db;
  } catch (error) {
    console.error('[DATABASE] Erro ao inicializar SQLite:', error);
    throw error;
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database não inicializado. Chame initDB() primeiro.');
  }
  return db;
}

export function closeDB() {
  if (db) {
    try {
      db.close();
      db = null;
      console.log('[DATABASE] Conexão com SQLite encerrada com segurança.');
    } catch (err) {
      console.error('[DATABASE] Erro ao fechar banco de dados:', err);
    }
  }
}
