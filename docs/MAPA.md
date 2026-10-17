# MAPA DE CONEXÕES DO NEXOMENTE

> **Visão Geral**  
> O NexoMente é uma aplicação híbrida (Web SPA + Desktop Electron) voltada para estudos, gestão de conhecimento e raciocínio com IA.  
> O núcleo de persistência opera via SQLite compilado em WebAssembly (`SQL.js`) no navegador e `better-sqlite3` no processo principal do Electron, exposto por barramento IPC.  
> O estado de interface e os subsistemas de gamificação (Tamagotchi de 30 níveis) e timer de estudos são orquestrados por stores reativas Zustand.  
> As inteligências artificiais operam sob uma camada de abstração com suporte a LM Studio, Google Gemini e LLM embutida nativa (`node-llama-cpp`).  
> O mapa a seguir cataloga todos os hubs centrais, nós funcionais, canais IPC e matrizes de impacto validados estritamente no código-fonte.

---

## 1. HUBS (Recursos Compartilhados)

### HUB: i18n-engine (Internacionalização Desacoplada PT-BR / EN-US / ES-ES)
- **Arquivo**: `app/src/lib/i18n.js:1`
- **Implementação**: Store Zustand `useI18nStore` + hook `useTranslation()` persistido em `localStorage('nexomente_locale')`.
- **Descrição**: Arquitetura de internacionalização baseada em chaves e dicionários (`pt-BR`, `en-US`, `es-ES`) para eliminar textos hardcoded nas telas principais e na navegação.
- **Usado por**:
  - `layout: Sidebar` (`app/src/components/layout/Sidebar.jsx`)
  - `layout: Header` (`app/src/components/layout/Header.jsx`)
  - `página: Dashboard` (`app/src/pages/Dashboard.jsx`)
  - `página: Poemas` (`app/src/pages/Poemas.jsx`)
  - `página: Flashcards` (`app/src/pages/Flashcards.jsx`)
  - `página: Graph` (`app/src/pages/Graph.jsx`)
- **Se quebrar**: As chaves de tradução não são resolvidas na interface e o seletor de idiomas na Sidebar deixa de atualizar os textos.

### HUB: db-store (WASM Engine & Repositórios Zustand)
- **Arquivo**: `app/src/store/useDBStore.js:13`
- **Implementação**: `app/src/lib/db/wasmEngine.js:19`, repositórios em `app/src/lib/db/repositories/`
- **Descrição**: Motor central de banco de dados SQLite (WASM em memória + serialização Base64 chunked de 32KB em `localStorage` sob chave `nexomente_db`). Expõe repositórios para Notas, Pastas, Matérias, Sessões de Estudo, Flashcards, XP e Poemas.
- **Usado por**:
  - `hook: useNotes` (`app/src/hooks/useNotes.js`)
  - `hook: useMaterias` (`app/src/hooks/useMaterias.js`)
  - `hook: useFlashcards` (`app/src/hooks/useFlashcards.js`)
  - `store: useStudyTimerStore` (`app/src/store/useStudyTimerStore.js`)
  - `página: Study` (`app/src/pages/Study.jsx`)
  - `página: Statistics` (`app/src/pages/Statistics.jsx`)
- **Se quebrar**: Toda a leitura e gravação de notas, cards, matérias, poemas e histórico de estudo falha e o app entra em modo de erro.

### HUB: ai-provider (Motor Interno de IA GGUF)
- **Arquivo**: `app/src/lib/ai/aiProvider.js:29`
- **Implementação**: `app/src/lib/ai/embeddedService.js`, `electron/ipc/aiHandlers.js`, `vite.config.js`
- **Descrição**: Roteador do motor de inteligência artificial unificado e 100% privado. Executa inferência local embutida (`node-llama-cpp@3.22.1` nativo apontando para a pasta própria `electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf` dentro do projeto, via IPC `ai:embeddedChat` no Electron ou middleware `/api/embedded/chat` no Vite).
- **Usado por**:
  - `store: useAIStore` (`app/src/store/useAIStore.js`)
  - `hook: useAIModel` (`app/src/hooks/useAIModel.js`)
  - `parser: gerarQuestoesComIA` (`app/src/lib/parser.js`)
  - `página: AIChat` (`app/src/pages/AIChat.jsx`)
  - `página: Graph` (`app/src/pages/Graph.jsx`)
  - `página: Settings` (`app/src/pages/Settings.jsx`)
- **Se quebrar**: Chat neural, geração de questões da forja, resumos e sugestão de tags deixam de responder.

