# MAPA DE CONEXÕES DO NEXOMENTE

> **Visão Geral**  
> O NexoMente é uma aplicação híbrida (Web SPA + Desktop Electron) voltada para estudos, gestão de conhecimento e raciocínio com IA.  
> O núcleo de persistência opera via SQLite compilado em WebAssembly (`SQL.js`) no navegador e `better-sqlite3` no processo principal do Electron, exposto por barramento IPC.  
> O estado de interface e os subsistemas de gamificação (Tamagotchi de 30 níveis) e timer de estudos são orquestrados por stores reativas Zustand.  
> As inteligências artificiais operam sob uma camada de abstração com suporte a LM Studio, Google Gemini e LLM embutida nativa (`node-llama-cpp`).  
> O mapa a seguir cataloga todos os hubs centrais, nós funcionais, canais IPC e matrizes de impacto validados estritamente no código-fonte.

---

## 1. HUBS (Recursos Compartilhados)

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

### HUB: ai-provider (Abstração Multiprovedor de IA)
- **Arquivo**: `app/src/lib/ai/aiProvider.js:38`
- **Implementação**: `app/src/lib/ai/lmStudioService.js`, `app/src/lib/ai/geminiService.js`, `app/src/lib/ai/embeddedService.js`
- **Descrição**: Roteador agnóstico de requisições de inteligência artificial. Encaminha chats e gerações para Cloud (Gemini), Local (LM Studio na porta 1234) ou Embutido (via IPC `ai:embeddedChat`).
- **Usado por**:
  - `store: useAIStore` (`app/src/store/useAIStore.js`)
  - `hook: useAIModel` (`app/src/hooks/useAIModel.js`)
  - `parser: gerarQuestoesComIA` (`app/src/lib/parser.js`)
  - `página: AIChat` (`app/src/pages/AIChat.jsx`)
  - `página: Settings` (`app/src/pages/Settings.jsx`)
- **Se quebrar**: Chat neural, geração automática de questões da forja, resumos e sugestão de tags falham ou caem para mensagem de erro de provedor.

### HUB: tamagotchi-engine (Gamificação, Níveis e HP)
- **Arquivo**: `app/src/store/useTamagotchiStore.js:84`
- **Implementação**: Estado Zustand persistido em `localStorage` (`tamagotchi_storage`).
- **Descrição**: Controla ciclo de vida do pet virtual (30 níveis, estágios de evolução, HP de 0 a 150, penalidade por dias ausentes, escudos de gelo `streak_freezes`, multiplicadores de XP e recompensas).
- **Usado por**:
  - `componente: TamagotchiWidget` (`app/src/components/gamification/TamagotchiWidget.jsx`)
  - `componente: Header` (`app/src/components/layout/Header.jsx`)
  - `store: useStudyTimerStore` (`app/src/store/useStudyTimerStore.js`)
  - `página: Dashboard` (`app/src/pages/Dashboard.jsx`)
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
- **Descrição**: Camada de integração nativa do Electron protegida por `contextIsolation: true`. Disponibiliza controles de janela sem borda, acesso direto a banco local `better-sqlite3`, proxy HTTP para Gemini e runtime nativo de inferência local `node-llama-cpp`.
- **Usado por**:
  - `componente: Header` (minimizar, maximizar, fechar)
  - `serviço: embeddedService` (inferência GGUF local)
  - `serviço: geminiService` (proxy de bypass de CORS no desktop)
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
- **Fluxo**: Clique em "NOTA" → `setPendingNoteAction({ action: 'create' })` → `setActiveTab('notes')` → `Notas.jsx:125` captura ação pendente → dispara `criarNota('nota')` → foca novo documento.
- **Usa**: `ui-store`, `db-store` (repositório `Notas`)
- **Afeta**: Navega para o Editor de Notas e cria novo registro instantaneamente.

