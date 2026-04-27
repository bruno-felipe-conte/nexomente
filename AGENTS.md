%% INÍCIO - AGENTS %%

## CodeGraph

This project has a CodeGraph knowledge graph (`.codegraph/`).

### 1. Queries (prefira em vez de grep)

```bash
codegraph query "useFlashcards"         # Find symbol by name
codegraph status                     # Index stats
codegraph context "task description"   # Build context for AI
```

### 2. Index Stats

- 616 nodes · 900 edges · 93 files
- God nodes: React, NexoMente, Framer Motion, useFlashcards(), parseArquivo()
- Languages: JSX (48), JavaScript (40), Python (4), TypeScript (1)
- DB: .codegraph/codegraph.db (1.55 MB)

### 3. After modifying code

```bash
codegraph sync    # Incremental update
codegraph index  # Full re-index
```

### 4. Learnings (memória entre sessões)

```bash
/learn           # Mostre learnings recentes
/learn search "termo"  # Pesquise
/learn stats    # Estatísticas
```

---

## Contextualização

Always start by reading the graphify report to answer architecture/codebase questions.

%% FIM - AGENTS %%

## gstack

Use as skills gstack para fluxos de trabalho estruturados. Skills disponíveis:
- /office-hours — interrogatório de produto com 6 perguntas_forçantes
- /plan-ceo-review — desafio estratégico com 4 modos de escopo
- /plan-eng-review — arquitetura, data flow, edge cases
- /plan-design-review — auditoria de design 0-10 por dimensão
- /review — revisão de código, auto-corrige bugs óbvios
- /qa — test seu app, encontre bugs, gere testes de regressão
- /ship — engineer de release: sync, test, push, abra PR
- /investigate — metodologia de debugging de causa raiz
- /learn — gestão de memória entre sessões
- /autoplan — rod CEO → design → eng review automaticamente
- /codex — segunda opinião do OpenAI Codex CLI
- /careful, /freeze, /guard — rails de segurança

Para carregar: Load gstack. Run /<skill>