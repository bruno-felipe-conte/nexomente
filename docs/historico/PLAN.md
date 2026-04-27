# NexoMente Local - Plano de Produto

## Visão Geral
Um segundo cérebro offline para uso pessoal que combina armazenamento 100% local, LLM rodando no próprio PC, sincronização automática via Google Drive e gráfico visual de conexões ao estilo Obsidian - com gamificação embutida para criar hábito diário de estudo.

## Objetivo do Projeto
Having fun - projeto pessoal para auto-uso (Bruno) visando consolidar capacidade de suprir demandas pessoais de organização de conhecimento.

## Público-Alvo
Uso pessoal único - Bruno (PC + Celular via sincronização Google Drive)

## Forcing Questions Insights
- **Demand reality**: Construído para uso pessoal, validação vem da satisfação pessoal no uso diário
- **Narrowest wedge**: Primeira nota com grafo de conexões - proporciona o "aha!" da visualização imediata do conhecimento

## Especificação Técnica (baseada em NexoMente_Local_Especificacao.md)

### Stack
- **Runtime Desktop**: Electron v28+
- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS v3 + CSS custom properties
- **Editor de texto**: TipTap v2
- **Banco de dados local**: better-sqlite3 (SQLite embutido)
- **Gerenciamento de estado**: Zustand
- **Grafo de conexões**: Cytoscape.js
- **IA local**: Ollama (recomendado) ou LM Studio
- **Ícones**: Lucide React
- **Notificações**: react-hot-toast
- **Datas**: date-fns
- **Animações**: Framer Motion (gamificação) + CSS transitions
- **Sincronização**: Google Drive File Stream (pasta espelhada)

### Estrutura de Pastas
```

├── app/                    # React frontend
│   ├── src/
│   │   ├── pages/          # Dashboard, Notas, Study, Flashcards, Graph, Statistics, Settings
│   │   ├── components/     # layout/, editor/, notes/, study/, gamification/, graph/, ui/
│   │   ├── hooks/          # useNotes, useStudy, useFlashcards, useGamification, useAI, useGraph
│   │   ├── services/       # notesService, aiService, graphService, syncService, exportService
│   │   ├── lib/            # db.js, sm2.js, xpSystem.js, markdownConverter.js
│   │   └── store/          # useThemeStore, useUIStore, useGraphStore
├── electron/
│   ├── main.js             # Entry point, janela principal, IPC handlers
│   ├── preload.js          # Bridge segura entre renderer e Node.js
│   └── ipc/                # handlers: files.js, ai.js, sync.js, db.js
├── scripts/
└── package.json
```

### Pasta Cofre - Estrutura de Arquivos
```

├── _cofre/                    ← Notas em Markdown (editáveis externamente)
│   ├── livros/
│   ├── projetos/
│   ├── ideias/
│   ├── diario/
│   ├── estudo/
│   └── biblia/
├── _banco/
│   └── nexomente.db           ← SQLite (dados estruturados)
├── _config/
│   └── config.json            ← Configurações do app
├── _backups/
│   └── nexomente_YYYY-MM-DD.db← Backups automáticos semanais
└── _exportacoes/
    └── flashcards_export_YYYY-MM-DD.json
```

### Core Features (MVP)
1. **Fundação** (Fase 1)
   - Electron configurado com preload.js e contextIsolation
   - React + Vite rodando no renderer process
   - SQLite operacional com tabelas para notas, pastas, materias, sessoes_estudo, flashcards, conquistas, etc.
   - Pasta Cofre selecionável nas configurações
   - Tema escuro aplicado com variáveis CSS
   - Layout base: sidebar, header, área principal
   - Responsividade: mobile, tablet, desktop

2. **Dashboard** (Fase 2)
   - Morning Brief com saudação personalizada + hora
   - Quick Capture funcional (Ctrl+Shift+N)
   - Status do LLM local visível na sidebar
   - Indicador de sync do Google Drive
   - Missões diárias exibidas

3. **Notas** (Fase 3)
   - 7 tipos de nota funcionando (livro, projeto, ideia, diário, biblia, estudo, lembrete)
   - Editor TipTap com toolbar completa
   - Wiki-links [[]] com autocompletar
   - Sincronização bidirecional com Pasta Cofre (.md)
   - Busca full-text (SQLite FTS5)
   - Modo Foco sem distrações
   - Tags: manual + sugestão por IA