### HUB: tamagotchi-engine (Gamificação, Níveis e HP)
- **Arquivo**: `app/src/store/useTamagotchiStore.js:84`
- **Implementação**: Estado Zustand persistido em `localStorage` (`tamagotchi_storage`).
- **Descrição**: Controla ciclo de vida do pet virtual (30 níveis, estágios de evolução, HP de 0 a 150, penalidade por dias ausentes, escudos de gelo `streak_freezes`, multiplicadores de XP e recompensas).
- **Usado por**:
  - `componente: TamagotchiWidget` (`app/src/components/gamification/TamagotchiWidget.jsx`)
  - `componente: Sidebar` (`app/src/components/layout/Sidebar.jsx`)
  - `componente: Header` (`app/src/components/layout/Header.jsx`)
  - `store: useStudyTimerStore` (`app/src/store/useStudyTimerStore.js`)
  - `página: Dashboard` (`app/src/pages/Dashboard.jsx`)
  - `página: Poemas` (`app/src/pages/Poemas.jsx`)
  - `página: Statistics` (`app/src/pages/Statistics.jsx`)
- **Se quebrar**: Progressão de níveis congela, XP de estudos e cards não é computado na evolução do avatar e widgets do pet somem ou quebram o layout.

### HUB: study-timer-engine (Timer de Estudos & MiniTimer PiP)
- **Arquivo**: `app/src/store/useStudyTimerStore.js:39`
- **Implementação**: Timer persistente global com suporte a Pomodoro (25m), Foco Profundo (50m) e Descanso (5m).
- **Descrição**: Gerencia contagem regressiva imune a trocas de aba, registro atômico de sessões em `SessoesEstudo`, entrega de XP com confetti e controle do widget miniaturizado (`MiniTimerWidget`).
- **Usado por**:
  - `página: Study` (`app/src/pages/Study.jsx`)
  - `componente: MiniTimerWidget` (`app/src/components/study/MiniTimerWidget.jsx`)
  - `componente: CircularTimer` (`app/src/components/study/CircularTimer.jsx`)
  - `raiz: App` (`app/src/App.jsx`)
- **Se quebrar**: O cronômetro de estudo para de contar, sessões não são salvas no banco e o PiP não abre ao trocar de tela.

### HUB: ui-store (Navegação Global & Ações Cruzadas)
- **Arquivo**: `app/src/store/useUIStore.jsx:8`
- **Implementação**: Estado Zustand com persistência de preferências de interface (`nexomente_user_name`, `nexomente_sidebar_open`, `nexomente_onboarding_done`).
- **Descrição**: Controla aba ativa do aplicativo, visibilidade da barra lateral, nome do usuário e despacho de deep links de notas (`pendingNoteAction`).
- **Usado por**:
  - `raiz: App` (`app/src/App.jsx`)
  - `layout: Sidebar` (`app/src/components/layout/Sidebar.jsx`)
  - `layout: Header` (`app/src/components/layout/Header.jsx`)
  - `layout: BottomNav` (`app/src/components/layout/BottomNav.jsx`)
  - `página: Dashboard` (`app/src/pages/Dashboard.jsx`)
  - `página: Notas` (`app/src/pages/Notas.jsx`)
  - `página: Graph` (`app/src/pages/Graph.jsx`)
  - `página: Statistics` (`app/src/pages/Statistics.jsx`)
  - `página: Settings` (`app/src/pages/Settings.jsx`)
  - `página: Onboarding` (`app/src/pages/Onboarding.jsx`)
- **Se quebrar**: O roteamento do app para de responder, atalhos de navegação não funcionam e deep links entre Dashboard/Grafo e Editor falham.

### HUB: electron-ipc-bridge (Barramento Nativo Desktop)
- **Arquivo**: `electron/preload.js:3`
- **Implementação**: Processo principal (`electron/main.js`), handlers em `electron/ipc/` (`aiHandlers.js`, `dbHandlers.js`, `windowHandlers.js`) e SQLite nativo (`electron/db/database.js`).
- **Descrição**: Camada de integração nativa do Electron protegida por `contextIsolation: true`. Disponibiliza controles de janela sem borda, acesso direto a banco local `better-sqlite3` e runtime nativo de inferência local `node-llama-cpp`.
- **Usado por**:
  - `componente: Header` (minimizar, maximizar, fechar)
  - `serviço: embeddedService` (inferência GGUF local)
  - `página: Settings` (detecção de execução desktop)
- **Se quebrar**: O modo desktop perde controle de janela, aceleração nativa de IA fica desativada e chamadas nativas emitem `ERR-IPC-MISSING`.

---

## 2. NÓS (Funcionalidades por Tela)

