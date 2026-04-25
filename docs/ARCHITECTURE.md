# Arquitetura do NexoMente

> Diagrama gerado em Abril 2026 — representa a estrutura pós-refatoração da Sprint de Profissionalização.

## Visão Geral em Camadas

```mermaid
graph TD
    subgraph Electron["⚡ Processo Principal (Electron)"]
        MAIN["main.js\n(Window lifecycle)"]
        IPC["preload.js\n(electronAPI bridge)"]
        DB["SQLite\n(better-sqlite3)"]
        MAIN --> IPC
        MAIN --> DB
    end

    subgraph React["⚛️ Renderer (React 18 + Vite)"]
        APP["App.jsx\n(Router + Atalhos + ErrorBoundary)"]

        subgraph Routing["Roteamento (code-split lazy)"]
            P1["Dashboard"] & P2["Notas"] & P3["Flashcards"]
            P4["Gerador"] & P5["AIChat"] & P6["Study"]
            P7["Graph"] & P8["Statistics"] & P9["Poemas"]
        end

        subgraph Hooks["🪝 Hooks de Domínio"]
            H1["useNotes\n(CRUD + persist)"]
            H2["useFlashcards\n(SM-2 + Electron)"]
            H3["useGerador\n(parse + IA)"]
            H4["useAIModel\n(LM Studio status)"]
            H5["useAIChat\n(histórico)"]
            H6["useNotaEditor\n(TipTap + IA)"]
            H7["sm2.js\n(algoritmo puro)"]
        end

        subgraph UI["🧩 Componentes UI"]
            C1["Sidebar + Header\n(layout)"]
            C2["QuestaoCard\n(memo)"]
            C3["ChatMessage\n(memo)"]
            C4["FlashcardViewer\n(SM-2 UI)"]
            C5["NotaLista\n(lista + busca)"]
            C6["GerarIAModal"]
            C7["EmptyState\nConfirmDialog"]
        end

        subgraph Utils["🛠 Utilitários"]
            U1["dateUtils.js\n(date-fns ptBR)"]
            U2["toast.js\n(react-hot-toast wrappers)"]
            U3["errorMessages.js\n(humanização de erros)"]
            U4["exportService.js\n(DOC/TXT/JSON)"]
        end

        subgraph Store["🏪 Estado Global"]
            S1["useUIStore\n(Zustand: sidebar, tema)"]
            S2["useDBStore\n(Zustand: DB bridge)"]
        end

        APP --> Routing
        APP --> C1
        Routing --> Hooks
        Hooks --> UI
        Hooks --> Utils
        APP --> Store
        H6 --> H4
        H3 --> H2
    end

    subgraph AI["🤖 IA Local"]
        LM["LM Studio\n(:1234)"]
        OL["Ollama\n(:11434)"]
    end

    subgraph Tests["🧪 Testes (Vitest)"]
        T1["sm2.test.js\n17 casos"]
        T2["useNotes.test.js\n8 casos"]
        T3["errorMessages.test.js\n9 casos"]
        T4["dateUtils.test.js\n13 casos"]
        T5["toast.test.js\n10 casos"]
        T6["integration.test.js\n15 casos"]
        T7["smoke.test.js\n9 casos"]
    end

    IPC <-->|"window.electronAPI"| H2
    IPC <-->|"window.electronAPI"| H3
    H4 <-->|"HTTP REST"| LM
    H4 <-->|"HTTP REST"| OL
```

## Fluxo de Dados — Criação de Nota

```mermaid
sequenceDiagram
    participant U as Usuário
    participant N as Notas.jsx
    participant HE as useNotaEditor
    participant UN as useNotes
    participant LS as localStorage

    U->>N: Clica "Nova Nota"
    N->>UN: create({ titulo: 'Nova Nota' })
    UN->>LS: persist(notas)
    UN-->>N: retorna id
    N->>HE: setNotaId(id)
    U->>HE: Digita conteúdo (TipTap)
    HE->>UN: update(id, { conteudo })
    UN->>LS: persist(notas)
```

## Fluxo SM-2 — Revisão de Flashcard

```mermaid
sequenceDiagram
    participant U as Usuário
    participant FP as Flashcards.jsx
    participant FV as FlashcardViewer
    participant HF as useFlashcards
    participant SM as sm2.js
    participant E as Electron DB

    U->>FV: Ver carta (frente)
    FV-->>U: Exibe pergunta
    U->>FV: Clica "Ver Resposta"
    FV-->>U: Exibe resposta
    U->>FV: Avalia qualidade (1/3/5)
    FV->>FP: onRevisar(qualidade)
    FP->>HF: revisar(id, qualidade)
    HF->>SM: sm2(card, qualidade)
    SM-->>HF: { ef, intervalo, next_review }
    HF->>E: dbFlashcardsUpdate(id, dados)
    HF-->>FP: cards atualizado
```

## Estrutura de Diretórios

```
nexomente/
├── app/
│   └── src/
│       ├── components/
│       │   ├── ai/          # ChatMessage (memo)
│       │   ├── editor/      # BibliotecaPanel, NotaLista
│       │   ├── flashcards/  # FlashcardViewer
│       │   ├── gamification/
│       │   ├── gerador/     # GerarIAModal, QuestaoCard (memo)
│       │   ├── layout/      # Sidebar, Header
│       │   └── ui/          # EmptyState, ConfirmDialog
│       ├── constants/
│       │   └── errorMessages.js
│       ├── hooks/
│       │   ├── sm2.js           # Algoritmo puro SM-2
│       │   ├── useAIModel.js
│       │   ├── useFlashcards.js
│       │   ├── useGerador.js
│       │   ├── useNotes.js
│       │   ├── useNotaEditor.js # Extraído de Notas.jsx
│       │   └── ...
│       ├── lib/
│       │   ├── ai/          # lmStudioService, ollamaService
│       │   ├── editor/      # WikiLink (TipTap extension)
│       │   ├── parser.js    # Parsing de provas
│       │   └── sync/        # syncService (Obsidian)
│       ├── pages/           # 10 páginas (lazy-loaded)
│       ├── services/
│       │   └── exportService.js
│       ├── store/
│       │   ├── useDBStore.js    # Zustand + Electron bridge
│       │   └── useUIStore.jsx   # Zustand: sidebar, tema
│       ├── test/
│       │   ├── setup.js
│       │   ├── smoke.test.js
│       │   ├── sm2.test.js
│       │   ├── useNotes.test.js
│       │   ├── errorMessages.test.js
│       │   ├── dateUtils.test.js
│       │   ├── toast.test.js
│       │   └── integration.test.js
│       └── utils/
│           ├── dateUtils.js     # date-fns ptBR
│           └── toast.js         # Wrappers react-hot-toast
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── CHANGELOG.md
└── vitest.config.js
```

## Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| Runtime | Electron v28 | Offline-first, SQLite nativo, sem servidor |
| UI | React 18 + Vite | HMR rápido, code-splitting nativo |
| Estado global | Zustand | Minimal, sem boilerplate |
| Banco | SQLite (better-sqlite3) | Zero config, queries síncronas |
| IA | LM Studio / Ollama | Privacidade total, sem API key |
| Testes | Vitest + jsdom | Compatível com Vite, zero config |
| Revisão espaçada | SM-2 (SuperMemo 2) | Algoritmo clássico, implementado localmente |
| Estilos | Tailwind CSS | Utility-first, sem CSS custom complexo |
| Editor | TipTap 2 | Extensível, suporte Markdown + wiki links |