### NÓ: Dashboard - Deep Link de Notas Recentes
- **Arquivo**: `app/src/pages/Dashboard.jsx:217`
- **Fluxo**: Clique no card da nota recente → `setPendingNoteAction({ noteId })` → `setActiveTab('notes')` → `Notas.jsx:116` busca nota por ID no `useNotes` → define `notaSelecionada` → exibe no TipTap.
- **Usa**: `ui-store`, `hook: useNotes`
- **Afeta**: Transição de tela e seleção determinística no editor.

### NÓ: Dashboard - Curadoria Poética & Modal Dojo
- **Arquivo**: `app/src/pages/Dashboard.jsx:282`
- **Fluxo**: Clique em "Recitar no Dojo" → `setModalDojoAberto(true)` → renderiza overlay modal de `PoemaRecitacao.jsx` → inicializa reconhecimento de voz Vosk (`useVosk`).
- **Usa**: `db-store` (repositório `Poemas`), Vosk Browser
- **Afeta**: Executa sessão de oratória poética diretamente da home.

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
- **Arquivo**: `app/src/hooks/useNotaEditor.js:85`
- **Fluxo**: Digitação no TipTap → evento `onUpdate` aciona `setSaveStatus('saving')` → temporizador de debounce de 1000ms aguarda pausa do usuário → `NotasRepo.update(id, { conteudo, titulo })` grava no SQLite WASM → `setSaveStatus('saved')` → atualização refletida no grafo e na busca.
- **Usa**: `db-store` (repositório `Notas`)
- **Afeta**: Persistência do conteúdo das notas, contagem de caracteres e palavras no rodapé.

### NÓ: Editor de Notas - Botão AI Tag#
- **Arquivo**: `app/src/components/editor/AIBar.jsx:15`
- **Fluxo**: Clique em `Tag#` → `useNotaEditor.handleTagsOpen()` → `lmStudioService.suggestTags(nota)` → extração de palavras-chave com IA → abertura do modal `TagPickerModal` → confirmação adiciona tags via `useNotes.addTag()`.
- **Usa**: `ai-provider`, `hook: useNotes`, `db-store`
- **Afeta**: Metadados da nota, arestas semânticas no Grafo (`Graph.jsx`) e filtros por tags.

### NÓ: Editor de Notas - Botão AI Resumir
- **Arquivo**: `app/src/components/editor/AIBar.jsx:25`
- **Fluxo**: Clique em `Resumir` → `useNotaEditor.handleResumoOpen()` → `lmStudioService.summarizeContent(conteudo)` → prompt com resumo gerado → confirmação insere bloco `<blockquote class="ai-resumo">` no topo do editor TipTap e salva imediatamente.
- **Usa**: `ai-provider`, TipTap Editor, `db-store`
- **Afeta**: Corpo HTML da nota e resumo executivo do documento.

### NÓ: Editor de Notas - Botão AI Cards
- **Arquivo**: `app/src/components/editor/AIBar.jsx:35`
- **Fluxo**: Clique em `Cards` → `useNotaEditor.handleCardsOpen()` → `lmStudioService.generateFlashcards(nota)` → IA gera array de pares pergunta/resposta → abertura de `FlashcardApproveModal` → confirmação grava flashcards vinculados à nota via `useFlashcards.create()`.
- **Usa**: `ai-provider`, `hook: useFlashcards`, `db-store`
- **Afeta**: Tabela de flashcards (`flashcards`), deck de revisão SM-2 e estatísticas.

### NÓ: Central de Flashcards - Avaliação SM-2 & Atalhos
- **Arquivo**: `app/src/components/flashcards/FlashcardViewer.jsx:131`
- **Fluxo**: Usuário clica no card ou pressiona `Space`/`Enter` → `setMostrandoFrente(!mostrandoFrente)` (animação Flip 3D) → usuário clica no botão de qualidade ou pressiona tecla `1`, `2`, `3` ou `4` → `revisar(card.id, qualidade)` → cálculo SuperMemo-2 em `sm2.js` → atualização de `intervalo`, `ease_factor` e `next_review` no SQLite → avanço para o próximo card da fila.
- **Usa**: `hook: useFlashcards`, `db-store` (repositório `Flashcards`), `sm2.js`
- **Afeta**: Próxima data de revisão do card, taxa de retenção em `Statistics.jsx`.

