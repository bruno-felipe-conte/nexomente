**NexoMente**

Versão Local - Especificação Técnica Completa

_Segundo cérebro offline • LLM local • Cofre sincronizado via Google Drive_

Uso pessoal do Bruno - PC + Celular

# 1. Visão Geral da Versão Local

A versão Local do NexoMente é uma adaptação completa do plano original (cloud + Supabase) para funcionar 100% offline no PC do Bruno. Toda a persistência de dados acontece em arquivos locais na Pasta Cofre, sincronizada automaticamente com o Google Drive via pasta espelhada - sem nenhuma configuração de servidor ou conta adicional.

**🎯 Proposta de Valor Central**

O único app de notas pessoal que combina: (1) armazenamento 100% local e privado, (2) LLM rodando no próprio PC para geração de tags e resumos sem internet, (3) cofre sincronizado automaticamente via Google Drive, e (4) gráfico visual de conexões ao estilo Obsidian - com gamificação embutida para criar hábito diário de estudo.

## 1.1 Comparativo: Versão Cloud vs Versão Local

| Aspecto           | Versão Cloud (original)     | Versão Local (este doc)             |
| --------------------- | ------------------------------- | --------------------------------------- |
| Persistência      | Supabase PostgreSQL             | Arquivos JSON/MD na Pasta Cofre         |
| Autenticação      | Supabase Auth (email/senha)     | Sem auth - uso pessoal único            |
| IA                | LLM local (fallback Claude API) | LLM local obrigatório (Ollama/LMStudio) |
| Sincronização     | Realtime Supabase desativado    | Google Drive espelhado (automático)     |
| Grafo de conexões | v1.5 do roadmap                 | MVP - incluído desde o início           |
| Hospedagem        | Vercel (cloud)                  | Electron ou Tauri (desktop app)         |
| Backup            | Supabase + exportação .md       | Google Drive é o backup nativo          |
| Custo             | Gratuito (free tiers)           | Gratuito - só precisa do PC             |
| Offline           | Parcial (sync manual)           | 100% offline nativo                     |

# 2. Arquitetura da Versão Local

## 2.1 Stack Definitiva

| Camada                  | Tecnologia e Justificativa                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime Desktop         | Electron v28+ - empacota o app React como desktop nativo, acessa sistema de arquivos, roda servidor Node.js embutido. Alternativa: Tauri (mais leve, Rust - escolher se performance for problema). |
| Frontend                | React 18 + Vite - mesmo stack do plano original. Roda dentro do Electron como renderer process.                                                                                                    |
| Estilização             | Tailwind CSS v3 + CSS custom properties - responsivo, tema escuro por padrão, animações CSS para tudo exceto gamificação.                                                                          |
| Editor de texto         | TipTap v2 (extensões gratuitas) - editor rico com suporte a wiki-links [[note]] para o grafo de conexões.                                                                                      |
| Banco de dados local    | better-sqlite3 - banco SQLite embutido. Sem servidor, sem configuração. Arquivo único em ~/nexomente.db.                                                                                 |
| Gerenciamento de estado | Zustand - leve, sem boilerplate, ideal para estado local.                                                                                                                                          |
| Grafo de conexões       | Cytoscape.js - API simples, performático com centenas de nós, estilo customizável ao nível do Obsidian.                                                                                            |
| IA local                | Ollama (recomendado) ou LM Studio - servidor HTTP local na porta 11434/3747. Modelos sugeridos: llama3.2:3b (rápido) ou mistral:7b (qualidade).                                                    |
| Ícones                  | Lucide React - consistência visual, bundle leve.                                                                                                                                                   |
| Notificações            | react-hot-toast - toasts não intrusivos.                                                                                                                                                           |
| Datas                   | date-fns - manipulação de datas sem Moment.js.                                                                                                                                                     |
| Animações               | Framer Motion (gamificação) + CSS transitions (resto).                                                                                                                                             |
| Sincronização           | Google Drive File Stream (PC) - pasta espelhada no sistema de arquivos.                                                                                                                            |

## 2.2 Estrutura de Pastas do Projeto

**📁 Estrutura do Repositório (monorepo)**

