# E2: Design Doc — Sync Engine CRDT (Yjs/Automerge) & Schema Evolution

## 1. Visão Geral e Objetivos

O objetivo do módulo **E2** é transformar o NexoMente em uma plataforma **local-first com sincronização sem conflito (CRDT)** entre múltiplos dispositivos (Desktop, Web e Mobile futuro), eliminando a perda de dados e habilitando colaboração ou múltiplos aparelhos operando offline.

### Metas Principais:
1. **Zero Data Loss & Resolução Automática de Conflitos**: Utilização de CRDTs (Conflict-free Replicated Data Types) para mesclagem automática determinística.
2. **Schema com Vector Clocks / Version Vectors**: Rastreamento de autoria, timestamps lógicos e causalidade nas entidades centrais (`notas`, `flashcards`, `poemas`, `materias`).
3. **P2P Local-first & Gateway Flexível**: Suporte a sincronização direta via WebRTC / WebSocket local (mesma rede Wi-Fi) sem dependência obrigatória de nuvem central.
4. **Retrocompatibilidade e Degradação Graciosa**: O banco SQLite existente (`better-sqlite3`) continua sendo a fonte de persistência local relacional ultrarrápida, enquanto o CRDT atua como o motor de replicação e reconciliação.

---

## 2. Escolha Tecnológica: Yjs vs Automerge

| Critério | Yjs | Automerge | Decisão para NexoMente |
| :--- | :--- | :--- | :--- |
| **Performance com Rich Text (TipTap/ProseMirror)** | Excelente (`y-prosemirror`) | Boa | **Yjs** possui integração nativa de primeira classe com TipTap |
| **Footprint de Memória** | Muito Baixo (otimizado em C++/Rust/JS) | Moderado | **Yjs** é significativamente mais leve para Electron |
| **Ecossistema de Provedores** | `y-webrtc`, `y-websocket`, `y-indexeddb` | Automerge Repo | **Yjs** possui ecossistema maduro para P2P e local-first |
| **Persistência Relacional** | Adaptadores binários (Doc State Updates) | Sync Message States | **Yjs** converte updates para Uint8Array compactos |

> **Decisão de Arquitetura:** Adotar **Yjs** como base CRDT para documentos de texto rico (TipTap) e estado replicado de coleções.

---

## 3. Modelo de Dados e Evolução do Schema SQLite

Para rastrear causalidade e updates incrementais entre nós, as tabelas sincronizáveis recebem campos padronizados:

- `last_modified_at`: Timestamp Unix Epoch (ms) da última alteração no dispositivo emissor.
- `client_id`: Identificador único do dispositivo/instalação (UUID v4 persistido no storage seguro).
- `vector_clock`: Representação JSON do relógio vetorial `{ [clientId: string]: number }`.
- `deleted_at`: Soft-delete (tombstone) para propagar exclusões sem quebrar integridade referencial.
- `crdt_state`: Blob ou Base64 binário contendo a codificação dos updates Yjs (`Y.encodeStateAsUpdate(doc)`).

### Nova Migração Versionada (`003_crdt_sync_schema.sql`):
```sql
-- 003_crdt_sync_schema.sql
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

-- Tabela de Metadados de Nós Replicadores
CREATE TABLE IF NOT EXISTS sync_peers (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  last_seen_at INTEGER,
  sync_state TEXT DEFAULT '{}'
);
```

---

## 4. Arquitetura de Comunicação e Reconciliação (P2P + Hybrid)

```mermaid
flowchart TD
    subgraph Dispositivo A (Electron Desktop)
        DB_A[(SQLite Local)] <--> Repos_A[Repositórios Factory]
        Repos_A <--> Engine_A[CRDT Sync Engine]
        Engine_A <--> YDoc_A[Yjs Doc State]
    end

    subgraph Canal de Reconciliação
        P2P[P2P WebRTC / Local WebSocket / Encrypted Sync Server]
    end

    subgraph Dispositivo B (NexoMente Mobile / Web)
        YDoc_B[Yjs Doc State] <--> Engine_B[CRDT Sync Engine]
        Engine_B <--> Repos_B[Repositórios / IndexedDB / SQLite]
        Repos_B <--> DB_B[(Storage Local)]
    end

    Engine_A <==>|Troca de Updates Uint8Array| P2P
    P2P <==>|Reconciliação Automática| Engine_B
```

### Algoritmo de Sincronização em 3 Passos:
1. **Handshake & Vector Clock Comparison**:
   - Cada peer troca seus `vector_clocks` compactados. Se o nó local tiver versões desconhecidas pelo peer, envia a diferença.
2. **Diff State Application (Yjs State Vector)**:
   - Troca de `Y.encodeStateVector(doc)` para calcular exatamente quais deltas `Y.diffUpdate(doc, stateVector)` precisam ser enviados.
3. **Persistência Atômica no SQLite**:
   - Ao receber os deltas, o nó local mescla via `Y.applyUpdate(doc, delta)` e consolida as colunas relacionais no SQLite dentro de uma transação protegida.

---

## 5. Próximos Passos de Implementação (Roadmap Fase 3)
1. **Passo 1 (Schema):** Criar `electron/db/migrations/003_crdt_sync_schema.sql` com colunas de causalidade.
2. **Passo 2 (Módulo CRDT Core):** Criar `app/src/lib/sync/crdtEngine.js` com primitivas de criação e mesclagem de YDoc.
3. **Passo 3 (Adapter de Rede):** Integrar protocolo P2P local (BroadcastChannel para tabs e WebSocket/WebRTC para multi-device).