### NÓ: Dashboard - Edição de Nome do Jogador
- **Arquivo**: `app/src/pages/Dashboard.jsx:48`
- **Fluxo**: Clique no nome (`startEditName`) → input inline → `Enter` / clique em Check (`saveEditName`) → `useUIStore.setUserName(nome)` → gravação em `localStorage('nexomente_user_name')` → toast de sucesso.
- **Usa**: `ui-store`
- **Afeta**: Cabeçalho do Dashboard, Profile Popover no `Header.jsx`, saudação e `Settings.jsx`.

### NÓ: Dashboard - Balão de Fala do Pet
- **Arquivo**: `app/src/components/gamification/TamagotchiWidget.jsx:52`
- **Fluxo**: Clique no avatar do pet (`handlePetClick`) → sorteio de fala situacional baseada em HP e streak (`FALAS_PET`) → renderização com Framer Motion → auto-dismiss após 4000ms.
- **Usa**: `tamagotchi-engine`
- **Afeta**: Feedback visual imediato e engajamento do usuário.

### NÓ: Dashboard - Botão Rápido Criar Nota
- **Arquivo**: `app/src/pages/Dashboard.jsx:134`
- **Fluxo**: Clique em "NOTA" → `setPendingNoteAction({ action: 'create' })` → `setActiveTab('notes')` → `Notas.jsx:126` captura ação pendente → dispara `criarNota('nota')` → foca novo documento em modo de edição.
- **Usa**: `ui-store`, `db-store` (repositório `Notas`)
- **Afeta**: Navega para o Editor de Notas e cria novo registro instantaneamente.

### NÓ: Dashboard - Deep Link de Notas Recentes
- **Arquivo**: `app/src/pages/Dashboard.jsx:217`
- **Fluxo**: Clique no card da nota recente → `setPendingNoteAction({ noteId })` → `setActiveTab('notes')` → `Notas.jsx:126` busca nota por ID no `useNotes` → define `notaSelecionada` e `setEditando(true)` → exibe no TipTap pronto para edição.
- **Usa**: `ui-store`, `hook: useNotes`
- **Afeta**: Transição de tela e seleção determinística no editor.

### NÓ: Dashboard - Curadoria Poética & Modal Dojo
- **Arquivo**: `app/src/pages/Dashboard.jsx:282`
- **Fluxo**: Clique em "Recitar no Dojo" → `setModalDojoAberto(true)` → renderiza overlay modal de `PoemaRecitacao.jsx` com `onClose` e `onFinish` conectados → inicializa reconhecimento de voz Vosk (`useVosk`) e credita `+25 XP` ao concluir.
- **Usa**: `db-store` (repositório `Poemas`), `tamagotchi-engine`, Vosk Browser
- **Afeta**: Executa sessão de oratória poética diretamente da home e concede XP.

### NÓ: Sala de Estudos - Seletor de Modo & Início de Timer
- **Arquivo**: `app/src/pages/Study.jsx:79`
- **Fluxo**: Clique no botão do modo (Pomodoro / Foco / Pausa) → `trocarModo(id)` → ajuste de `timer` e `totalSeconds` → clique no botão "Iniciar" (`iniciar()`) → `useDBStore.SessoesEstudo.create()` cria sessão pendente → `setInterval` de 1000ms inicia contagem decrescente.
- **Usa**: `study-timer-engine`, `db-store` (repositório `SessoesEstudo`), `tamagotchi-engine`
- **Afeta**: Status do estudo, gravação de sessão no SQLite e renderização do `CircularTimer`.

### NÓ: Sala de Estudos - Conclusão de Sessão & Crédito de XP
- **Arquivo**: `app/src/store/useStudyTimerStore.js:139`
- **Fluxo**: Timer atinge `0s` → `concluirSessao()` → `SessoesEstudo.completar(sessaoId)` → `XP.add(xpGanho)` → `useTamagotchiStore.addBonusXp(xpGanho)` → `playCompletionChime()` emite áudio Web Audio API → disparo de confetti na tela.
- **Usa**: `study-timer-engine`, `db-store`, `tamagotchi-engine`
- **Afeta**: XP do usuário, cura proporcional do pet virtual, histórico de sessões em `Statistics.jsx`.

### NÓ: Sala de Estudos - MiniTimer PiP Flutuante
- **Arquivo**: `app/src/components/study/MiniTimerWidget.jsx:59`
- **Fluxo**: Usuário navega para qualquer outra aba enquanto timer roda → `App.jsx:55` detecta saída da aba `study` com sessão ativa e seta `isMiniaturized(true)` → widget flutuante renderiza no canto inferior direito → botões Play/Pause/Abandonar operam a store → clique no widget chama `setActiveTab('study')` restaurando a tela cheia.
- **Usa**: `study-timer-engine`, `ui-store`
- **Afeta**: Continuidade visual dos estudos durante multitarefa.

