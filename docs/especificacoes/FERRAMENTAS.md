# Ferramentas e Infraestrutura

## Electron (Desktop Runtime)

Utilizado para construir o aplicativo desktop NexoMente.

- **Arquivos principais:**
  - `electron/main.js` - Processo principal, janela, IPC handlers
  - `electron/preload.js` - Bridge segura entre renderer e Node.js

- **Stack Electron:**
  - Electron v28+ (configurado no package.json)
  - Context isolation habilitada
  - Preload script para API segura

---

## Tailwind CSS (Estilização)

Framework CSS utilitário utilizado em todo o frontend.

- **Arquivos:**
  - `tailwind.config.js` - Configuração do tema customizado
  - `postcss.config.js` - Configuração PostCSS
  - `app/src/index.css` - Estilos globais + CSS variables

- **Tema Dark Academic Digital:**
  - Cores definidas via CSS custom properties
  - Integração com Framer Motion para animações

---

## graphify (Knowledge Graph)

Ferramenta de análise estática que gera o grafo de conhecimento do projeto.

- **Entrada:** Todos os arquivos do projeto (code, docs, config)
- **Saída:** 
  - `graphify-out/graph.html` - Visualização interativa
  - `graphify-out/GRAPH_REPORT.md` - Relatório de comunidades e nós

- **Comandos:**
  ```bash
  py -m graphify query "pergunta"  # Explorar relações
  py -m graphify path "A" "B"      # Caminho entre conceitos
  py -m graphify explain "X"       # Explicar nó e conexões
  ```

---

## gstack (AI Builder Framework)

Framework de skills para fluxos de trabalho estruturados.

- **Skills disponíveis:**
  - `/office-hours` - Interrogatório de produto
  - `/plan-ceo-review` - Revisão estratégica
  - `/plan-eng-review` - Revisão de arquitetura
  - `/qa` - Teste e QA
  - `/ship` - Release e deploy
  - `/investigate` - Debugging

- **Localização:** `C:\Users\bruno\.config\opencode\skills\gstack\`

---

## Relações

| Ferramenta | Conexão |
|------------|---------|
| Electron | main.js → React (App.jsx), SQLite (useDBStore) |
| Tailwind CSS | tailwind.config.js → todos os componentes React |
| graphify | Analisa todos os arquivos .js/.jsx do projeto |
| gstack | Utiliza AGENTS.md para routing de skills |

---

## Sistema de Exportação (exportService.js)

Arquivo: `app/src/services/exportService.js`

### Funções disponíveis:
- `exportarParaTexto(questoes, opcoes)` - Exporta questões em formato TXT
- `exportarParaHTML(questoes, opcoes)` - Exporta em HTML formatado (estilo prova)
- `exportarDOC(questoes, opcoes)` - Exporta para arquivo .DOC
- `exportarParaJSON(questoes, opcoes)` - Exporta JSON
- `copiarGabarito(questoes)` - Copia gabarito para clipboard
- `baixarArquivo(blob, nome)` - Download genérico de arquivo

### Integrações:
- `Gerador.jsx` - Página que usa exportService
- `useGerador.js` - Hook que chama funções de exportação
- `lib/iaPrompts.js` - Template de formatação buildOutput()

---

## Serviços de IA

### Ollama (ollamaService.js)

Arquivo: `app/src/lib/ai/ollamaService.js`

- **Endpoint:** `http://localhost:11434`
- **Modelo padrão:** `llama3.2:3b`

#### Funções:
- `checkOllamaStatus()` - Verifica se Ollama está online
- `generate(prompt, options)` - Gera texto
- `generateFlashcards(conteudo, quantidade)` - Gera flashcards
- `summarizeContent(conteudo)` - Resume conteúdo
- `suggestTags(conteudo)` - Sugere tags
- `suggestLinks(notaId)` - Sugere conexões entre notas
- `chat(messages)` - Chat conversacional

---

### LM Studio (lmStudioService.js)

Arquivo: `app/src/lib/ai/lmStudioService.js`

- **Endpoint:** `http://localhost:1234/v1`
- **Modelo padrão:** configurável

#### Funções:
- `setModel(nome)` - Define modelo ativo
- `getModel()` - Retorna modelo atual
- `setTemperature(valor)` - Ajusta temperatura
- `getTemperature()` - Retorna temperatura
- `listModels()` - Lista modelos disponíveis
- `generate(prompt, options)` - Gera texto
- `chat(messages)` - Chat com API OpenAI-compatível
- `generateFlashcards(conteudo, quantidade)` - Gera flashcards
- `generateWithTemplate(prompt, template)` - Gera com template

---

### useAIModel Hook

Arquivo: `app/src/hooks/useAIModel.js`

Hook unificado que abstrai Ollama e LM Studio:

- `status` - Estado da conexão ('loading', 'online', 'offline')
- `modeloAtual` - Modelo selecionado
- `modelosDisponiveis` - Lista de modelos
- `gerar(prompt, opcoes)` - Função de geração
- `chat(mensagens)` - Função de chat

---

### Páginas que usam IA

| Página | Função IA |
|--------|-----------|
| `AIChat.jsx` | Chat com IA via useAIModel |
| `Notas.jsx` | Sugestão de tags, resumo, flashcards |
| `Gerador.jsx` | Geração de questões para concurso |
| `AIBar.jsx` | Barra de ações de IA no editor |
| `AIPanel.jsx` | Painel de configurações de IA |
