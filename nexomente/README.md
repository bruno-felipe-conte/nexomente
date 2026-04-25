# 🧠 NexoMente

### Seu segundo cérebro offline — com IA local, grafo de conhecimento e gamificação

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Electron-28-47848F?style=for-the-badge&logo=electron" />
  <img src="https://img.shields.io/badge/AI-Local%20Only-9333EA?style=for-the-badge" />
</p>

---

## 🎯 O que é?

**NexoMente** é um aplicativo desktop para anotação, estudo e construção de conhecimento pessoal — 100% offline, com IA rodando localmente no seu PC.

Pense nele como uma combinação de: **Obsidian + Anki + Notion + um segundo cérebro que aprende com você**. Mas com um diferencial central: **nada sai do seu computador**. Nem seus textos, nem suas notas, nem seus dados de estudo. Nunca.

O app utiliza LLMs locais (Ollama ou LM Studio) para gerar flashcards, resumir textos, sugerir conexões entre notas e criar questões estilo concurso — sem enviar nenhum dado para a nuvem.

---

## ✨ Funcionalidades Principais

### 📝 Sistema de Notas com Wiki-Links
- Editor TipTap com toolbar completa (negrito, itálico, código, bloco de citação, equações LaTeX)
- Conexões entre notas via `[[wikilinks]]` com autocompletar
- Tags manuais e sugestões por IA
- 7 tipos de nota: livro, projeto, ideia, diário, bíblia, estudo, lembrete
- Modo Foco para escrita sem distrações
- Sincronização bidirecional com pasta local `.md`

### 🗂️ Gerenciamento de Bibliotecas
- Painel lateral com bibliotecas (tags/pastas virtuais)
- Filtragem por matéria, tipo e tags
- Busca full-text no SQLite
- Interface de card view para navegação rápida

### 🧠 Gamificação: Tamagotchi de Estudos
- Mascote virtual dinâmico com **30 níveis únicos** (do 🥚 Ovinho até a ✴️ Forma Final Lendária).
- **Sistema de XP:** Ganhe experiência concluindo sessões de estudo reais.
- **Sistema de HP (Saúde):** O mascote perde vida se o usuário faltar dias de estudo, podendo hibernar.
- **Multiplicadores e Streaks (Ofensivas):** Dias consecutivos multiplicam a XP (até 3x).
- **Habilidades Passivas:** Diferentes formas dão vantagens exclusivas (Ex: a Águia aumenta o ganho em 5%).
- **Animações Épicas:** Efeitos de Level Up utilizando *Framer Motion* e partículas (confetes, raios, cosmos).

### 📇 Flashcards com Spaced Repetition
- Algoritmo **SM-2** (SuperMemo) para revisão adaptativa
- Criação automática por IA a partir de textos e notas
- CRUD completo com gerenciador central
- Botão de "Recitei" com undo de 5 segundos
- Filtro "Visualizar Todos" para revisão de cards dominados

### 💬 Chat com IA Local
- Conversa integrada com Ollama ou LM Studio
- Modelo configurável (padrão: `llama3.2:3b`)
- Status de conexão visível na interface
- Contexto de notas e flashcards para conversas enriched

### 🕸️ Grafo de Conexões
- Visualização interativa com **Cytoscape.js**
- Nós por tipo de nota, cor por matéria
- Filtros por tipo, matéria e tags
- Preview de nota ao clicar no nó
- Conexões: wikilinks + tags compartilhadas

### ⏱️ Estudo e Pomodoro
- Timer Pomodoro (25/50/15 min configurável)
- Sessões registradas por matéria
- Metas de horas por matéria
- Histórico de sessões com estatísticas

### 🎓 Gerador de Questões (Concurseiro)
- Upload de arquivos (TXT, MD, PNG, JPG) ou texto colado
- Geração de questões estilo banca por IA
- Justificativas pedagógicas para cada alternativa
- Exportação para DOC, HTML, JSON
- Tags, dispositivo legal e metadata por questão

### 📜 Dashboard & Poema Vigente
- **Poema Vigente:** O dashboard exibe o último poema atualizado lado a lado com seu mascote virtual, trazendo inspiração imediata ao abrir o app.
- Tipografia limpa, serifada e com formatação estética (itálicos e espaçamentos no padrão UX premium).
- Módulo isolado para recitação ativa e leitura sem distrações.
- Gestão completa de acervo poético (título, autor, versos).