### NÓ: Editor de Notas - Autosalvamento com Debounce & Status
- **Arquivo**: `app/src/hooks/useNotaEditor.js:77`
- **Fluxo**: Digitação no TipTap ou alteração do título → `onUpdate` sincroniza imediatamente `notaSelecionada.conteudo` em memória e aciona `setSaveStatus('saving')` → temporizador de debounce de 600ms (ou clique no botão `Salvar` / `Ctrl+S`) grava `NotasRepo.update(id, { conteudo, titulo })` no SQLite WASM → `setSaveStatus('saved')`. Ao criar nota em uma Biblioteca (`Livros`, `Projetos`, `Ideias`, `Estudo`, `Bíblia`, `Inbox`), a nota herda o `tipo` e `pasta_id` da categoria ativa.
- **Usa**: `db-store` (repositório `Notas`)
- **Afeta**: Persistência do conteúdo, título, categoria da biblioteca e metadados das notas (`inbox`, `processado`, `referencia`, `arquivado`, `ativo`).

### NÓ: Editor de Notas - Barra de Formatação (`EditorToolbar`)
- **Arquivo**: `app/src/components/editor/EditorToolbar.jsx:32`
- **Fluxo**: Clique nos botões de formatação → `editor.chain().focus()...run()` (Negrito, Itálico, Sublinhado, Tachado, Marca-texto, Código, H1/H2/H3, Lista com Marcadores, Lista Numerada com `.ProseMirror ol`, Lista de Tarefas, Citação, Bloco de Código, Fórmula LaTeX via prompt `$formula$`, Linha Divisória, Inserir/Remover Link via `setLink`/`unsetLink`, Desfazer/Refazer e Modo Foco).
- **Usa**: TipTap Editor, `index.css` (`.ProseMirror`)
- **Afeta**: Formatação visual em tempo real do documento e persistência HTML.

### NÓ: Editor de Notas - Botão AI Tag#
- **Arquivo**: `app/src/components/editor/AIBar.jsx:22`
- **Fluxo**: Clique em `Tag#` → `useNotaEditor.handleTagsOpen()` → `lmStudioService.suggestTags(nota)` → extração de palavras-chave com IA → abertura do modal `TagPickerModal` → confirmação adiciona tags via `useNotes.addTag()`.
- **Usa**: `ai-provider`, `hook: useNotes`, `db-store`
- **Afeta**: Metadados da nota, arestas semânticas no Grafo (`Graph.jsx`) e filtros por tags.

### NÓ: Editor de Notas - Botão AI Resumir
- **Arquivo**: `app/src/components/editor/AIBar.jsx:32`
- **Fluxo**: Clique em `Resumir` → `useNotaEditor.handleResumoOpen()` → `lmStudioService.summarizeContent(conteudo)` → prompt com resumo gerado → confirmação insere bloco `<blockquote class="ai-resumo">` no topo do editor TipTap e salva imediatamente.
- **Usa**: `ai-provider`, TipTap Editor, `db-store`
- **Afeta**: Corpo HTML da nota e resumo executivo do documento (`resumo_ia`).

### NÓ: Editor de Notas - Botão AI Cards & Chat IA
- **Arquivo**: `app/src/components/editor/AIBar.jsx:42`
- **Fluxo**: Clique em `Cards` (ou `Chat IA`) → `useNotaEditor.handleCardsOpen()` salva a nota imediatamente (`salvarImediato()`), registra `useUIStore.setPendingChatNoteId(notaSelecionada.id)` e navega para `AIChat.jsx` → `AIChat.jsx` carrega automaticamente a nota atual como contexto principal da conversa e, ao final de cada interação (ou ao clicar em "Concluir & Salvar Resumo na Nota"), gera e adiciona um resumo conciso da conversa no próprio corpo da nota (`<blockquote class="ai-chat-summary">`) e em `resumo_ia`.
- **Usa**: `ui-store`, `ai-provider`, `hook: useNotes`, `db-store`
- **Afeta**: Conexão direta entre Nota e Chat Neural, enriquecimento automático da nota com o resumo conciso da conversa.

