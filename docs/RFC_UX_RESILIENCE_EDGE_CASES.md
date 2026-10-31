# RFC: Auditoria Profunda, Resiliência a Falhas Impensáveis e Otimização Sistêmica de UX no NexoMente

**Status:** Aprovado para Implementação  
**Autores:** Orquestrador NexoMente, Explorer 1 (Edge Cases), Explorer 2 (UX Heuristics), Explorer 3 (MAPA & Infra)  
**Data:** 30 de Outubro de 2026  
**Versão:** 1.0.0  

---

## 1. Contexto e Motivação

O NexoMente é uma estação de estudos cognitivos de alta imersão, integrando Markdown, repetição espaçada FSRS/SM-2, Inteligência Artificial local privativa (Gemma 4 / `node-llama-cpp`) e gamificação tamagotchi (Kora). A estética recente *"Vanilla Reader"* ("Papel & Café") estabeleceu um padrão visual calmo e agradável.

Contudo, a auditoria profunda dos fluxos do usuário e da infraestrutura revelou duas categorias de riscos críticos:
1. **Falhas Silenciosas e Casos Extremos Arquiteturais (R1)**: Riscos de corrupção e perda permanente de dados decorrentes da cota de 5MB do `localStorage`, ressurgimento de bancos obsoletos, contenção de concorrência que derruba o processo Electron via SIGSEGV em inferência de IA, travamento perpétuo de socket em streaming TTS, perda de progresso de gamificação (streak reset) e exploits de manipulação de relógio do sistema operacional.
2. **Atritos Ocultos de Usabilidade e Quebra de Heurísticas (R2)**: Elos rompidos entre o Editor de Notas e a Forja de Cards (redirecionamento errado para chat genérico), becos sem saída na Forja de Questões (`setAba('banco')`), classificação prematura no FSRS sem visualização de resposta, saltos visuais contínuos (CLS) provocados pelo banner de Undo, telas vazias mortas ("0 de 0") e violações das 5 Diretrizes Permanentes de Arquitetura UI/UX do NexoMente (duplicação de XP e divergência de streak).

Este documento formula o diagnóstico, a matriz de priorização (Severidade x Esforço) e as especificações técnicas das correções implementadas no repositório.

---

## 2. Matriz de Priorização (Severidade x Esforço: P0 a P3)

```
        ▲ ALTO
        │
        │   [P0] E1: Cota de 5MB LocalStorage & Ressurreição de Banco Stale
        │   [P0] E4: Crash SIGSEGV por Concorrência no node-llama-cpp
        │   [P0] MF-01: Elo Rompido Nota -> Forja IA (useNotaEditor.js)
S       │   [P0] MF-02: Beco Sem Saída setAba('banco') na Forja de Questões
E       │
V       │   [P1] E2: Split-Brain Electron IPC vs Renderer WASM
E       │   [P1] E3: Buraco Negro de Escrita no Boot do Repositório
R       │   [P1] E6: Desperdício de Streak Freeze e Reset Injusto
I       │   [P1] E8: Ressurreição de Dados no Reset de Fábrica
D       │   [P1] MF-03/04: Prevenção de Erros & Intervalos FSRS Preditivos
A       │   [P1] MF-05: Eliminação de Layout Shift (CLS) no Undo
D       │   [P1] MF-06: Empty States Acolhedores (Baralho em Dia)
E       │   [P1] MF-08/09: Fonte Única de Verdade (Streak e XP)
        │   [P1] MF-12: Acessibilidade Teclado & Focus Rings (WCAG 2.4.7)
        │
        │   [P2] E5: Timeout e Fallback Gracioso no Streaming TTS
        │   [P2] E7: Proteção contra Avanço de Relógio / Suspensão de SO
        │   [P2] MF-07: Fusão das Abas 'Todos' e 'Editar' em Flashcards
        │   [P2] MF-10: Substituição de window.confirm por ConfirmDialog
        │   [P2] MF-11: Limpeza de Estilos Escuros Hardcoded em Forja/Settings
        │
        │   [P3] MF-Autofocus Omnibar e Wikilink Autocomplete
        └────────────────────────────────────────────────────────►
                              ESFORÇO DE IMPLEMENTAÇÃO
```

---

## 3. Especificação Detalhada das Mitigações (R1)