### NÓ: Central de Flashcards - Desfazer Imediato (Undo)
- **Arquivo**: `app/src/pages/Flashcards.jsx:47`
- **Fluxo**: Avaliação recente aciona contagem regressiva de 5 segundos de undo → clique em "Desfazer" ou tecla `Z` dispara `handleUndo()` → recriação do card e rollback do status no banco.
- **Usa**: `hook: useFlashcards`, `db-store`
- **Afeta**: Previne classificações incorretas acidentais pelo teclado.

### NÓ: Biblioteca Poética - Favoritar Poema
- **Arquivo**: `app/src/components/poemas/PoemasListaTab.jsx:119`
- **Fluxo**: Clique no ícone de estrela de um poema → alternância do ID no array de favoritos salvo em `localStorage('nexomente_poemas_favs')` → atualização reativa do filtro de favoritos no acervo.
- **Usa**: Armazenamento local, acervo de poemas
- **Afeta**: Listagem filtrada de poemas na aba de leitura e no gerenciador.

### NÓ: Biblioteca Poética - Dojo de Recitação com IA de Voz
- **Arquivo**: `app/src/components/poemas/PoemaRecitacao.jsx:87`
- **Fluxo**: Clique em "Iniciar Recitação" → `useVosk.startListening()` carrega modelo WASM offline do Vosk → microfone transcreve fala em tempo real → algoritmo compara texto falado com a estrofe original → cálculo de acurácia percentual → término concede XP gamificado ao jogador.
- **Usa**: Vosk Browser (modelo de fala local), `tamagotchi-engine`, `db-store`
- **Afeta**: Streak de declamação do poema (`streak_recitacao`), ganho de XP e evolução do pet.

### NÓ: Forja de Questões - Geração de Simulado por IA
- **Arquivo**: `app/src/components/gerador/GeradorForjaTab.jsx:106`
- **Fluxo**: Seleção de disciplina, banca e quantidade → clique em "Forjar Questões" → `useGerador.gerarComIA(config)` → envio do prompt para `aiProvider` → parser JSON extrai alternativas, enunciado e gabarito comentado → inclusão das questões no banco de simulados.
- **Usa**: `ai-provider`, `hook: useGerador`, `services/exportService`
- **Afeta**: Banco de questões ativas, geração de simulados e conversão para flashcards.

### NÓ: Chat Neural - Envio de Mensagem com Streaming/Resolução
- **Arquivo**: `app/src/pages/AIChat.jsx:95`
- **Fluxo**: Digitação no campo de prompt → clique em "Enviar" ou `Enter` → mensagem adicionada à conversa via `useAIChat` → histórico enviado para `aiProvider.chat()` (redirecionado conforme provedor ativo) → resposta formatada com suporte a blocos de código com botão de cópia isolado.
- **Usa**: `ai-provider`, `hook: useAIModel`, `hook: useNotes`
- **Afeta**: Histórico da sessão de chat neural e consumo de tokens.

### NÓ: Grafo de Conhecimento - Câmera Cytoscape & Deep Link
- **Arquivo**: `app/src/pages/Graph.jsx:195`
- **Fluxo**: Grafo constrói nós a partir de notas e arestas a partir de `[[wikilinks]]` e tags em comum → clique em um nó seleciona a nota → clique em "Abrir no Editor" dispara `setPendingNoteAction({ noteId })` e `setActiveTab('notes')` → redireciona diretamente para a edição da nota.
- **Usa**: Cytoscape.js, `hook: useNotes`, `ui-store`
- **Afeta**: Navegação relacional entre notas interligadas.

### NÓ: Métricas - Navegação por Categoria de Foco
- **Arquivo**: `app/src/pages/Statistics.jsx:218`
- **Fluxo**: Exibição da distribuição de notas por tipo (*Ideias, Projetos, Livros, etc.*) → clique na barra de categoria dispara `setActiveTab('notes')` → editor de notas abre filtrado.
- **Usa**: `ui-store`, `hook: useNotes`
- **Afeta**: Atalho contextual de produtividade das estatísticas para as notas.