### NÓ: Central de Flashcards - Avaliação Anki SRS, Cloze & Atalhos
- **Arquivo**: `app/src/components/flashcards/FlashcardViewer.jsx:131`
- **Fluxo**: Usuário clica no card ou pressiona `Space`/`Enter` → `setMostrandoFrente(!mostrandoFrente)` (animação Flip 3D com renderização Cloze Deletion `{{c1::...}}`) → usuário clica no botão de rating ou pressiona tecla `1` (*Again*), `2` (*Hard*), `3` (*Good*) ou `4` (*Easy*) → `revisar(card.id, rating)` → cálculo do motor Anki SRS em `sm2.js` (`ankiSRS`, learning steps [1m, 10m], graduação, lapses, detecção de leech) → atualização de `intervalo`, `ease_factor`, `lapses`, `state`, `step_index` e `next_review` no SQLite/WASM → exibição de contadores estilo Anki (Novos em azul, Aprendendo em âmbar, Devidos em verde).
- **Usa**: `hook: useFlashcards`, `db-store` (repositório `Flashcards`), `sm2.js` (`ankiSRS`, `parseCloze`, `previewIntervalo`)
- **Afeta**: Próxima data de revisão do card, taxa de retenção em `Statistics.jsx`, contadores de deck e detecção de sanguessugas (Leech).

### NÓ: Central de Flashcards - Desfazer Imediato (Undo)
- **Arquivo**: `app/src/pages/Flashcards.jsx:47`
- **Fluxo**: Avaliação recente aciona contagem regressiva de 5 segundos de undo → clique em "Desfazer" ou tecla `Z` dispara `handleUndo()` → `update(undoCard.id, ...)` restaura o estado SM-2 exato anterior do card (repetições, intervalo, ease_factor e próxima revisão) no banco.
- **Usa**: `hook: useFlashcards`, `db-store`
- **Afeta**: Previne classificações incorretas acidentais pelo teclado preservando o histórico SM-2.

### NÓ: Biblioteca Poética - Favoritar Poema
- **Arquivo**: `app/src/components/poemas/PoemasListaTab.jsx:119`
- **Fluxo**: Clique no ícone de estrela de um poema → alternância do ID no array de favoritos salvo em `localStorage('nexomente_poemas_favs')` → atualização reativa do filtro de favoritos no acervo.
- **Usa**: Armazenamento local, acervo de poemas
- **Afeta**: Listagem filtrada de poemas na aba de leitura e no gerenciador.

### NÓ: Biblioteca Poética - Dojo de Recitação com IA de Voz
- **Arquivo**: `app/src/components/poemas/PoemaRecitacao.jsx:87`
- **Fluxo**: Clique em "Iniciar Recitação" → `useVosk.startListening()` carrega modelo WASM offline do Vosk → microfone transcreve fala em tempo real → algoritmo compara texto falado com a estrofe original → cálculo de acurácia percentual → término chama `onFinish(poema.id)` que registra recitação, concede `+25 XP` ao jogador (`useTamagotchiStore` e `XP.add`) e atualiza `streak_recitacao`.
- **Usa**: Vosk Browser (modelo de fala local), `tamagotchi-engine`, `db-store`
- **Afeta**: Streak de declamação do poema (`streak_recitacao`), ganho de XP e evolução do pet.

### NÓ: Forja de Questões - Geração de Simulado por IA
- **Arquivo**: `app/src/components/gerador/GeradorForjaTab.jsx:201`
- **Fluxo**: Depósito de material/arquivo (`.txt`, `.md`, `.pdf` via `extrairTextoDePDF`) no Passo 1 → seleção de disciplina (`materia`), banca, foco BM25 (`topico`), rigor/dificuldade, tipo (múltipla escolha, V/F ou discursiva) e provider (interno, nuvem, local) no Passo 2 → clique em "Forjar Agora" → `useGerador.gerarComIA(texto, config)` → pipeline de Chunking Inteligente + BM25 (`selecionarChunksRelevantes`) + Micro-Lotes de até 5 questões com ancoragem literal (`citacao_base`) e `QUESTOES_JSON_SCHEMA` (`createGrammarForJsonSchema` no `node-llama-cpp`) → extrator resiliente `parser.extrairQuestoesDeResposta` → inclusão das questões no banco de simulados.
- **Usa**: `ai-provider`, `hook: useGerador`, `services/exportService`, `serviço: embeddedService`
- **Afeta**: Banco de questões ativas, geração de simulados sem alucinação e conversão silenciosa em lote para flashcards.

### NÓ: Chat Neural - Envio de Mensagem & Resumo Automático na Nota
- **Arquivo**: `app/src/pages/AIChat.jsx:180`
- **Fluxo**: Digitação no campo de prompt → clique em "Enviar" ou `Enter` → mensagem adicionada à conversa via `useAIChat` → histórico enviado para `aiProvider.chat()` com o contexto da nota conectada → resposta renderizada e um resumo conciso da conversa é anexado/atualizado automaticamente no final da própria nota (`gravarResumoConversaNaNota`).
- **Usa**: `ai-provider`, `hook: useAIModel`, `hook: useNotes`, `ui-store`
- **Afeta**: Histórico da sessão de chat neural, conteúdo HTML e `resumo_ia` da nota conectada.

