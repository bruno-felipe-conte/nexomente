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

---

## Regra Permanente: Mapa de Conexões (NexoMente)

> **Regra Obrigatória para Todo Agente de Código:**
> 
> "Antes de alterar qualquer função: leia `docs/MAPA.md` e liste os nós afetados.
> Depois de alterar: atualize `docs/MAPA.md` e `docs/mapa.json` e rode `npm run mapa:check` (ou `node scripts/verificar-mapa.js`).
> A tarefa só está concluída se o mapa estiver em dia."


---

## Regra Permanente: 5 Diretrizes de Arquitetura UI/UX (NexoMente)

> **Obrigatório para todo agente ao criar ou refatorar qualquer tela.**

1. **Fonte Única de Verdade por Módulo:** nenhuma métrica, KPI, XP, status de Pet ou dado de perfil aparece duplicado na mesma tela, nem simultaneamente na Sidebar/Topbar e no corpo da página. Se o Widget global exibe o dado, ele é ocultado do conteúdo. (Pet/XP vivem só na Sidebar; nome do operador e ofensiva só na Topbar.)
2. **Proibição de Páginas de Utilitários Isolados:** cronômetro Pomodoro, chat IA/RAG e Forja IA nunca ocupam rota de página inteira. Devem ser popover na Topbar, Drawer lateral ou aba interna. Rotas legadas (`study`, `ai`, `gerador`, `statistics`) são redirecionadas em `App.jsx` (`LEGACY_ROUTES`).
3. **Consolidação de Telas Analíticas:** o Dashboard é a única central de telemetria. Telas de "Métricas/Estatísticas" são abolidas; heatmap e metas vivem na seção colapsável "Consistência Anual & Metas" do Dashboard.
4. **Padronização de Ações de Criação:** cada ação atômica (`+ Nova Nota`, `+ Novo Card`) tem um único gatilho por contexto, na barra de ferramentas superior da seção. Sem botões idênticos espalhados em rodapé, topo e laterais.
5. **Auditoria Antes de Codificar:** antes de criar card, botão ou painel, consultar `docs/MAPA.md` e o inventário de UI (`inventario_completo_nexomente.md`). Se já existir, reutilizar ou extrair para componente compartilhado em vez de duplicar.