4. **Estudo** (Fase 4)
   - Pomodoro Timer com configuração
   - Materias com cor e meta de horas
   - Flashcards com algoritmo SM-2
   - Sessões de estudo registradas

5. **Gamificação** (Fase 5)
   - Sistema de XP com eventos configuráveis
   - Níveis e títulos
   - Missões diárias com progresso
   - Conquistas desbloqueáveis
   - Animações: XP Toast, Level Up Modal

6. **IA + Grafo** (Fase 6)
   - Integração com Ollama (porta 11434)
   - Funções: Tags, Resumo, Flashcards, Links
   - Gráfico Cytoscape.js com nós por tipo
   - Filtros do grafo funcionando
   - Preview de nota ao clicar no nó
   - Conexões: wiki-links + tags compartilhadas

7. **Build** (Fase 7)
   - Electron Builder configurado
   - Instalador Windows (.exe) testado
   - Auto-update com GitHub Releases
   - Ícone e splash screen do app
   - README com instruções de instalação

## Próximos Passos Imediatos
1. Corrigir importação faltante do ícone `Plus` em `Notas.jsx` (JÁ FEITO)
2. Validar todas as funcionalidades principais através de uso real
3. Identificar e corrigir bugs de usabilidade
4. Documentar aprendizados para referência futura
5. Implementar melhorias específicas baseadas no uso pessoal:
   - **Sistema de Notas e Bibliotecas (Editor Dinâmico)**
     * Abandonar texto simples e adotar formato de blocos ou Markdown
     * Gestão de Bibliotecas: sistema de "Tags" ou "Pastas Virtuais" para definir contexto (ex: Logística, Italiano, Filosofia)
     * Editor de Texto Rico: barra de ferramentas com formatação básica, suporte a Markdown e inserção de blocos de código/equações
     * Metadados das Notas: campos de tipo (ex: Estudo, Inbox, Referência) para filtragem
   - **Flashcards: Revisão e Segurança**
     * Implementar CRUD completo (Criar, Ler, Atualizar, Deletar) para cards
     * Central de Gerenciamento: interface de lista para buscar, filtrar e editar conteúdo de cards
     * Modo de Edição de Emergência: botão "Editar Card" sempre disponível durante revisão
     * Botão de Arrependimento (Undo): ativo por 5 segundos após apertar "Fácil" ou "Recitei" por engano
     * Revisão de Cards Dominados: filtro "Visualizar Todos" para forçar revisão de manutenção
   - **Aba de Poemas (Dashboard de Recitação)**
     * Dashboard Central: poema centralizado com tipografia limpa
     * Contador de Retenção: exibe dias ativo ou recitações bem-sucedidas
     * Navegação Bi-Direcional: botão esquerdo (anterior), botão direito ("Recitei" para validar e avançar)
     * Gestão de Conteúdo (Backstage): editor específico com campos Título, Autor, Ano, Corpo do Texto
     * Formatação de Poemas: opções de estilização para preservar métrica e estética (espaçamento, itálicos para ênfase)

## Métricas de Sucesso (Para Uso Pessoal)
- Uso diário consistente para estudos, diario e anotacoes biblicas
- Sensação de que o conhecimento está "conectado" e visualmente explorável
- Criação de hábito através da gamificação (XP, missões diárias)
- Confiança de que os dados estão seguros e sincronizados com Google Drive

---

## Atualizações (2026-04-24) - /autoplan SCOPE EXPANSION

### Funcionalidades Implementadas
| # | Feature | Status | Arquivos |
|---|---------|--------|----------|
| 1 | **Vitest + 70% coverage** | ✅ Configurado | vitest.config.js, src/test/, package.json |
| 2 | **TypeScript gradual** | ✅ tsconfig.json | tsconfig.json, tsconfig.node.json, types.d.ts |
| 3 | **Onboarding flow** | ✅ Novo | Onboarding.jsx |
| 4 | **Keyboard shortcuts** | ✅ Hook novo | useKeyboardShortcuts.jsx |
| 5 | **Auto-update graphify** | ✅ Scripts prontos | scripts/update-graphify.sh |
| 6 | **ES Modules** | ✅ type: module | package.json |
| 7 | **Poemas (Dashboard de Recitação)** | ✅ Implementado | Poemas.jsx |
| 8 | **AI Chat (Ollama)** | ✅ Implementado | AIChat.jsx |
| 9 | **Sistema de Matérias** | ✅ useMaterias hook | useMaterias.js |
| 10 | **Use AI Model** | ✅ useAIModel hook | useAIModel.js |
| 11 | **Flashcards CRUD completo** | ✅ sm2 + hook | sm2.js, useFlashcards.js, main.js |
| 12 | **Editor de notas avançado** | ✅ Math (KaTeX) | Notas.jsx, EditorToolbar.jsx |
| 13 | **Sistema Concurseiro (Fase 1-3)** | ✅ Parser + IA + Gerador | parser.js, Gerador.jsx, iaPrompts.js |