### NÓ: Grafo de Conhecimento - Câmera Cytoscape & Deep Link
- **Arquivo**: `app/src/pages/Graph.jsx:195`
- **Fluxo**: Grafo constrói nós a partir de notas e arestas a partir de `[[wikilinks]]` e tags em comum → clique em um nó seleciona a nota → clique em "Abrir no Editor" dispara `setPendingNoteAction({ noteId })` e `setActiveTab('notes')` → redireciona diretamente para a edição da nota.
- **Usa**: Cytoscape.js, `hook: useNotes`, `ui-store`
- **Afeta**: Navegação relacional entre notas interligadas.

### NÓ: Métricas - Navegação por Categoria de Foco
- **Arquivo**: `app/src/pages/Statistics.jsx:186`
- **Fluxo**: Exibição da distribuição de notas por tipo (*Ideias, Projetos, Livros, etc.*) → clique na barra de categoria dispara `setPendingNoteCategory(tipo)` e `setActiveTab('notes')` → `Notas.jsx` aplica `setCategoriaAtiva(tipo)` automaticamente.
- **Usa**: `ui-store`, `hook: useNotes`
- **Afeta**: Atalho contextual de produtividade das estatísticas para as notas filtradas por categoria.

### NÓ: Cabeçalho - Omnibar de Busca Global (`Ctrl+K`)
- **Arquivo**: `app/src/components/layout/Header.jsx:115`
- **Fluxo**: Pressionar `Ctrl+K` ou digitar no campo de busca no cabeçalho → filtra notas e flashcards em tempo real → clique no resultado despacha `setPendingNoteAction({ noteId })` + `onNavigate('notes')` (ou `onNavigate('flashcards')`).
- **Usa**: `ui-store`, `hook: useNotes`, `hook: useFlashcards`
- **Afeta**: Navegação rápida universal a partir de qualquer tela.

### NÓ: Cabeçalho - Central de Notificações e Alertas
- **Arquivo**: `app/src/components/layout/Header.jsx:206`
- **Fluxo**: Clique no ícone `Bell` → abre popover listando flashcards pendentes de revisão hoje (`getParaRevisao()`) e status de Streak/HP do Pet → clique redireciona para `flashcards` ou `study`.
- **Usa**: `hook: useFlashcards`, `tamagotchi-engine`
- **Afeta**: Engajamento diário e acesso imediato às revisões pendentes.

### NÓ: Configurações - Motor Interno GGUF
- **Arquivo**: `app/src/pages/Settings.jsx:31`
- **Fluxo**: Permite configurar e salvar `nexomente_embedded_path` (padrão `./electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf`) validando via `embeddedService.checkStatus()`.
- **Usa**: `serviço: embeddedService`, `ai-provider`
- **Afeta**: Seleção do motor ativo e validação de modelos locais antes do uso nas ferramentas de IA.

### NÓ: Configurações - Reset de Fábrica com Confirmação Dupla
- **Arquivo**: `app/src/pages/Settings.jsx:48`
- **Fluxo**: Clique em "Apagar Tudo" → modal de perigo exige digitar a palavra exata `"CONFIRMAR"` → botão de exclusão é liberado → limpeza de `localStorage('nexomente_db')`, reinicialização das tabelas SQLite WASM e recarga de página.
- **Usa**: `db-store`, `window.location.reload`
- **Afeta**: Purga total de dados de notas, matérias, sessões e flashcards.

---

## 3. TABELA DE CANAIS IPC (Main ↔ Renderer)