### 💾 Sincronização e Backup
- Pasta local espelhada (Google Drive File Stream ready)
- Backups automáticos do banco SQLite
- Exportação de flashcards em JSON
- Tudo 100% offline — seus dados não vão para a nuvem

---

## 🏗️ Arquitetura

```
nexomente/
├── electron/              # Runtime desktop (Electron 28+)
│   ├── main.js           # Processo principal, janela, IPC
│   └── preload.js       # Bridge segura (contextIsolation)
├── app/src/              # Frontend React
│   ├── pages/            # 11 páginas (Dashboard, Notas, Study...)
│   ├── components/       # layout/, editor/, gamification/
│   ├── hooks/            # useNotes, useFlashcards, useAIModel...
│   ├── services/         # exportService, syncService
│   ├── lib/             # db.js, parser.js, sm2.js, AI services
│   └── store/            # Zustand stores
├── src/test/            # Testes Vitest (70%+ coverage)
├── scripts/              # Scripts de manutenção
└── package.json         # Dependências e scripts
```

### Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Electron v28 |
| Frontend | React 18 + Vite |
| Estilização | Tailwind CSS v3 + CSS Variables (Tokens) |
| Editor | TipTap v2 |
| Banco | sql.js (SQLite) |
| Estado | Zustand |
| Grafo | Cytoscape.js |
| IA | Ollama (porta 11434) / LM Studio (porta 1234) |
| Gamificação | Framer Motion (Animações), Lógica de Níveis |
| Tests | Vitest + Testing Library |

### Guia de Manutenção (Design System & Arquitetura)

Para facilitar a manutenção futura, o código foi organizado seguindo um padrão rigoroso:

1. **Design System & Tokens (`index.css`)**: 
   Todas as cores de superfícies e textos são governadas por variáveis CSS (`--surface-base`, `--text-hi`). O *Tailwind* (`tailwind.config.js`) lê essas variáveis. **Nunca use cores hexadecimais hardcoded nos componentes React**, use sempre classes como `bg-bg-primary`, `text-text-primary`, `border-border-subtle`.
2. **Componentes Padrão (`app/src/components/ui/`)**: 
   Sempre reutilize os componentes `<Card>`, `<Button>`, `<Input>` e `<Badge>`. Eles concentram todo o comportamento de hover, focus e transições.
3. **Animações**: 
   Usamos o `framer-motion` para transições suaves. Exemplo: O *Flashcard* usa o layout de rotação 3D (`rotateY`) gerido pelo componente `<motion.div>`.
4. **Comunicação Segura (IPC)**: 
   O React nunca toca diretamente no banco de dados. Todas as chamadas passam pelo `window.api` (ex: `window.api.getNotes()`), configurado no `electron/preload.js` usando `contextBridge`.
5. **Integração de IA (`lmStudioService.js`)**: 
   Todo prompt enviado para a IA passa por uma camada de formatação e *fallback*. Se o modelo falhar ao retornar JSON puro, usamos Expressões Regulares (`regex`) para extrair os dados na força bruta.

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** 18+
- **Python** 3.10+ (para graphify, opcional)
- **Ollama** ou **LM Studio** (opcional, para recursos de IA)

### Instalação

```bash
# 1. Entre na pasta do projeto
cd nexomente

# 2. Instale as dependências
npm install

# 3. (Opcional) Instale Ollama e baixe um modelo
# https://ollama.com — baixe e rode:
ollama pull llama3.2:3b

# 4. Inicie o app em modo desenvolvimento
npm run dev
```

Isso abre duas janelas: o servidor Vite (frontend) e o Electron (app desktop).

### Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento (Vite + Electron)
npm run build        # Build de produção
npm run build:win    # Build Windows (.exe)
npm run test         # Rodar testes
npm run test:run     # Rodar testes uma vez
npm run test:coverage # Testes com cobertura
```

---

## 🤖 Configuração de IA Local

O NexoMente é **100% offline**, mas os recursos de IA dependem de um LLM rodando localmente na sua máquina. O app suporta **duas opções** que podem ser configuradas durante o onboarding ou nas Configurações.

### Como funciona

```
Seu Computador
┌─────────────────────────────────────────────┐
│  NexoMente (App)                            │
│       │                                      │
│       ▼                                      │
│  ┌─────────┐    ┌──────────────┐            │
│  │ Ollama  │ OR │  LM Studio   │            │
│  │ :11434  │    │  :1234       │            │
│  └────┬────┘    └──────┬───────┘            │
│       │                 │                     │
│       ▼                 ▼                     │
│  ┌─────────────────────────────────────┐    │
│  │  LLM rodando localmente             │    │
│  │  (todos os dados ficam no seu PC)   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Opção 1 — Ollama (Recomendado)

