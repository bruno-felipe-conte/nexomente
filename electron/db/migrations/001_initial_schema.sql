-- 001_initial_schema.sql
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
  tags TEXT,
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