| Canal IPC | Quem Chama (Renderer) | Quem Trata (Electron Main) | Retorno / Tipo |
|---|---|---|---|
| `ai:embeddedChat` | `embeddedService.js:38` | `electron/ipc/aiHandlers.js:306` | `{ success: boolean, response: string, tokens: number, modelFile: string }` |
| `ai:getHardwareInfo` | `electron/preload.js:64` *(Interface declarada)* | `electron/ipc/aiHandlers.js:311` | `{ cpu: string, ram: number, gpu: string, vram: number }` |
| `ai:getContextStats` | `electron/preload.js:65` *(Interface declarada)* | `electron/ipc/aiHandlers.js:323` | `{ activeTokens: number, maxTokens: number }` |
| `db-notas:getAll` | `electron/preload.js:18` *(Interface nativa)* | `electron/ipc/dbHandlers.js:8` | `Array<Nota>` (com tags parsed) |
| `db-notas:getById` | `electron/preload.js:19` *(Interface nativa)* | `electron/ipc/dbHandlers.js:29` | `Nota \| null` |
| `db-notas:create` | `electron/preload.js:20` *(Interface nativa)* | `electron/ipc/dbHandlers.js:50` | `string` (ID da nota criada) |
| `db-notas:update` | `electron/preload.js:21` *(Interface nativa)* | `electron/ipc/dbHandlers.js:78` | `boolean` (alterado com sucesso) |
| `db-notas:delete` | `electron/preload.js:22` *(Interface nativa)* | `electron/ipc/dbHandlers.js:107` | `boolean` (removido com sucesso) |
| `db-pastas:getAll` | `electron/preload.js:25` *(Interface nativa)* | `electron/ipc/dbHandlers.js:123` | `Array<Pasta>` |
| `db-pastas:create` | `electron/preload.js:26` *(Interface nativa)* | `electron/ipc/dbHandlers.js:133` | `string` (ID da pasta criada) |
| `db-materias:getAll` | `electron/preload.js:29` *(Interface nativa)* | `electron/ipc/dbHandlers.js:159` | `Array<Materia>` |
| `db-materias:create` | `electron/preload.js:30` *(Interface nativa)* | `electron/ipc/dbHandlers.js:169` | `string` (ID da matéria criada) |
| `db-sessoes:getAll` | `electron/preload.js:33` *(Interface nativa)* | `electron/ipc/dbHandlers.js:194` | `Array<SessaoEstudo>` |
| `db-sessoes:create` | `electron/preload.js:34` *(Interface nativa)* | `electron/ipc/dbHandlers.js:210` | `string` (ID da sessão criada) |
| `db-sessoes:completar` | `electron/preload.js:35` *(Interface nativa)* | `electron/ipc/dbHandlers.js:234` | `boolean` (sucesso) |
| `db-flashcards:getAll` | `electron/preload.js:38` *(Interface nativa)* | `electron/ipc/dbHandlers.js:250` | `Array<Flashcard>` |
| `db-flashcards:getParaRevisao` | `electron/preload.js:39` *(Interface nativa)* | `electron/ipc/dbHandlers.js:268` | `Array<Flashcard>` (devidos para hoje) |
| `db-flashcards:create` | `electron/preload.js:40` *(Interface nativa)* | `electron/ipc/dbHandlers.js:288` | `string` (ID do card criado) |
| `db-flashcards:revisar` | `electron/preload.js:41` *(Interface nativa)* | `electron/ipc/dbHandlers.js:314` | `boolean` (SM-2 atualizado no SQLite) |
| `db-flashcards:update` | `electron/preload.js:42` *(Interface nativa)* | `electron/ipc/dbHandlers.js:354` | `boolean` (sucesso) |
| `db-flashcards:delete` | `electron/preload.js:43` *(Interface nativa)* | `electron/ipc/dbHandlers.js:380` | `boolean` (removido com sucesso) |
| `db-xp:getTotal` | `electron/preload.js:46` *(Interface nativa)* | `electron/ipc/dbHandlers.js:394` | `number` (soma total de XP nativo) |
| `db-xp:add` | `electron/preload.js:47` *(Interface nativa)* | `electron/ipc/dbHandlers.js:405` | `boolean` (transação registrada) |
| `db-poemas:getAll` | `electron/preload.js:50` *(Interface nativa)* | `electron/ipc/dbHandlers.js:429` | `Array<Poema>` |
| `db-poemas:getById` | `electron/preload.js:51` *(Interface nativa)* | `electron/ipc/dbHandlers.js:444` | `Poema \| null` |
| `db-poemas:create` | `electron/preload.js:52` *(Interface nativa)* | `electron/ipc/dbHandlers.js:460` | `string` (ID do poema criado) |
| `db-poemas:update` | `electron/preload.js:53` *(Interface nativa)* | `electron/ipc/dbHandlers.js:491` | `boolean` (atualizado) |
| `db-poemas:delete` | `electron/preload.js:54` *(Interface nativa)* | `electron/ipc/dbHandlers.js:524` | `boolean` (removido) |
| `db-poemas:recordRecitacao` | `electron/preload.js:55` *(Interface nativa)* | `electron/ipc/dbHandlers.js:535` | `boolean` (streak incrementado) |
| `window:minimize` | `Header.jsx:292` | `electron/ipc/windowHandlers.js:7` | `void` (janela minimizada) |
| `window:maximize` | `Header.jsx:293` | `electron/ipc/windowHandlers.js:11` | `void` (toggle maximizado) |
| `window:close` | `Header.jsx:294` | `electron/ipc/windowHandlers.js:20` | `void` (janela fechada) |
| `window:isMaximized` | `electron/preload.js:8` *(Interface nativa)* | `electron/ipc/windowHandlers.js:24` | `boolean` |
| `config:get` | `electron/preload.js:11` *(Interface nativa)* | `electron/ipc/windowHandlers.js:29` | `any` (dado gravado em `config.json`) |
| `config:set` | `electron/preload.js:12` *(Interface nativa)* | `electron/ipc/windowHandlers.js:42` | `boolean` |
| `dialog:selectFolder`| `electron/preload.js:15` *(Interface nativa)* | `electron/ipc/windowHandlers.js:59` | `string \| null` (caminho da pasta selecionada) |
| `db:getPath` | `electron/preload.js:59` *(Interface nativa)* | `electron/ipc/windowHandlers.js:69` | `string` (caminho para `nexomente.db`) |
| `app:getPath` | `electron/preload.js:58` *(Interface nativa)* | `electron/ipc/windowHandlers.js:73` | `string` (caminho especial do SO) |

