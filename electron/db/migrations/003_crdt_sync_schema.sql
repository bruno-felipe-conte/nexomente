-- 003_crdt_sync_schema.sql
-- Adiciona suporte a Version Vectors, rastreamento de causalidade e CRDT State

ALTER TABLE notas ADD COLUMN client_id TEXT;
ALTER TABLE notas ADD COLUMN vector_clock TEXT DEFAULT '{}';
ALTER TABLE notas ADD COLUMN last_modified_at INTEGER DEFAULT 0;
ALTER TABLE notas ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE notas ADD COLUMN crdt_state BLOB;

ALTER TABLE flashcards ADD COLUMN client_id TEXT;
ALTER TABLE flashcards ADD COLUMN vector_clock TEXT DEFAULT '{}';
ALTER TABLE flashcards ADD COLUMN last_modified_at INTEGER DEFAULT 0;
ALTER TABLE flashcards ADD COLUMN deleted_at INTEGER DEFAULT NULL;

ALTER TABLE poemas ADD COLUMN client_id TEXT;
ALTER TABLE poemas ADD COLUMN vector_clock TEXT DEFAULT '{}';
ALTER TABLE poemas ADD COLUMN last_modified_at INTEGER DEFAULT 0;
ALTER TABLE poemas ADD COLUMN deleted_at INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS sync_peers (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  last_seen_at INTEGER,
  sync_state TEXT DEFAULT '{}'
);