```

├── app/                    # React frontend (renderer do Electron)
│   ├── src/
│   │   ├── pages/          # Login, Dashboard, Notes, Study, Flashcards, Statistics, Settings, Graph
│   │   ├── components/     # layout/, editor/, notes/, study/, gamification/, graph/, ui/
│   │   ├── hooks/          # useNotes, useStudy, useFlashcards, useGamification, useAI, useGraph
│   │   ├── services/       # notesService, aiService, graphService, syncService, exportService
│   │   ├── lib/            # db.js (better-sqlite3), sm2.js, xpSystem.js, markdownConverter.js
│   │   └── store/          # useThemeStore, useUIStore, useGraphStore
├── electron/               # Main process do Electron
│   ├── main.js             # Entry point, janela principal, IPC handlers
│   ├── preload.js          # Bridge segura entre renderer e Node.js
│   └── ipc/                # handlers: files.js, ai.js, sync.js, db.js
├── scripts/                # build.js, instalador, migracoes db
└── package.json            # raiz do monorepo
```

## 2.3 Pasta Cofre - Estrutura de Arquivos

A Pasta Cofre é o coração da versão local. É uma pasta normal no sistema de arquivos que o Google Drive espelha automaticamente. Toda nota salva no app gera/atualiza um arquivo .md correspondente nela.

**📂 Estrutura da Pasta Cofre (~/ Google Drive/)**

```
                          ← Pasta raiz no Google Drive
├── _cofre/                            ← Notas em Markdown (editáveis externamente)
│   ├── livros/
│   │   └── Atomic Habits.md
│   ├── projetos/
│   │   └── NexoMente.md
│   ├── ideias/
│   │   └── Curso de IA.md
│   ├── diario/
│   │   └── 2025-04-23.md
│   ├── estudo/
│   │   └── Algoritmos — Grafos.md
│   └── biblia/
│       └── João 3.md
├── _banco/
│   └── nexomente.db                   ← SQLite (dados estruturados)
├── _config/
│   └── config.json                    ← Configurações do app
��── _backups/
│   └── nexomente_2025-04-23.db        ← Backups automáticos semanais
└── _exportacoes/
    └── flashcards_export_2025-04.json
```

Cada arquivo .md no cofre possui um frontmatter YAML com metadados completos, permitindo uso direto no Obsidian ou qualquer outro editor Markdown:

**📄 Exemplo de arquivo .md no Cofre**

```yaml
---
id: "a1b2c3d4-e5f6-..."
tipo: livro
titulo: "Atomic Habits"
tags: [produtividade, habitos, comportamento]
criado_em: "2025-04-10T14:30:00"
atualizado_em: "2025-04-23T09:15:00"
autor: "James Clear"
status: lendo
pagina_atual: 142
total_paginas: 285
avaliacao: 5
resumo_ia: "Livro sobre como pequenas mudanças de 1% geram resultados exponenciais..."
links: ["[[Hábitos Atômicos — Capítulo 1]]", "[[Sistema de Recompensas]]"]
---

# Atomic Habits

## Conceito Central
Pequenas melhorias de 1% ao dia resultam em...

## Destaques
- "Você não sobe ao nível das suas metas..."
- "Cada ação é um voto para o tipo de pessoa que você quer ser"

## Meu Resumo
...
```

# 3. Banco de Dados Local (SQLite)

O SQLite substitui o Supabase PostgreSQL. O arquivo nexomente.db fica na Pasta Cofre, então o Google Drive faz o backup automático. As tabelas são idênticas ao plano original - apenas a camada de acesso muda.

## 3.1 Tabelas (idênticas ao plano original)

| Tabela             | Descrição                                                              |
| ---------------------- | -------------------------------------------------------------------------- |
| profiles           | Perfil único do usuário (sem user_id - app é single-user)                  |
| pastas             | Hierarquia de pastas (suporte a subpastas ilimitadas)                      |
| notas              | Notas com 7 tipos: livro, projeto, ideia, lembrete, diario, biblia, estudo |
| materias           | Matérias de estudo com cor, ícone e meta de horas                          |
| sessoes_estudo     | Sessões Pomodoro, livros e Modo Foco                                       |
| flashcards         | Cards com algoritmo SM-2 para revisão espaçada                             |
| revisoes_flashcard | Histórico de cada revisão                                                  |
| metas              | Metas de horas, flashcards e notas por período                             |
| conquistas         | Catálogo global de conquistas (seed inicial)                               |
| conquistas_usuario | Conquistas desbloqueadas                                                   |
| missoes            | Missões diárias (seed inicial)                                             |
| missoes_usuario    | Progresso do usuário em cada missão                                        |
| transacoes_xp      | Histórico de XP ganho (auditoria)                                          |

## 3.2 Serviço de Banco de Dados (db.js)