### NÓ: Configurações - Testar Chave API do Gemini
- **Arquivo**: `app/src/pages/Settings.jsx:43`
- **Fluxo**: Entrada da chave no input com toggle de visibilidade de senha → clique em "Testar Conexão" → chamada assíncrona para `geminiService.checkStatus()` → badge de feedback verde/vermelho com mensagem detalhada de status.
- **Usa**: `serviço: geminiService`, `ai-provider`
- **Afeta**: Validação de credencial antes do uso nas ferramentas de IA.

### NÓ: Configurações - Reset de Fábrica com Confirmação Dupla
- **Arquivo**: `app/src/pages/Settings.jsx:110`
- **Fluxo**: Clique em "Apagar Tudo" → modal de perigo exige digitar a palavra exata `"CONFIRMAR"` → botão de exclusão é liberado → limpeza de `localStorage('nexomente_db')`, reinicialização das tabelas SQLite WASM e recarga de página.
- **Usa**: `db-store`, `window.location.reload`
- **Afeta**: Purga total de dados de notas, matérias, sessões e flashcards.

---

## 3. TABELA DE CANAIS IPC (Main ↔ Renderer)

| Canal IPC | Quem Chama (Renderer) | Quem Trata (Electron Main) | Retorno / Tipo |
|---|---|---|---|
| `ai:geminiChat` | `geminiService.js:46` | `electron/ipc/aiHandlers.js:21` | `{ ok: boolean, status: number, data: object }` |
| `ai:embeddedChat` | `embeddedService.js:28` | `electron/ipc/aiHandlers.js:36` | `{ success: boolean, response: string, tokens: number }` |
| `ai:getHardwareInfo` | `electron/preload.js:63` *(Interface declarada)* | `electron/ipc/aiHandlers.js:155` | `{ cpu: string, ram: number, gpu: string, vram: number }` |
| `ai:getContextStats` | `electron/preload.js:64` *(Interface declarada)* | `electron/ipc/aiHandlers.js:164` | `{ activeTokens: number, maxTokens: number }` |
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
| `window:minimize` | `Header.jsx:199` | `electron/ipc/windowHandlers.js:7` | `void` (janela minimizada) |
| `window:maximize` | `Header.jsx:200` | `electron/ipc/windowHandlers.js:11` | `void` (toggle maximizado) |
| `window:close` | `Header.jsx:201` | `electron/ipc/windowHandlers.js:20` | `void` (janela fechada) |
| `window:isMaximized` | `electron/preload.js:8` *(Interface nativa)* | `electron/ipc/windowHandlers.js:24` | `boolean` |
| `config:get` | `electron/preload.js:11` *(Interface nativa)* | `electron/ipc/windowHandlers.js:29` | `any` (dado gravado em `config.json`) |
| `config:set` | `electron/preload.js:12` *(Interface nativa)* | `electron/ipc/windowHandlers.js:42` | `boolean` |
| `dialog:selectFolder`| `electron/preload.js:15` *(Interface nativa)* | `electron/ipc/windowHandlers.js:59` | `string \| null` (caminho da pasta selecionada) |
| `db:getPath` | `electron/preload.js:69` *(Interface nativa)* | `electron/ipc/windowHandlers.js:69` | `string` (caminho para `nexomente.db`) |
| `app:getPath` | `electron/preload.js:58` *(Interface nativa)* | `electron/ipc/windowHandlers.js:73` | `string` (caminho especial do SO) |

---

## 4. TABELA DE IMPACTO ("Se eu mudar X, verificar Y, Z")

