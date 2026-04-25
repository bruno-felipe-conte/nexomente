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

### 🧠 Gamificação
- Sistema de **XP** com eventos configuráveis
- **Níveis** e títulos que desbloqueiam conforme o uso
- **Missões diárias** para criar hábito de estudo
- **Conquistas** desbloqueáveis (streaks, milestones)
- Animações: XP Toast, Level Up Modal
- Dashboard de rastreamento de progresso

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

### 📜 Dashboard de Poemas
- Recitação ativa de poemas com navegação
- Tipografia limpa com formatação preservada
- Contador de dias ativo / recitações
- Backstage de gestão de poemas (título, autor, ano)

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
| Estilização | Tailwind CSS v3 |
| Editor | TipTap v2 |
| Banco | sql.js (SQLite) |
| Estado | Zustand |
| Grafo | Cytoscape.js |
| IA | Ollama (porta 11434) / LM Studio (porta 1234) |
| Gamificação | Framer Motion |
| Tests | Vitest + Testing Library |

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

## 📊 Gamificação — Sistema de XP

| Ação | XP |
|------|-----|
| Criar nota | +5 XP |
| Revisar flashcard | +2 XP |
| Completar Pomodoro | +10 XP |
| Criar questão (concurso) | +5 XP |
| Resolver simulado | +10 XP |
| 10 acertos seguidos | +15 XP |
| Missão diária completa | +20 XP |

**Níveis:** Estudante → Aprendiz → Pesquisador → Mestre do Conhecimento → Sábio Digital

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