O arquivo src/lib/db.js expõe uma API síncrona simples usando better-sqlite3. Todos os services do app usam este módulo, que é injetado via IPC do Electron:

**💻 API do db.js**

```javascript
// Notas
db.createNote(data)           → nota criada
db.updateNote(id, data)       → nota atualizada
db.getNoteById(id)            → nota | null
db.getNotesByFolder(folderId) → nota[]
db.searchNotes(query)         → nota[] (FTS5 full-text search)
db.getNoteLinks(noteId)       → { from: nota[], to: nota[] }

// Sincronização com Cofre
db.syncNoteToCofre(id)        → escreve .md na Pasta Cofre
db.syncAllToCofre()           → sincroniza todas as notas modificadas

// Backup
db.createBackup()             → copia .db para _backups/ com timestamp
```

# 4. Sincronização via Google Drive

## 4.1 Como funciona

A sincronização é baseada no Google Drive File Stream (PC) ou Google Drive para Desktop, que espelha a pasta escolhida localmente. O app NexoMente apenas lê e escreve arquivos normais - o Google Drive cuida do upload em background, sem nenhuma integração de API.

| ✅ Vantagens                                                                                                                                                                                                                | ⚠️ Considerações                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| • Zero configuração de API<br><br>• Backup automático e versionado<br><br>• Acesso pelo celular (app Drive)<br><br>• Histórico de versões (30 dias)<br><br>• Funciona em qualquer OS<br><br>• Arquivos .md legíveis no Obsidian | • Precisa do Google Drive instalado no PC<br><br>• O .db não deve ser editado em 2 PCs simultaneamente<br><br>• Conflito de sync se app aberto offline por muito tempo<br><br>• Arquivos grandes (áudio, vídeo) devem ficar fora do cofre |

## 4.2 Configuração no app (primeira vez)

1. Instalar Google Drive para Desktop (drive.google.com/download)
2. Abrir NexoMente → Configurações → "Pasta Cofre"
3. Selecionar a pasta: Google Drive/ (criar se não existir)
4. O app salva o caminho em _config/config.json e começa a espelhar
5. A partir daí: toda nota salva no app → arquivo .md atualizado → Google Drive sobe em background

## 4.3 Sincronização bidirecional

O app monitora a Pasta Cofre com chokidar (file watcher). Se um arquivo .md for editado externamente (Obsidian, editor de texto, outro PC via Drive), o NexoMente detecta a mudança e importa as alterações automaticamente:

**🔄 Fluxo de Sincronização Bidirecional**

```
NexoMente edita nota → salva no SQLite → escreve .md no Cofre → Drive sobe

Drive baixa arquivo de outro dispositivo → chokidar detecta mudança .md
→ parser lê frontmatter + conteúdo → atualiza SQLite → UI reativa

Conflito (edição simultânea em 2 lugares): app mantém versão mais recente
pelo campo atualizado_em do frontmatter. Versão antiga vai para _backups/.
```

# 5. Integração com LLM Local

## 5.1 Modelos recomendados

A IA roda 100% no PC do Bruno via Ollama ou LM Studio. Nenhum dado sai do computador. Os modelos abaixo são ordenados por balanço qualidade/velocidade para uso em notas:

| Modelo      | VRAM / RAM necessária | Melhor para                                          |
| --------------- | ------------------------- | -------------------------------------------------------- |
| llama3.2:3b | 4GB RAM (CPU-only OK)     | Máquinas com pouca GPU - tags, resumos curtos            |
| mistral:7b  | 8GB RAM / 4GB VRAM        | Equilíbrio qualidade/velocidade - uso diário recomendado |
| llama3.1:8b | 8GB RAM / 6GB VRAM        | Textos mais longos e complexos                           |
| phi3:mini   | 4GB RAM                   | Muito rápido, bom para sugestões de tags simples         |
| gemma2:9b   | 10GB RAM / 8GB VRAM       | Alta qualidade - usar se PC for potente                  |

## 5.2 Funções de IA no app

| Função              | Como funciona                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sugerir Tags        | Envia título + primeiros 500 chars da nota → LLM retorna array JSON de tags → app exibe chips para aceitar/rejeitar individualmente |
| Resumir Nota        | Envia conteúdo completo em Markdown → LLM retorna resumo em 3-5 linhas → salvo em resumo_ia da nota                                 |
| Gerar Flashcards    | Envia conteúdo → LLM retorna JSON [{frente, verso}] → modal de aprovação individual → salvos no banco                             |
| Sugerir Links       | Envia título e tags → LLM recebe lista de títulos de notas existentes → sugere conexões relevantes para o grafo                     |
| Organização em Lote | Processa notas com ia_organizada=false → barra de progresso → resultado em toast                                                    |