### 3.1. [P0] E1: Inversão de Precedência e Resiliência na Cota de 5MB
- **Arquivos:** `app/src/lib/db/wasmEngine.js`, `app/src/infra/db/DatabaseAdapter.js`.
- **Diagnóstico:** Ao atingir 3.8MB, a Base64 do banco excede a cota de 5MB do `localStorage`. O snapshot cai no IndexedDB, mas a chave antiga no `localStorage` impede a carga do IndexedDB no próximo boot, descartando silenciosamente todas as novas notas e revisões.
- **Solução Arquitetural:**
  1. No `initDB()`, verificar primeiro a presença e a estampa de tempo do snapshot no IndexedDB (`loadSnapshotFromIndexedDB()`).
  2. Se o IndexedDB contiver um snapshot mais recente que o `localStorage`, inicializar a partir do IndexedDB.
  3. No `saveDB()`, em caso de `QuotaExceededError`, remover a chave `nexomente_db` corrompida/incompleta do `localStorage` e sinalizar ao `DatabaseAdapter` que o IndexedDB é o meio de persistência ativo.
  4. Em caso de falha de decodificação no `initDB()`, consultar o IndexedDB antes de instanciar um banco vazio (`new SQL.Database()`).

### 3.2. [P0] E4: Mutex de Concorrência na Sequência do `node-llama-cpp`
- **Arquivo:** `electron/ipc/aiHandlers.js`.
- **Diagnóstico:** Requisições simultâneas (ex: Copiloto + Forja) invocam `persistentSequence.eraseContextTokenRanges()` enquanto o binding C++ itera sobre a mesma memória, gerando SIGSEGV e queda imediata do Electron.
- **Solução Arquitetural:**
  1. Implementar uma classe `AsyncMutex` para serializar o acesso à `persistentSequence`.
  2. Envolver `session.promptWithMeta` e manipulação de tokens no lock do mutex, garantindo que a requisição B aguarde a conclusão da geração da requisição A sem colisão de memória.

### 3.3. [P1] E3: Fila de Reconciliação no Boot Assíncrono do Banco
- **Arquivos:** `app/src/hooks/useNotes.js`, `app/src/store/useDBStore.js`.
- **Diagnóstico:** Notas criadas nos milissegundos anteriores ao término de `initDB()` caem no `LocalStorageAdapter` e nunca são migradas para a tabela SQLite `notas`.
- **Solução Arquitetural:**
  1. Ao concluir o `initDB()`, verificar se existem itens gravados em `localStorage('nexomente_notas')`.
  2. Migrar atomicamente os registros pendentes para a tabela SQL via `Notas.create()` e limpar o repositório temporário.

### 3.4. [P1] E6: Harmonização de Streak Freeze com a Sessão de Estudo
- **Arquivo:** `app/src/store/useTamagotchiStore.js`.
- **Diagnóstico:** `checkDailyStatus` consome o `streak_freeze` para cobrir 1 dia de ausência, mas não atualiza `last_study_date`. Quando o usuário estuda no mesmo dia, `registerStudySession` calcula `diff === 2` e zera o streak para 1.
- **Solução Arquitetural:**
  1. Ao abater um `streak_freeze` em `checkDailyStatus`, registrar `state.streak_freeze_used_today = true` ou avançar virtualmente a referência de data para o dia protegido.
  2. Na linha 191 de `useTamagotchiStore.js`, respeitar o escudo consumido e incrementar a ofensiva normalmente (`newStreak += 1`).

### 3.5. [P1] E8: Purga Completa no Reset de Fábrica
- **Arquivos:** `app/src/pages/Settings.jsx`, `app/src/infra/db/DatabaseAdapter.js`.
- **Diagnóstico:** "Apagar Tudo" limpa `localStorage` mas preserva o IndexedDB `nexomente_idb`, fazendo o banco de dados anterior ressurgir integralmente no recarregamento.
- **Solução Arquitetural:**
  1. Adicionar função `purgeAllStorage()` que executa `indexedDB.deleteDatabase('nexomente_idb')`, remove todas as chaves do `localStorage` e limpa caches antes de `window.location.reload()`.

### 3.6. [P2] E5: Timeout com AbortSignal no Streaming TTS
- **Arquivos:** `electron/ipc/audioHandlers.js`, `app/src/lib/audio/neuralTTS.js`.
- **Diagnóstico:** Queda abrupta de Wi-Fi deixa o socket WSS do `msedge-tts` em half-open perpétuo; a Promise nunca resolve nem rejeita e o fallback Web Speech nunca dispara.
- **Solução Arquitetural:**
  1. Adicionar timeout de 6.000ms na coleta do stream no backend.
  2. No frontend (`neuralTTS.js`), aplicar `Promise.race` com rejeição após 5.000ms acionando automaticamente `playWebSpeechFallback()`.