| Se alterar... | Componentes e Arquivos Afetados que Devem Ser Verificados |
|---|---|
| **`wasmEngine.js`** *(Schema SQLite / `saveDB`)* | `useDBStore.js`, todos os 7 repositórios em `app/src/lib/db/repositories/`, `useNotes.js`, `useFlashcards.js`, `useMaterias.js`, testes `useDBStore.test.js`, `integration.test.js`, `smoke.test.jsx`. |
| **`aiProvider.js`** *(Contratos `chat` e `generate`)* | `useAIStore.js`, `useAIModel.js`, `lmStudioService.js`, `geminiService.js`, `embeddedService.js`, `AIChat.jsx`, `parser.js`, `useGerador.js`, `AIBar.jsx`, teste `aiService.test.js`. |
| **`useTamagotchiStore.js`** *(Níveis, XP, HP e Passivas)* | `TamagotchiWidget.jsx`, `LevelCard.jsx`, `Header.jsx`, `Dashboard.jsx`, `Statistics.jsx`, `useStudyTimerStore.js`. |
| **`useStudyTimerStore.js`** *(Timer, Estados de Estudo e Sessões)* | `Study.jsx`, `MiniTimerWidget.jsx`, `CircularTimer.jsx`, `App.jsx`, `Statistics.jsx`, teste `miniTimer.test.jsx`, `behavioralScreen.test.jsx`. |
| **`useUIStore.jsx`** *(Abas, Ações Pendentes, Nome)* | `App.jsx`, `Sidebar.jsx`, `Header.jsx`, `Dashboard.jsx`, `Notas.jsx`, `Graph.jsx`, `Statistics.jsx`, `Settings.jsx`, teste `useUIStore.test.js`. |
| **`useNotes.js`** *(CRUD de Notas e Tags)* | `Notas.jsx`, `NotaLista.jsx`, `useNotaEditor.js`, `Graph.jsx`, `Statistics.jsx`, `Dashboard.jsx`, teste `useNotes.test.js`, `smoke.test.jsx`. |
| **`useFlashcards.js`** / **`sm2.js`** *(Algoritmo SM-2)* | `Flashcards.jsx`, `FlashcardViewer.jsx`, `useGerador.js`, `Statistics.jsx`, teste `sm2.test.js`. |
| **`electron/preload.js`** / **Handlers IPC** | `electron/main.js`, `electron/ipc/dbHandlers.js`, `electron/ipc/aiHandlers.js`, `electron/ipc/windowHandlers.js`, `Header.jsx`, `embeddedService.js`, `geminiService.js`. |

---

## 5. PONTOS ÓRFÃOS & CÓDIGO SEM CONEXÃO

1. **`app/src/lib/db.js` (Módulo Legado Órfão)**:
   - **Diagnóstico**: Arquivo que tenta utilizar chamadas síncronas `ipcRenderer.sendSync('db-notas-getAll')` e script CDN obsoleto de `sql.js`.
   - **Status**: Nenhum arquivo da aplicação importa `app/src/lib/db.js` (toda a persistência utiliza `app/src/store/useDBStore.js` e `app/src/lib/db/wasmEngine.js`).
   - **Recomendação**: Manter documentado como obsoleto ou remover em refatoração de limpeza.

2. **Botão de Notificações no Cabeçalho (`Header.jsx:102`)**:
   - **Diagnóstico**: O botão com o ícone `Bell` e badge pontilhado de notificação não possui listener `onClick` atribuído.
   - **Status**: Elemento puramente visual no momento.

3. **Input de Busca no Cabeçalho (`Header.jsx:79`)**:
   - **Diagnóstico**: O campo de busca rápida (`Ctrl+K`) possui estilos e foco, porém não despacha filtro para a lista de notas nem possui modal de busca global (Omnibar) conectado.
   - **Status**: Visual / Não operacional.

4. **Scripts de Correção de Grafo Legados (`scripts/*.py`)**:
   - **Diagnóstico**: Os scripts `fix-graph.py`, `inspect-graph.py`, `nextfix.py` e `remove-bad-edges.py` faziam referência à pasta `graphify-out/` que já foi descontinuada e migrada para `.codegraph/`.
   - **Status**: Scripts arquivados da migração anterior.