### Funcionalidades Pendentes / Melhorias
| # | Feature | Prioridade | Descrição |
|---|---------|-----------|----------|
| 1 | **Sistema de bibliotecas** | ✅ Implementado | BibliotecaPanel.jsx |
| 2 | **Graph Cytoscape.js** | ✅ Implementado | Graph.jsx com filtros e preview |
| 3 | **Pomodoro Timer** | ✅ Implementado | Study.jsx com 25/50/15 min |
| 4 | **Gamificação completa** | ✅ Implementado | XP, Quests, Badges, Streak |
| 5 | **Sync Google Drive** | ✅ Implementado | syncService.js + File Stream |
| 6 | **Build .exe** | ✅ dist/win-unpacked/nexomente.exe | electron-builder |
| 7 | **Sistema Concurseiro Fases 1-6** | ✅ Implementado | Parser + Gerador + Export |

### Sistema de Estudos Concurseiro (Feature NexoMente)

#### Escopo
- **Inputs**: Provas (PDF/TXT) + Notas + Imagens (.png, .jpg)
- **Bancas**: Todas (FCC, CESPE, FGV, IBFC, etc)
- **Output**: Flashcards com justificativas + Documento (DOC)

#### Filosofia
> "Concurseiro estuda para a banca, não para o conteúdo" — foco em: provas antigas, questões estilo banca, justificativas pedagógicas, spaced repetition adaptativo.

#### Estrutura de Dados: Questão Estilo Banca

```javascript
{
  id: "q_gerado_id",
  materia: "Direito Penal",
  topico: "CrimeImputabilidade",
  banca: "FCC",
  ano: 2023,
  tipo: "multipla-escolha",
  nivel: "facil|medio|duas",
  pergunta: "...",
  resposta_correta: "B",
  opcoes: [
    { letra: "A", texto: "...", correta: false,
      justificativa_correta: "Errado porque...",
      justificativa_errada: "Alternativa A está incorreta pois..." },
    { letra: "B", texto: "...", correta: true,
      justificativa_correta: "Correto! Porque...",
      justificativa_errada: "" },
    { letra: "C", texto: "...", correta: false,
      justificativa_correta: "Errado porque...",
      justificativa_errada: "Alternativa C está incorreta pois..." },
    { letra: "D", texto: "...", correta: false,
      justificativa_correta: "Errado porque...",
      justificativa_errada: "Alternativa D está incorreta pois..." },
    { letra: "E", texto: "...", correta: false,
      justificativa_correta: "Errado porque...",
      justificativa_errada: "Alternativa E está incorreta pois..." }
  ],
  fonte: "Prova XX - 2023",
  dispositivo_legal: "Art. 26, CP",
  card_ids: ["card_frente_001"],
  stats: { revisoes: 0, acertos: 0, erros: 0 },
  created_at: "2026-04-24",
  tags: ["imputabilidade", "condicao"]
}
```

#### Fluxo Completo

```
1. INPUT
   ├── Arquivo (.pdf, .txt, .md, .png, .jpg)
   ├── Texto colado
   └── Nota existente

2. PROCESSAMENTO
   ├── PDF → texto (pdf.js)
   ├── Imagem → OCR (tesseract.js)
   ├── TXT/MD → parsing estruturado
   └── Detectar: banca, ano, órgão

3. GERAÇÃO IA
   ├── Prompt: "Analise esta questão de [BANCA]..."
   ├── Extrair tipo de questão
   ├── Identificar tópico/conceito
   ├── Gerar justificativas pedagógicas (o "bizu")
   ├── Vincular dispositivo legal
   └── Detectar tags

4. REVISÃO
   ├── Lista editável (pergunta, options, justificativas)
   ├── Editor inline fields
   ├── Preview flashcard
   └── Aprovar/Rejeitar

5. OUTPUTS
   ├── Flashcards (auto-criados em useFlashcards)
   ├── Documento (WORD via HTML export)
   └── Banco de questões (JSON localStorage)
```

#### Arquivos a Criar/Modificar