### 3.7. [P2] E7: Verificação de Monotonicidade no Timer de Estudo
- **Arquivo:** `app/src/store/useStudyTimerStore.js`.
- **Diagnóstico:** Suspensão do laptop ou avanço do relógio do SO zera o timer de 50 minutos em 1 segundo e credita XP máximo fraudulento.
- **Solução Arquitetural:**
  1. Comparar o tempo real transcorrido com `performance.now()` ou limitar o avanço por tick a no máximo o intervalo real do cronômetro.
  2. Ao detectar suspensão prolongada via `document.visibilitychange`, pausar o cronômetro para requerer validação do usuário.

---

## 4. Especificação Detalhada das Melhorias de UX (R2)

### 4.1. [P0] MF-01: Restauração do Elo Nota → Forja IA
- **Arquivos:** `app/src/hooks/useNotaEditor.js`, `app/src/pages/Notas.jsx`, `app/src/pages/Flashcards.jsx`.
- **Ação:**
  - Em `useNotaEditor.js:227`, ao acionar "Forjar Cards", salvar a nota atual e redirecionar para a aba da Forja de Flashcards pré-carregando o texto da nota via `sessionStorage('nexomente_forja_texto', conteudo)`.
  - Em `GeradorForjaTab.jsx`, consumir o texto pré-carregado no textarea automaticamente.

### 4.2. [P0] MF-02: Eliminação do Beco sem Saída na Forja
- **Arquivos:** `app/src/components/gerador/GeradorForjaTab.jsx`, `app/src/pages/Flashcards.jsx`.
- **Ação:**
  - Substituir a chamada inválida `setAba('banco')` por `setAba('revisar')`.
  - Disparar toast informativo: *"X flashcards forjados e prontos para revisão!"*.

### 4.3. [P1] MF-03 & MF-04: FSRS com Prevenção de Erros e Intervalos Preditivos
- **Arquivo:** `app/src/components/flashcards/FlashcardViewer.jsx`.
- **Ação:**
  - Desabilitar ou ocultar os botões de rating 1 a 4 enquanto o cartão estiver na face frontal (`mostrandoFrente === true`). Exibir a legenda *"Pressione Espaço para virar o cartão"*.
  - Calcular e exibir os intervalos resultantes em cada botão: `1. Errei (<10m)`, `2. Difícil (1d)`, `3. Bom (4d)`, `4. Fácil (9d)`.

### 4.4. [P1] MF-05: Fixação da Barra de Desfazer (Eliminação de CLS)
- **Arquivo:** `app/src/pages/Flashcards.jsx`.
- **Ação:**
  - Reposicionar o banner de Undo para uma barra flutuante inferior fixa (`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 shadow-xl`), eliminando a variação de 48px na altura do cartão.

### 4.5. [P1] MF-06: Empty State Acolhedor no Fim da Fila de Flashcards
- **Arquivos:** `app/src/pages/Flashcards.jsx`, `app/src/components/flashcards/FlashcardViewer.jsx`.
- **Ação:**
  - Quando `paraRevisao.length === 0`, renderizar o componente `EmptyState.jsx` com ícone de celebração, mensagem *"Baralho em dia! 🎉"* e botões para Forjar Novos Cards ou ir para a Dashboard.

### 4.6. [P1] MF-08 & MF-09: Unificação de Fonte da Verdade (Diretriz 1)
- **Arquivos:** `app/src/components/layout/Header.jsx`, `app/src/pages/Dashboard.jsx`.
- **Ação:**
  - Remover indicadores de XP e nível do Popover de Perfil do Header (preservando o Pet e XP exclusivamente no card da Sidebar).
  - Unificar o valor de ofensiva (Streak) exibido na Topbar e no Dashboard.

### 4.7. [P1] MF-12: Anéis de Foco Acessíveis por Teclado (WCAG 2.4.7)
- **Arquivo:** `app/src/index.css`.
- **Ação:**
  - Definir `:focus-visible` globalmente com anel de 2px na cor terracota (`var(--nx-primary)`), garantindo que a navegação por Tab seja visualmente clara em todos os botões e inputs.

---

## 5. Plano de Validação e Testes Automatizados (R3)

1. **MAPA de Conexões:** Validação obrigatória de que `node scripts/verificar-mapa.js` termina com exit code 0 e paridade completa de arquivos e canais IPC.
2. **Suíte Vitest Dedicada:** Criação do arquivo de teste `app/src/test/resilienceEdgeCases.test.js` cobrindo:
   - Limite de cota e fallback no IndexedDB.
   - Preservação de streak freeze em faltas de 1 dia.
   - Proteção de monotonicidade no timer de estudo.
   - Prevenção de cliques prematuros no FSRS e cálculo de intervalos.
   - Resolução das 4 falhas de teste baseline existentes.
