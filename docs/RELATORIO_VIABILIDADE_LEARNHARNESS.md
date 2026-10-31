# Relatório Técnico de Diagnóstico: Análise de Viabilidade e Mesclagem LearnHarness + NexoMente

> **Documento de Engenharia de Produto & Arquitetura de Sistemas**  
> **Status:** Diagnóstico Inicial & Matriz de Decisão  
> **Data:** 31 de Outubro de 2026  
> **Autor:** Antigravity AI Pair Programmer

---

## 1. Sumário Executivo

O **LearnHarness** (`amosblomqvist/learnharness`) é uma aplicação desktop/web construída com Next.js (standalone server), Electron host e o framework de agentes `@earendil-works/pi-agent-core`. Seu foco central é a **pedagogia socrática de precisão**: conduzir o estudante da *compreensão atual* até a *compreensão-alvo* através de uma árvore de dependência mínima (passo a passo de raciocínio unitário com checagem imediata a cada turno).

O **NexoMente** é um *segundo cérebro* e ecossistema de estudos soberano, 100% offline, baseado em Electron + Vite/React SPA + SQLite WASM/IndexedDB, com LLM local (`node-llama-cpp` / Gemma 4), repetição espaçada moderna (FSRS/SM-2) e editor de notas Markdown local.

### Veredito Preliminar
Uma **fusão de código monolítica (adotar a base de código do LearnHarness inteira no NexoMente)** é **altamente desaconselhada** devido a incompatibilidades graves de runtime (Next.js server-side vs Vite SPA estática) e dependência de cloud/APIs pagas. 

No entanto, uma **absorção modular do modelo pedagógico e dos componentes de doca socrática (Socratic Tutor Module)** dentro do Copiloto e do Vault do NexoMente é **extremamente viável, de altíssimo valor e complementa diretamente as lacunas atuais do NexoMente**.

---

## 2. Matriz Comparativa de Subsistemas

| Dimensão | LearnHarness | NexoMente | Análise de Compatibilidade |
|---|---|---|---|
| **Frontend Runtime** | Next.js (React Server Components + Pages) | Vite + React SPA (Tailwind + Framer Motion) | **Incompatível diretamente**. O Next.js requer um processo Node.js HTTP rodando em loopback; o NexoMente é empacotado estaticamente no Electron. |
| **Arquitetura Electron** | Host que roda um processo filho Next.js standalone via loopback | Electron puro carregando arquivos estáticos (`file://` ou Vite dev) + IPC nativo seguro (`contextBridge`) | O modelo do NexoMente é muito mais leve na inicialização e consome menos memória (~150MB a menos de RAM). |
| **Motor de Agentes & IA** | `@earendil-works/pi-agent-core` (turnos socráticos com subagentes: researcher, demoBuilder, extractor, auditor) | `electron/ipc/aiHandlers.js` com `node-llama-cpp` (Gemma 4 local) + WebLLM/Transformers.js | **Alta convergência conceitual**. Os papéis de subagentes do Pi podem ser implementados como prompts com estado dentro do Copiloto do NexoMente. |
| **Conexão de Modelos** | Provedores remotos (OpenRouter, Claude Code, ChatGPT, Grok, Tavily) | Soberania 100% offline local (GGUF via Llama-cpp), com suporte opcional a APIs | A premissa fundamental do NexoMente é a soberania de dados offline. Importar o LearnHarness sem adaptar para modelos locais quebraria essa promessa. |
| **Camada de Dados & Persistência** | Arquivos JSON planos e JSONL (`data/chats/`, `data/settings.json`, ledgers de grafo) | SQLite nativo (`better-sqlite3`) + SQLite WASM (`sql.js`) + IndexedDB | O NexoMente possui uma camada de dados transacional muito superior e resiliente a falhas (com provada proteção contra corrupção e quota). |
| **Grafo de Conhecimento** | Grafo dinâmico derivado de tópicos/proposições aprendidas na conversa socrática | Grafo de notas Markdown e tags bidirecionais (`useGraphData.js`) | **Excelente oportunidade de simbiose**: o grafo do LearnHarness mapeia *entendimento*, o do NexoMente mapeia *documentos*. |
| **Metodologia de Aprendizado** | Probing $\rightarrow$ Planning (Árvore Mínima) $\rightarrow$ Ensino Socrático (Passo a passo com 1 check por turno) | Captura de Notas $\rightarrow$ Forja IA $\rightarrow$ Repetição Espaçada FSRS/SM-2 | **Complementaridade Perfeita**: LearnHarness resolve a *Aquisição de Conceitos*; NexoMente resolve a *Retenção e Memorização a Longo Prazo*. |