| Arquivo | Ação | Função |
|---------|------|--------|
| `app/src/pages/Gerador.jsx` | **NOVO** | Interface upload + config |
| `app/src/hooks/useGerador.js` | **NOVO** | Lógica de geração |
| `app/src/hooks/useFlashcards.js` | **ALTERAR** | Suporte à nova estrutura |
| `app/src/lib/parser.js` | **NOVO** | Parse PDF/TXT/OCR |
| `app/src/lib/iaPrompts.js` | **NOVO** | Templates de prompts |
| `app/src/services/exportService.js` | **NOVO** | Export DOC |

#### Interface: Gerador.jsx (Layout)

```
┌─────────────────────────────────────────────────────────────┐
│  GERADOR DE QUESTÕES                    [?] [⚙️]           │
├────────────┬────────────────────────────────────────────────┤
│ Fontes    │  Área de Work                               │
│ ───────  │  ─────────────────                        │
│ 📁 Arquiv.│  • Dropzone para upload                  │
│ 📋 Colar │  • Preview do conteúdo                  │
│ 📝 Notas │  • Status OCR/Geração                  │
├──────────┼────────────────────────────────────────────────┤
│ Config   │  Questões Geradas                           │
│ ───────  │  ─────────────────────                  │
│ Matéria  │  [Q1] [Q2] [Q3] ... (tabs)            │
│ Tópico   │  pergunta: ...                          │
│ Bancas  │  A) ... Justif: ...                   │
│ Qtd     │  B) ... Justif: ...                   │
│ Nivel   │  [Salvar] [Export DOC]                     │
└──────────┴────────────────────────────────────────────────┘
```

#### Export Documento (Formato)

```
═══════════════════════════════════════════════════════════════════
         BANCO DE QUESTÕES - [MATÉRIA]
         Gerado em: [DATA] | Questões: [QTD]
═══════════════════════════════════════════════════════════════════

[001] MATÉRIA: [Matéria]
      TÓPICO: [Tópico]
      BANCA: [Banca] - [Ano]
      NÍVEL: [Nível]

      ( ) A) ...
      ( ) B) ...
      ( ) C) ...
      ( ) D) ...
      ( ) E) ...

      ────────────────────────────────────────────────────
      GABARITO: [Letra]
      JUSTIFICATIVA CORRETA:
      [Texto explicativo pedagógico]

      ANÁLISE DAS ALTERNATIVAS ERRADAS:
      A) [Por que está errado]
      C) [Por que está errado]
      D) [Por que está errado]
      E) [Por que está errado]
      ────────────────────────────────────────────────────
      DISPOSITIVO: [Artigo, Lei]
═══════════════════════════════════════════════════════════════════
```

#### Gamificação do Sistema

| Ação | XP |
|------|-----|
| Criar questão | +5 XP |
| Resolver simulado | +10 XP |
| Acertar questão | +2 XP |
| Errar → revisar depois | +3 XP |
| 10 acertos seguidos | +15 XP |

#### Fases de Implementação

| Fase | Escopo | Prioridade |
|------|-------|----------|
| **Fase 1** | Parser (TXT/MD), estrutura flashcard estendida | Alta |
| **Fase 2** | Interface Gerador.jsx básica | Alta |
| **Fase 3** | Integração IA (prompts) | Alta |
| **Fase 4** | OCR para imagens + PDF | Média |
| **Fase 5** | Export DOC | Média |
| **Fase 6** | Simulados (modo prova) | Baixa |

### Aprendizados Registrados
- vitest-config: Vitest coverage requires 'type: module' in package.json
- test-paths: Test files in src/test/ import from ../../app/src/
- sqljs-renderer: sql.js directo no renderer - não blocking
- module-type: Zustand persist exige 'type: module'

### Keyboard Shortcuts
| Keys | Action |
|------|--------|
| G+D | Dashboard |
| G+N | Notas |
| G+S | Study |
| G+F | Flashcards |
| G+Q | Gerador |
| G+G | Graph |
| G+P | Poemas |
| G+, | Settings |
| ⌘+⇧+N | Nova nota rápida |
| ⌘+⇧+F | Modo foco |
| Esc | Fechar modais |

### Scripts Disponíveis
```bash
npm run test        # Run tests
npm run test:run   # Run tests once
npm run test:coverage  # Run tests with coverage (70% threshold)
```

### Knowledge Graph (graphify-out/)
- 57 Nós, 47 Arestas
- 7 Comunidades detectadas
- God nodes: NexoMente (15), React (8), Zustand (3)
