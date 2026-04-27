# Graphify Migration Report

**Data de migração:** 2026-04-27

## Origem → Destino

- **Origem:** graphify (`.codegraph/`)
- **Destino:** CodeGraph (`@colbymchenry/codegraph`)

## Dados Migrados

| Métrica | graphify | CodeGraph | Diferença |
|---------|---------|----------|-----------|
| Nodes | 200 | 616 | +208% |
| Edges | 238 | 900 | +278% |
| Files | 60 | 93 | +55% |
| DB Size | ~150KB | 1.55MB | — |

## God Nodes (mantidos)

1. `React` - 28 edges
2. `NexoMente` - 15 edges
3. `Framer Motion` - 9 edges
4. `useFlashcards()` - 6 edges
5. `parseArquivo()` - 6 edges
6. `AIChatPage()` - 6 edges
7. `useAIModel()` - 5 edges
8. `generate()` - 5 edges

## Comunidades Detectadas

- Community 0: Flashcards UI (Framer Motion, React, useFlashcards)
- Community 1: Infra (NexoMente, Electron, Vite, Zustand)
- Community 2: AI Chat (AIBar, AIPanel, useAIModel, useNotes)
- Community 3: Coverage/Testing (sorter, block-navigation)
- Community 4: Gerador/Poemas (useGerador, useMaterias, usePoemas)
- Community 5: Ollama/LM Studio Services (generate, generateFlashcards)
- Community 6: Coverage utils (g(), k(), a(), B())
- Community 7: Parser (detectarBanca, parseArquivo, detectarMateria)
- Community 10: Zustand Stores (useDBStore, useUIStore)
- Community 14: AGENTS (gstack, graphify) — **obsoleto, migrado para CodeGraph**

## Observações

- CodeGraph indexou 208% mais nós porque parseia TODOS os symbols (inclui imports, constants, variables)
- graphify-era apenas funções/classes/componentes
- O `.codegraph/` foi criado automaticamente pelo installer do CodeGraph

## Razão da Migração

1. CodeGraph é mantido ativamente (última atualização: 2026)
2. Integração nativa com Claude Code via MCP
3. Suporta 19+ linguagens vs ~8 do graphify
4. Sync automático via file watcher
5. Substitui graphify conforme solicitado

## Remoção

```bash
# Removido em 2026-04-27:
rm -rf graphify-out/
```
