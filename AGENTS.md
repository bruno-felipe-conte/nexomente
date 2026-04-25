%% INÍCIO - AGENTS %%

## graphify

This project has a graphify knowledge graph at graphify-out/.

### 1. Leia o relatório principal para entender nós centrais e estrutura de comunidades

```bash
cat graphify-out/GRAPH_REPORT.md
```

Este arquivo contém:
- **God Nodes**: nós mais conectados (abstrações centrais do projeto)
- **Comunidades**: grupos de funcionalidades relacionadas com métricas de coesão
- **Lacunas de conhecimento**: nós isolados que precisam de atenção
- **Perguntas sugeridas**: consultas que o grafo pode responder melhor que buscas simples

**Resumo do grafo atual:**
- 200 nodes · 238 edges · 14 comunidades
- God nodes: React (28), NexoMente (15), Framer Motion (9)
-useFlashcards() (6), parseArquivo() (6), AIChatPage() (6)

### 2. Para perguntas específicas

Prefira estes comandos em vez de grep:

```bash
# Explorar relações entre conceitos
py -m graphify query "Como o React se conecta às comunidades?"

# Encontrar caminho entre dois nós
py -m graphify path "React" "useAIModel()"

# Explicar um conceito e suas conexões
py -m graphify explain "NexoMente"
```

### 3. Após modificar código

```bash
py -m graphify update .  # Atualiza o grafo (AST-only, sem API)
```

### 4. Learnings (memória entre sessões)

```bash
/learn           # Mostre learnings recentes
/learn search "termo"  #Pesquise
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