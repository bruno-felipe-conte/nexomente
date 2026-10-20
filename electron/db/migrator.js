import fs from 'fs';
import path from 'path';

/**
 * Sistema de migrações versionadas do SQLite
 */
export function runMigrations(db, migrationsDir) {
  // Cria tabela de controle de versões se não existir
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  if (!fs.existsSync(migrationsDir)) {
    return { applied: 0, total: 0 };
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;

  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2];

    if (!appliedVersions.has(version)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      const runTransaction = db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, name);
      });

      runTransaction();
      console.log(`[MIGRATIONS] Migração aplicada: ${file}`);
      count++;
    }
  }

  return { applied: count, total: files.length };
}