## 5.3 Prompt Engineering para LLM local

Modelos locais pequenos precisam de prompts mais diretos e estruturados. O aiService.js usa templates otimizados:

**📝 Template de prompt para Tags (aiService.js)**

```javascript
const PROMPT_TAGS = (titulo, conteudo) => `
Analise esta nota e retorne APENAS um JSON válido, sem texto adicional.
Formato exato: {"tags": ["tag1", "tag2", "tag3"]}
Máximo 5 tags, em português, minúsculas, sem espaços (use hífens).

Título: ${titulo}
Conteúdo: ${conteudo.slice(0, 500)}
`;

// Timeout: 30 segundos
// Retry: 1 vez em caso de JSON inválido
// Fallback: mostrar campo manual se LLM offline
```

# 6. Gráfico de Conexões (Estilo Obsidian)

## 6.1 Visão Geral

O gráfico de conexões é uma das features mais poderosas do NexoMente Local. Diferente do roadmap original (que colocava o grafo em v1.5), na versão local ele é incluído no MVP por ser essencial para visualizar a rede de conhecimento armazenada offline.

## 6.2 Tecnologia: Cytoscape.js

Cytoscape.js renderiza o grafo como canvas HTML5 - performático com centenas de nós. Suporta layouts múltiplos (force-directed, hierárquico, circular), estilos por tipo de nó, e interações ricas (zoom, pan, clique, hover).

| Recurso Cytoscape            | Como usar no NexoMente                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Layout cola (force-directed) | Nós se afastam organicamente por peso de conexões - visual idêntico ao Obsidian |
| Grupos de Nós por cor        | Cada tipo de nota tem cor própria: livros=roxo, projetos=azul, diário=verde...  |
| Tamanho por importância      | Nós com mais conexões ficam maiores (betweenness centrality)                    |
| Filtro por tag               | Slider/checkbox filtra nós por tags - apenas nós relevantes visíveis            |
| Clique em nó                 | Abre preview da nota lateralmente sem sair do grafo                             |
| Duplo-clique em nó           | Navega para o editor da nota                                                    |
| Hover em aresta              | Tooltip mostra contexto da conexão (tag compartilhada, link wiki)               |
| Mini-mapa                    | Cytoscape Navigator extension - overview do grafo total no canto inferior       |

## 6.3 Tipos de Conexão no Grafo