---

## 4. TABELA DE IMPACTO ("Se eu mudar X, verificar Y, Z")

| Se alterar... | Componentes e Arquivos Afetados que Devem Ser Verificados |
|---|---|
| **`wasmEngine.js`** *(Schema SQLite / `saveDB`)* | `useDBStore.js`, todos os 7 repositórios em `app/src/lib/db/repositories/`, `useNotes.js`, `useFlashcards.js`, `useMaterias.js`, testes `useDBStore.test.js`, `integration.test.js`, `smoke.test.jsx`. |
| **`aiProvider.js`** *(Contratos `chat` e `generate`)* | `useAIStore.js`, `useAIModel.js`, `lmStudioService.js`, `geminiService.js`, `embeddedService.js`, `AIChat.jsx`, `parser.js`, `useGerador.js`, `AIBar.jsx`, `AIPanel.jsx`, teste `aiService.test.js`. |
| **`useTamagotchiStore.js`** *(Níveis, XP, HP e Passivas)* | `TamagotchiWidget.jsx`, `LevelCard.jsx`, `Header.jsx`, `Dashboard.jsx`, `Statistics.jsx`, `useStudyTimerStore.js`. |
| **`useStudyTimerStore.js`** *(Timer, Estados de Estudo e Sessões)* | `Study.jsx`, `MiniTimerWidget.jsx`, `CircularTimer.jsx`, `App.jsx`, `Statistics.jsx`, teste `miniTimer.test.jsx`, `behavioralScreen.test.jsx`. |
| **`useUIStore.jsx`** *(Abas, Ações Pendentes, Categorias, Nome)* | `App.jsx`, `Sidebar.jsx`, `Header.jsx`, `Dashboard.jsx`, `Notas.jsx`, `Graph.jsx`, `Statistics.jsx`, `Settings.jsx`, `AIChat.jsx`, `Onboarding.jsx`, teste `useUIStore.test.js`. |
| **`useNotes.js`** *(CRUD de Notas e Tags)* | `Notas.jsx`, `NotaLista.jsx`, `BibliotecaPanel.jsx`, `useNotaEditor.js`, `Graph.jsx`, `Statistics.jsx`, `Dashboard.jsx`, `Header.jsx`, teste `useNotes.test.js`, `smoke.test.jsx`. |
| **`useFlashcards.js`** / **`sm2.js`** *(Algoritmo SM-2)* | `Flashcards.jsx`, `FlashcardViewer.jsx`, `useGerador.js`, `Statistics.jsx`, `Header.jsx`, teste `sm2.test.js`. |
| **`electron/preload.js`** / **Handlers IPC** | `electron/main.js`, `electron/ipc/dbHandlers.js`, `electron/ipc/aiHandlers.js`, `electron/ipc/windowHandlers.js`, `Header.jsx`, `embeddedService.js`, `geminiService.js`. |

---

## 5. PONTOS ÓRFÃOS & CÓDIGO SEM CONEXÃO

1. **`app/src/lib/db.js` (Módulo Legado Órfão)**:
   - **Diagnóstico**: Arquivo que tenta utilizar chamadas síncronas `ipcRenderer.sendSync('db-notas-getAll')` e script CDN obsoleto de `sql.js`.
   - **Status**: Nenhum arquivo da aplicação importa `app/src/lib/db.js` (toda a persistência utiliza `app/src/store/useDBStore.js` e `app/src/lib/db/wasmEngine.js`).
   - **Recomendação**: Mantido apenas como referência histórica; não é carregado pelo bundle.

2. **Scripts de Correção de Grafo Legados (`scripts/*.py`)**:
   - **Diagnóstico**: Os scripts `fix-graph.py`, `inspect-graph.py`, `nextfix.py` e `remove-bad-edges.py` faziam referência à pasta `graphify-out/` que já foi descontinuada e migrada para `.codegraph/`.
   - **Status**: Scripts arquivados da migração anterior.
