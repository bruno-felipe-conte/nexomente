-- 002_add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_notas_pasta_id ON notas (pasta_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards (next_review);
CREATE INDEX IF NOT EXISTS idx_sessoes_materia_started ON sessoes_estudo (materia_id, started_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_materia ON flashcards (materia_id);