| Tipo de Conexão              | Como é gerada                                                    |
| -------------------------------- | -------------------------------------------------------------------- |
| Wiki-link [[NomeDaNota]] | Detectada pelo TipTap ao digitar [[ - aresta direta entre as notas |
| Tags compartilhadas          | 2 notas com mesma tag → aresta pontilhada (conexão implícita)        |
| Mesma pasta                  | Notas na mesma pasta → agrupadas visualmente com bordas coloridas    |
| Sugestão da IA               | LLM sugere link → usuário aprova → aresta criada                     |
| Mesma matéria                | Notas de estudo da mesma matéria → aresta com cor da matéria         |
| Backlinks                    | Nota B referencia Nota A → seta de B para A no grafo                 |

## 6.4 Interface do Grafo

A página do grafo (/app/grafo) tem layout de tela cheia com painel lateral de filtros:

**🗺️ Layout da Página do Grafo**

```
┌─────────────────────────────────────────────────────────────────┐
│  [NexoMente]  Dashboard  Notas  Estudo  ● Grafo  Estatísticas    │  ← Header
├──────────────────────────────────────┬──────────────────────────────┤
│                                      │  FILTROS              [×]   │
│                                      │  ─────────────────────────  │
│                                      │  Tipo de nota:              │
│         CANVAS DO GRAFO              │  ☑ Livros  ☑ Projetos      │
│         (Cytoscape.js)               │  ☑ Ideias  ☑ Diário        │
│                                      │  ─────────────────────────  │
│    ○━━━●━━━○                         │  Tags: [campo busca]        │
│       ║   ╲                          │  ─────────────────────────  │
│    ○━━●     ○━━○                     │  Mostrar conexões:          │
│                                      │  ☑ Wiki-links              │
│                                      │  ☑ Tags compartilhadas     │
│                                      │  ☐ Mesma pasta             │
├──────────────────────────────────────┤  ─────────────────────────  │
│ [+/-Zoom]  [Layout: força▼]  [Reset] │  PREVIEW DA NOTA           │
│ Nós: 47   Conexões: 83               │  (aparece ao clicar nó)    │
└──────────────────────────────────────┴──────────────────────────────┘
```

## 6.5 Performance do Grafo

Com centenas de notas, o grafo pode ficar pesado. Estratégias de performance:

- Lazy loading: renderiza apenas nós visíveis na viewport atual
- Debounce de 300ms em filtros para não re-renderizar em cada keystroke
- WebGL renderer (cytoscape-webgl) para grafos com 500+ nós
- Cache do layout calculado - relayout apenas quando notas são adicionadas/removidas
- Limite padrão de 200 nós visíveis com paginação/zoom para ver mais

# 7. UX Design - Especificação Completa

## 7.1 Filosofia de Design

O NexoMente Local adota uma estética que chamaremos de Dark Academic Digital: sombria, elegante, intelectual. Inspirada em Obsidian + Notion + Linear, mas com personalidade própria. O design deve transmitir: 'este app foi feito por alguém que leva o conhecimento a sério.'

**🎨 Os 4 Princípios de Design do NexoMente**

1. CLAREZA SOBRE DECORAÇÃO - Cada elemento existe por uma razão funcional. Sem bordas, sombras ou gradientes decorativos. Beleza vem da tipografia e espaçamento.
2. FEEDBACK IMEDIATO - Toda ação do usuário recebe resposta visual em <100ms. Loading states para operações >200ms. Nunca deixar o usuário se perguntar "aconteceu alguma coisa?".
3. FOCO PROTEGIDO - Modo Foco remove 100% das distrações. Dashboard diário tem hierarquia clara: o mais importante aparece primeiro, sem scrollar.
4. GAMIFICAÇÃO DISCRETA - XP, níveis e conquistas ficam presentes mas não dominantes. O aprendizado é o objetivo, a gamificação é o combustível.

## 7.2 Sistema de Cores

| Variável CSS      | Tema Escuro | Uso                               |
| --------------------- | --------------- | ------------------------------------- |
| --bg-primary     | #0F0E17         | Fundo principal da app                |
| --bg-secondary   | #1A1826         | Sidebar, cards, painéis               |
| --bg-tertiary    | #252338         | Inputs, hover states, modais          |
| --accent-main    | #6C63FF         | Botões primários, links ativos, grafo |
| --accent-light   | #A78BFA         | Tags, badges, destaques secundários   |
| --accent-glow    | #6C63FF40       | Sombra de glow (box-shadow)           |
| --text-primary   | #F2F0FF         | Texto principal                       |
| --text-secondary | #9CA3AF         | Texto secundário, metadados           |
| --text-muted     | #6B7280         | Placeholders, rótulos desabilitados   |
| --border-subtle  | #2D2B45         | Bordas de divisão sutis               |
| --border-active  | #6C63FF         | Borda de elemento ativo/focado        |
| --success        | #10B981         | Missões concluídas, metas atingidas   |
| --warning        | #F59E0B         | Alertas, streak em risco              |
| --danger         | #EF4444         | Erros, delete permanente              |
| --xp-gold        | #FBBF24         | XP, moedas, gamificação               |
| --node-book      | #8B5CF6         | Nós de livros no grafo                |
| --node-project   | #3B82F6         | Nós de projetos no grafo              |
| --node-idea      | #EC4899         | Nós de ideias no grafo                |
| --node-diary     | #10B981         | Nós de diário no grafo                |
| --node-study     | #F59E0B         | Nós de estudo no grafo                |

Tema claro: as mesmas variáveis CSS são redefinidas. --bg-primary vira #FFFFFF, --bg-secondary vira #F5F3FF, --text-primary vira #1E1B4B. Todas as cores de acento permanecem iguais - a paleta é coerente entre temas.

## 7.3 Tipografia

| Elemento        | Especificação                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Fonte principal | Inter (Google Fonts) - moderna, legível em telas, suporte a PT-BR                                    |
| Fonte do editor | JetBrains Mono - monospace para o editor de notas (sensação de 'rascunho de código')                 |
| Tamanhos (rem)  | xs: 0.75rem | sm: 0.875rem | base: 1rem | lg: 1.125rem | xl: 1.25rem | 2xl: 1.5rem | 3xl: 2rem |
| Pesos           | Normal: 400 | Medium: 500 | Semibold: 600 | Bold: 700                                             |
| Line-height     | Texto corrido: 1.6 | Títulos: 1.2 | UI compacta: 1.3                                               |
| Letter-spacing  | Headings: -0.02em | Caps/labels: 0.08em                                                             |

## 7.4 Sistema de Espaçamento

Baseado na escala 4px (Tailwind padrão). As margens e paddings seguem: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Nunca usar valores ímpares ou fora da escala.

## 7.5 Componentes de UI

### 7.5.1 Sidebar

Largura: 260px desktop | overlay full-height mobile. Seções: Perfil+XP bar no topo, navegação principal, seção de IA (status do LLM), quota do cofre. Collapse possível para 60px (apenas ícones).

### 7.5.2 Header

Altura: 60px. Conteúdo: breadcrumb da página atual (esquerda), barra de busca global (centro, shortcut Ctrl+K), botões de ação contextual (direita). Em mobile: hamburguer (esquerda), título (centro), busca ícone (direita).

### 7.5.3 Cards de Nota

Dois modos: grade (3 colunas desktop / 2 tablet / 1 mobile) e lista. Card tem: ícone do tipo, título, preview de 2 linhas, tags como chips, data de atualização, indicador de notas relacionadas no grafo (número de conexões). Hover: elevação sutil com box-shadow usando --accent-glow.

### 7.5.4 Editor de Notas

Layout de 2 zonas: toolbar fixa no topo (formatação + IA) e área de escrita. Em Modo Foco: sidebar oculta, header minimizado (apenas título), toolbar desaparece até mover o mouse. Fonte: JetBrains Mono 16px, line-height 1.6, max-width 720px centralizado.

### 7.5.5 Quick Capture

Ativado com Ctrl+Shift+N de qualquer tela. Modal centralizado com animação de escala (Framer Motion). Campo único de texto, seletor de tipo (7 ícones), e botão salvar. ESC fecha. Nota vai para pasta Inbox e é marcada para organização posterior pela IA.

### 7.5.6 Gamificação Visual

XP Toast: aparece no cantonferior direito, dura 3 segundos, mostra +XP com ícone dourado e animação de float-up. Level Up Modal: tela cheia com confetti (canvas-confetti), título do novo nível, botão fechar. Achievement Toast: similar ao XP mas com ícone da conquista. Streak: flame emoji animado no header quando streak >= 3 dias.

## 7.6 Layout Responsivo

| Breakpoint            | Layout           | Ajustes principais                                  |
| ------------------------- | -------------------- | ------------------------------------------------------- |
| Mobile (<640px)       | 1 coluna, nav bottom | Sidebar vira drawer, grafo simplificado, cards em lista |
| Tablet (640-1024px)   | 2 colunas            | Sidebar colapsada (60px), grafo com menos detalhes      |
| Desktop (1024-1440px) | 3 colunas            | Layout completo, sidebar 260px, grafo tela cheia        |
| Wide (>1440px)        | Layout expandido     | Max-width 1400px centralizado, sidebar pode expandir    |

## 7.7 Animações e Micro-interações

| Interação               | Animação                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| Hover em card de nota   | box-shadow 0 0 20px --accent-glow, transform translateY(-2px) - 150ms ease |
| Sidebar collapse/expand | width transition 200ms ease - não usar display:none                        |
| Modal open/close        | scale(0.95) → scale(1) + opacity 0→1 - 200ms ease-out (Framer Motion)      |
| Quick Capture           | scale(0.8) → scale(1) com spring (Framer Motion stiffness: 400)            |
| XP ganho                | número de XP sobe com float + fade out - 800ms (Framer Motion)             |
| Level Up                | tela explode em confetti - canvas-confetti com particulas douradas         |
| Nó do grafo hover       | ring de glow animado via Cytoscape animation API                           |
| Barra de progresso      | width transition 600ms ease - smooth fill                                  |
| Tab switch              | opacity + slide lateral sutil - 150ms                                      |
| Streak fire             | flame emoji com keyframe scale(1) → scale(1.1) → scale(1) loop             |

## 7.8 Estados Vazios e Onboarding

Estados vazios são oportunidades de engajamento, não erros. Cada tela vazia tem: ilustração SVG temática, mensagem motivacional personalizada, e ação primária clara (botão 'Criar primeira nota', etc.).

## 7.9 Acessibilidade

- Contraste mínimo 4.5:1 (WCAG AA) - verificado com Colour Contrast Analyser
- Navegação 100% por teclado - Tab, Enter, ESC, Setas em todos os componentes
- aria-label em todos os ícones sem texto
- focus-visible rings visíveis (outline 2px --accent-main, offset 2px)
- Redução de movimento: prefers-reduced-motion desativa animações não essenciais
- Tamanho mínimo de alvo touch: 44×44px em mobile

# 8. Módulos do MVP - Adaptados para Versão Local

## 8.1 Ordem de execução

| Fase           | Módulo           | Entrega principal                                                        |
| ------------------ | -------------------- | ---------------------------------------------------------------------------- |
| 1 (4-5 dias)   | Fundação             | Electron + React + SQLite + layout com tema escuro + Pasta Cofre configurada |
| 2 (3-4 dias)   | Dashboard            | Morning Brief + Quick Capture + status do LLM local                          |
| 3 (10-14 dias) | Notas                | 7 tipos + editor TipTap + wiki-links + wiki-links alimentando o grafo        |
| 4 (7-10 dias)  | Estudo               | Pomodoro + matérias + metas + flashcards SM-2                                |
| 5 (3-4 dias)   | Gamificação          | XP + níveis + missões diárias + conquistas                                   |
| 6 (4-5 dias)   | IA + Grafo           | Cytoscape.js + tags via LLM + resumos + links sugeridos                      |
| 7 (2-3 dias)   | Build e Distribuição | Electron builder, instalador .exe/.dmg, release no GitHub                    |

## 8.2 Diferenças do plano original por módulo

| Módulo           | Diferenças na versão Local                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 - Fundação    | Sem Supabase. Adicionar: Electron setup, preload.js, IPC handlers para fs/db. SQLite via better-sqlite3. Sem tela de login.                   |
| M2 - Dashboard   | Dados vêm do SQLite local. Status do servidor Ollama/LMStudio no Morning Brief. Indicador de sync do Drive.                                   |
| M3 - Notas       | Salvar nota → escrever .md no Cofre. Wiki-links [[]] com autocompletar desde o MVP (alimenta grafo). Chokidar monitora mudanças externas. |
| M4 - Estudo      | Idêntico. Sessions salvas no SQLite.                                                                                                          |
| M5 - Gamificação | Idêntico. XP e conquistas no SQLite.                                                                                                          |
| M6 - IA          | Sem fallback Claude API (opcional por config). Adicionar: Grafo Cytoscape.js completo. Sugestão de links via IA.                              |
| M7 - Build       | Electron Builder para gerar instaladores. Sem Vercel/PWA. Atualização automática via GitHub Releases (electron-updater).                      |

# 9. Electron - Configuração Desktop

## 9.1 Estrutura do Main Process

**⚡ electron/main.js - Pontos críticos**

```javascript
// Janela principal
const win = new BrowserWindow({
  width: 1280, height: 800,
  minWidth: 800, minHeight: 600,
  frame: false,                    // Janela sem borda — controles customizados
  titleBarStyle: 'hiddenInset',    // macOS: controles nativos integrados
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,        // Segurança: renderer não acessa Node.js diretamente
    nodeIntegration: false
  }
});

// IPC handlers registrados:
ipcMain.handle('db:query', handler)        // Queries SQLite
ipcMain.handle('fs:writeNote', handler)    // Escrever .md no Cofre
ipcMain.handle('fs:readNote', handler)     // Ler .md do Cofre
ipcMain.handle('ai:generate', handler)     // Chamar Ollama/LMStudio
ipcMain.handle('config:get', handler)      // Ler config.json
ipcMain.handle('config:set', handler)      // Salvar config.json
ipcMain.handle('sync:status', handler)     // Status do Drive
ipcMain.handle('backup:create', handler)   // Criar backup do .db
```

## 9.2 Build e Distribuição

| Target            | Configuração                                                  |
| --------------------- | ----------------------------------------------------------------- |
| Windows (.exe)    | NSIS installer com ícone personalizado, pasta AppData para config |
| macOS (.dmg)      | DMG com background customizado, assinatura opcional               |
| Linux (.AppImage) | Portátil, sem instalação, funciona em qualquer distro             |
| Auto-update       | electron-updater + GitHub Releases - notificação no topo do app   |

# 10. Convenções de Código e Qualidade

## 10.1 Estrutura de pastas (atualizada)

| Pasta                      | Conteúdo                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| app/src/pages/             | Dashboard, Notes, Study, Flashcards, Statistics, Settings, Graph (novo)            |
| app/src/components/layout/ | AppLayout, Sidebar, Header, TitleBar (janela sem borda)                            |
| app/src/components/graph/  | GraphView, GraphFilters, NodePreview, GraphMinimap                                 |
| app/src/components/editor/ | RichEditor, EditorToolbar, FocusMode, WikiLinkSuggester                            |
| app/src/services/          | notesService, aiService, graphService, syncService, exportService, backupService   |
| app/src/lib/               | db.js (SQLite via IPC), sm2.js, xpSystem.js, markdownConverter.js, cofreWatcher.js |
| electron/ipc/              | db.js, files.js, ai.js, sync.js, config.js, backup.js                              |
| electron/                  | main.js, preload.js                                                                |

## 10.2 Nomenclatura

- Arquivos de componentes: PascalCase.jsx (ex: GraphView.jsx)
- Arquivos JS: camelCase.js (ex: graphService.js)
- Funções: verbos camelCase (createNote, fetchGraphData, syncToCofre)
- Constantes: UPPER_SNAKE_CASE (NODE_TYPES, GRAPH_LAYOUTS)
- Variáveis CSS: --categoria-nome (--node-book, --accent-glow)
- IPC channels: 'dominio:acao' (db:query, fs:writeNote, ai:generate)

# 11. Riscos e Mitigações (Versão Local)

| Risco                                       | Impacto | Mitigação                                                                                      |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| LLM offline → IA não funciona               | MÉDIO       | Todas as funções de IA têm fallback manual. Banner sutil quando LLM offline. Timeout 30s.          |
| Conflito de sync Drive (edição simultânea)  | MÉDIO       | Regra de 'mais recente vence' por atualizado_em. Versão antiga salva em _backups/.                |
| Banco corrompido (crash durante escrita)    | ALTO        | SQLite WAL mode ativo. Backup automático semanal. Backup manual antes de atualizações.             |
| Google Drive não instalado                  | MÉDIO       | App funciona normalmente sem sync. Banner de configuração. Pasta Cofre pode ser local.             |
| Modelo LLM muito pesado trava PC            | MÉDIO       | IA é sempre assíncrona. Timeout configurável. Recomendação de modelos leves na tela de config.     |
| Perda de nota (delete acidental)            | ALTO        | Soft delete (arquivar). Confirmação obrigatória para delete permanente. .md ainda existe no Cofre. |
| Electron desatualizado com vulnerabilidades | BAIXO       | electron-updater cuida de atualizações automáticas. Manter Electron >= 28.                         |

# 12. Checklist de Entrega do MVP

## Fase 1 - Fundação

- Electron configurado com preload.js e contextIsolation
- React + Vite rodando no renderer process
- SQLite operacional com todas as 13 tabelas
- Pasta Cofre selecionável nas configurações
- Tema escuro aplicado com variáveis CSS
- Layout base: sidebar, header, área principal
- Responsividade: mobile, tablet, desktop

## Fase 2 - Dashboard

- Morning Brief com saudação personalizada + hora
- Quick Capture funcional (Ctrl+Shift+N)
- Status do LLM local visível na sidebar
- Indicador de sync do Google Drive
- Missões diárias exibidas

## Fase 3 - Notas

- 7 tipos de nota funcionando
- Editor TipTap com toolbar completa
- Wiki-links [[]] com autocompletar
- Sincronização bidirecional com Pasta Cofre (.md)
- Busca full-text (SQLite FTS5)
- Modo Foco sem distrações
- Tags: manual + sugestão por IA

## Fase 4 - Estudo

- Pomodoro Timer com configuração
- Matérias com cor e meta de horas
- Flashcards com algoritmo SM-2
- Sessões de estudo registradas

## Fase 5 - Gamificação

- Sistema de XP com eventos configuráveis
- Níveis e títulos
- Missões diárias com progresso
- Conquistas desbloqueáveis
- Animações: XP Toast, Level Up Modal

## Fase 6 - IA + Grafo

- Integração com Ollama (porta 11434)
- Funções: Tags, Resumo, Flashcards, Links
- Gráfico Cytoscape.js com nós por tipo
- Filtros do grafo funcionando
- Preview de nota ao clicar no nó
- Conexões: wiki-links + tags compartilhadas

## Fase 7 - Build

- Electron Builder configurado
- Instalador Windows (.exe) testado
- Auto-update com GitHub Releases
- Ícone e splash screen do app
- README com instruções de instalação

---

NexoMente Local - Especificação v1.0 | Uso pessoal do Bruno | Gerado em Abril 2025