O Ollama é a forma mais simples de rodar LLMs localmente. Baixe em [ollama.com](https://ollama.com) e siga:

```bash
# 1. Instale o Ollama
# Baixe em: https://ollama.com/download

# 2. Após instalar, abra um terminal e baixe um modelo:
ollama pull llama3.2:3b        # ~2GB — rápido, bom custo-benefício
ollama pull llama3.1:8b        # ~4.8GB — mais capaz
ollama pull phi3:14b           # ~2.2GB — da Microsoft, bom para texto
ollama pull mistral:7b         # ~4.1GB — versátil

# 3. Verifique se está rodando
ollama list

# 4. O Ollama inicia automaticamente em segundo plano
# A porta 11434 fica disponível automaticamente
```

**Para iniciar manualmente (se necessário):**
```bash
ollama serve
```

**No app:** vá em **Configurações → IA** e selecione **Ollama** com o modelo que você baixou.

### Opção 2 — LM Studio (Mais poder + UI)

O LM Studio oferece uma interface visual e suporte a mais modelos (incluindo quantized). Baixe em [lmstudio.ai](https://lmstudio.ai):

```bash
# 1. Baixe o LM Studio
# https://lmstudio.ai/download

# 2. Instale e abra o app

# 3. No LM Studio:
#    a) vá em Search → procure um modelo (ex: "llama 3.2")
#    b) baixe o modelo (Download)
#    c) vá em "Local Server" (ícone de chat à esquerda)
#    d) clique em "Start Server"
#    e) A API estará disponível em http://localhost:1234/v1

# 4. Selecione o modelo desejado e temperatura
```

**Para modelos recomendados:**
| Modelo | Tamanho | Uso | Onde buscar no LM Studio |
|--------|---------|-----|--------------------------|
| Llama 3.2 3B | ~2GB | Uso geral, rápido | `llama3.2-3b` |
| Llama 3.1 8B | ~5GB | Melhor qualidade | `llama-3.1-8b` |
| Phi-3 Medium | ~4GB | Microsoft, eficiente | `phi-3-medium` |
| Mistral 7B | ~4GB | Equilibrado | `mistral-7b` |
| Qwen 2.5 7B | ~4.5GB | Excelente em PT-BR | `qwen2.5-7b` |
| Gemma 2 9B | ~5GB | Google, versátil | `gemma-2-9b` |

**No app:** vá em **Configurações → IA** e selecione **LM Studio**. A URL já vem pré-preenchida (`http://localhost:1234/v1`).

### Opção 3 — Jan (Alternativa open-source)

O Jan é uma alternativa ao LM Studio, 100% open-source: [jan.ai](https://jan.ai)

```bash
# 1. Baixe em: https://jan.ai/download

# 2. Abra o Jan, baixe um modelo pela interface

# 3. Vá em "Local API Server" e clique em Start
#    (a API funciona na porta 1337 por padrão)

# 4. No NexoMente, use a URL: http://localhost:1337/v1
```

### Opção 4 — Servidor API customizado

Se você já tem um servidor LLM rodando (ex: Text Generation Webui, vLLM, etc.):

```bash
# Qualquer servidor com API OpenAI-compatible funciona
# Exemplo com текст generation webui:
# http://localhost:5000/v1

# Configure no NexoMente em Configurações → IA
# URL: http://localhost:SUA_PORTA/v1
# Provider: Custom
```

### Modelos recomendados por tarefa

| Tarefa | Melhor modelo | Por quê |
|--------|--------------|---------|
| Flashcards e resumos | `llama3.2:3b` | Rápido, bom em formatação |
| Questões de concurso | `llama3.1:8b` | Melhor raciocínio multi-step |
| Chat conversacional | `mistral:7b` ou `qwen2.5:7b` | Natural, bom em PT-BR |
| Tags e conexões | `phi3:14b` | Eficiente, bom em análise |
| POemas e textos criativos | `gemma-2-9b` | Criativo e bem formatado |

### Solução de problemas

**O app não conecta na IA?**
1. Verifique se Ollama/LM Studio está aberto e rodando
2. Clique em "Testar conexão" em Configurações → IA
3. Verifique se o modelo foi baixado corretamente (`ollama list` ou LM Studio)
4. Tente reiniciar o servidor (fechar e abrir de novo)

**A IA está lenta?**
- Modelos menores = mais rápido (3B > 8B > 70B)
- Quantized (Q4_K_M) = mais rápido que FP16
- Mais RAM livre = melhor cache de contexto
- GPU dedicada = muito mais rápido (Nvidia CUDA)

**Sem GPU dedicada?**
Use modelos até 3B-7B — rodam bem em CPU. Llama 3.2 3B é o melhor custo-benefício para CPU-only.

---

## 🎮 Keyboard Shortcuts

| Atalho | Ação |
|--------|------|
| `G` `D` | Dashboard |
| `G` `N` | Notas |
| `G` `S` | Study |
| `G` `F` | Flashcards |
| `G` `Q` | Gerador |
| `G` `G` | Grafo |
| `G` `P` | Poemas |
| `G` `,` | Configurações |
| `Ctrl+Shift+N` | Nova nota rápida |
| `Ctrl+Shift+F` | Modo foco |
| `Esc` | Fechar modais |

---

## 📊 Gamificação — Tamagotchi de Estudos

Seu nível de dedicação define a forma do seu mascote. O **XP** é conquistado sempre que você conclui uma sessão de estudo válida.

| Duração | XP Base | Streak 7d (x2) | Streak 30d (x3) |
|---------|---------|----------------|-----------------|
| < 15m   | 5 XP    | 10 XP          | 15 XP           |
| 15-30m  | 15 XP   | 30 XP          | 45 XP           |
| 30-60m  | 30 XP   | 60 XP          | 90 XP           |
| 1-2h    | 50 XP   | 100 XP         | 150 XP          |
| 2-4h    | 80 XP   | 160 XP         | 240 XP          |
| > 4h    | 120 XP  | 240 XP         | 360 XP          |

**Mecânica de Vida (HP):**
- **1 dia** sem estudar: -10 HP
- **2 dias** sem estudar: -30 HP (acumulativo)
- Se a vida zerar: o mascote entra em estado de **Hibernação** e você perde sua Ofensiva atual.

**Evoluções (30 Níveis):**
O mascote passa por seis fases evolutivas com animações próprias em tela cheia:
1. **O Nascimento (1-5):** Ovinho 🥚 a Pato 🦆
2. **A Descoberta (6-10):** Coelho 🐰 a Raposa 🦊
3. **A Ascensão (11-15):** Guaxinim 🦝 a Leão 🦁
4. **O Poder (16-20):** Tigre 🐯 a Dragão Jovem 🐉
5. **A Transcendência (21-25):** Serpente 🐍 a Dragão Arco-Íris 🐲
6. **O Absoluto (26-30):** Ser Cósmico 🌌 a Forma Final ✴️

---

## 🤿 Onboarding

Na primeira execução, o app guia você por 4 etapas:

1. **Bem-vindo** — Apresentação do NexoMente
2. **IA Local** — Configurar Ollama ou LM Studio
3. **Pasta Cofre** — Selecionar onde salvar notas `.md`
4. **Pronto** — Dashboard principal

---

## 📂 Estrutura de Arquivos (Dados)

```
Pasta Cofre (configurável)/
├── _cofre/                 # Notas em Markdown
│   ├── livros/
│   ├── projetos/
│   ├── ideias/
│   ├── diario/
│   ├── estudo/
│   └── biblia/
├── _banco/
│   └── nexomente.db        # SQLite com todos os dados
├── _backups/
│   └── nexomente_YYYY-MM-DD.db
└── _exportacoes/
    └── flashcards_YYYY-MM-DD.json
```

---

## 🔒 Privacidade

- **100% offline** — nenhum dado enviado para servidores externos
- **IA local** — todos os modelos rodam no seu hardware
- **Banco SQLite** — seus dados são seus, sem cloud
- **Context isolation** — Electron com segurança máxima
- **Git commit on save** — versão de dados local opcional

---

## 🛤️ Roadmap

- [ ] Auto-update via GitHub Releases
- [ ] OCR para PDF e imagens
- [ ] Modo simulado de provas
- [ ] Sincronização multi-device (Google Drive)
- [ ] Plugins / extensibilidade
- [ ] Versão mobile (React Native)

---

## 👤 Autor

**Bruno Felipe Conte** — Desenvolvido para uso pessoal com foco em estudo, organização de conhecimento e preparação para concursos.

---

## 📄 Licença

MIT License — Use, modifique e distribua livremente.

---

<p align="center">
  <strong>Construa seu segundo cérebro. Estude com intención. Nada sai do seu computador.</strong>
</p>