---

## 3. O Tesouro Conceitual do LearnHarness: O Que Vale a Pena Absorver?

A documentação do LearnHarness estabelece uma das melhores teorias computacionais de ensino já formuladas:

1. **A Prova dos Dois Estados**:
   - *Current understanding*: o que o aluno já aceita como óbvio (bracketed).
   - *Goal understanding*: o conceito que ele quer aprender.
2. **A Árvore de Dependência Mínima (The Minimal Tree)**:
   - A IA não "dá uma aula longa". Ela calcula a menor distância lógica entre o que o aluno sabe e o objetivo.
3. **Turnos de Passo Único com Checagem Imediata**:
   - A IA apresenta **um único fato**, amarrado ao fato anterior, e imediatamente faz **uma pergunta de verificação**. Se o aluno errar, corrige ali mesmo antes de avançar.
4. **Docks de Interação e Visualização**:
   - Doca de perguntas interativas e doca de progresso na árvore conceitual.

---

## 4. Riscos Críticos de uma Fusão Estrutural (Por que NÃO importar o projeto inteiro)

1. **Bloqueio de Hardware e Dependência de Cloud**: O LearnHarness foi desenhado para modelos de alta capacidade (Claude 3.5 Sonnet, GPT-4o) via APIs externas pagas. Rodar o prompt completo de planejamento do Pi em um modelo local quantizado (ex: Gemma 4 2B/9B GGUF) pode sofrer com degradação de contexto se os prompts não forem otimizados.
2. **Conflito de Arquitetura Web/Desktop**: Trazer o servidor Next.js para dentro do repositório do NexoMente exigiria orquestrar dois servidores de desenvolvimento, quebrar as regras rígidas do `docs/MAPA.md` e duplicar o roteamento de telas.
3. **Retrocesso na Camada de Dados**: O LearnHarness usa arquivos JSON sem garantia de transação ACID. O NexoMente acabou de passar por uma auditoria rigorosa de resiliência com SQLite e IndexedDB síncronos; regredir para JSON no disco seria arriscado.

---

## 5. Plano de Integração Recomendado (Estratégia Modular em 3 Fases)

### Fase 1: O "Modo Tutor Socrático" no Copiloto do NexoMente
- Adicionar uma aba/modo no Copiloto do NexoMente chamado **"Tutor Socrático"** (ao lado de "Chat Livre" e "Resumo").
- Criar a rotina de prompts baseada na metodologia do LearnHarness:
  - **Fase de Sondagem (Probe)**: 2 a 3 perguntas curtas para traçar o limite do conhecimento do estudante.
  - **Fase de Plano (Plan)**: Geração de um mapa de 3 a 5 nós de dependência conceitual.
  - **Fase de Execução (Teach)**: 1 fato por mensagem + 1 pergunta objetiva de múltipla escolha/resposta curta.

### Fase 2: Conversão Automática Socrática $\rightarrow$ Flashcards FSRS
- Cada ponto de raciocínio que o estudante dominou na sessão socrática gera automaticamente um **card atômico na Forja IA** do NexoMente com os intervalos preditivos do FSRS.
- O aluno constrói o entendimento com o Tutor Socrático e fixa a retenção para sempre com os Flashcards do NexoMente.

### Fase 3: Projeção de Conceitos no Grafo Local
- Em vez de apenas links de notas Markdown `[[nota]]`, o grafo do NexoMente (`Grafo.jsx`) pode exibir uma camada de **Nós Conceituais Dominados** (pontos verdes/dourados comemorativos baseados no progresso das sessões socráticas).
