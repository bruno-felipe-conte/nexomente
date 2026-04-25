# Changelog — NexoMente

Todas as mudanças relevantes do projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased] — Sprint de Profissionalização (Abril 2026)

### ✅ Adicionado

#### Arquitetura & Qualidade de Código
- **Code Splitting completo** (`React.lazy` + `Suspense`) em todas as 10 rotas — bundle principal caiu de ~800KB para **171KB**
- **Hook `useNotaEditor`** (135L) extraído de `Notas.jsx` — encapsula TipTap + ações de IA
- **Componente `NotaLista`** (118L) extraído de `Notas.jsx` — lista de notas com busca
- **Componentes `GerarIAModal` + `QuestaoCard`** extraídos de `Gerador.jsx`
- **Componente `ChatMessage`** extraído de `AIChat.jsx`
- **Componente `FlashcardViewer`** extraído de `Flashcards.jsx` — revisão SM-2 isolada
- **`utils/dateUtils.js`** — centraliza manipulação de datas com `date-fns` (ptBR)
- **`utils/toast.js`** — wrappers semânticos de `react-hot-toast` (`toastSucesso`, `toastErro`, `toastDesfazer`, `toastPromise`)
- **`constants/errorMessages.js`** — mensagens de erro humanizadas em português
- **`components/ui/EmptyState.jsx`** — estado vazio reutilizável
- **`components/ui/ConfirmDialog.jsx`** — confirmação de ações destrutivas com cancelar autofocado
- **Convenção de nomenclatura documentada**: PT para domínio (`criar`, `salvar`) + EN para React (`handle*`, `use*`, `on*`)

#### CI/CD & DevOps
- **`.github/workflows/ci.yml`** — pipeline GitHub Actions com lint + test a cada PR
- **`.github/dependabot.yml`** — atualizações semanais npm; Electron major bloqueado; `@tiptap/*` agrupado em 1 PR
- **`husky` + `lint-staged`** — pre-commit hook roda ESLint apenas nos arquivos staged

#### Testes
- **7 suites de teste, 83 testes** passando (0 falhas)
- **`sm2.test.js`** — 17 casos cobrindo todo o algoritmo SM-2
- **`errorMessages.test.js`** — 13 casos cobrindo todas as branches de erro
- **`dateUtils.test.js`** — 13 casos com boundary cases de formatação
- **`toast.test.js`** — 12 casos com mock de react-hot-toast
- **`smoke.test.js`** — 9 casos de fumaça CRUD + utilitários
- **`integration.test.js`** — 14 casos de integração cross-module (SM-2 end-to-end, pipeline erro→toast, etc.)
- **Cobertura 100% linhas** no escopo testável (utils, constants, sm2)
- **Coverage thresholds** configurados: 60% lines/functions/statements, 55% branches

### 🔧 Modificado

#### Redução de Tamanho de Arquivos (SRP)
| Arquivo | Antes | Depois | Redução |
|---|---|---|---|
| `Notas.jsx` | 456L | 248L | -46% |
| `Gerador.jsx` | 576L | 340L | -41% |
| `AIChat.jsx` | 353L | 218L | -38% |
| `Flashcards.jsx` | 370L | 237L | -36% |

#### Remoção de Código Morto
- `listModels` removido de `useAIModel.js` (nunca chamado)
- `GripVertical`, `Trash2`, `Edit3` removidos de `BibliotecaPanel.jsx`
- `editandoPasta`, `editandoNome` (dead state) removidos de `BibliotecaPanel.jsx`
- `handleEditar`, `handleSalvarEdicao`, `handleExportarTodos` removidos de `Gerador.jsx` (orphaned após extração de `QuestaoCard`)
- `criarTodosFlashcards`, `clearAll` removidos do destructuring de `Gerador.jsx`

#### Configurações
- `vitest.config.js` — coverage focado em arquivos testáveis; excluídos pages/services/stores (dependem de Electron API)
- `lmStudioService.js` — catch vazio marcado como intencional com comentário ESLint

### 🐛 Corrigido
- `no-undef` ESLint: zerado (era a principal categoria de erros)
- Import `useCallback` removido de onde não era usado
- Estados React não utilizados (`editandoPasta`, `editandoNome`) eliminados

### 📊 Métricas da Sprint

| Métrica | Antes | Depois |
|---|---|---|
| Bundle principal | ~800KB | **171KB** (-79%) |
| Testes | 0 | **83** |
| Cobertura (escopo testável) | — | **100% linhas** |
| Arquivos >300L | 5 | **0** |
| ESLint `no-undef` errors | 175 | **0** |
| Commits na sprint | — | **8 commits atômicos** |

---

## [0.1.0] — MVP Inicial

### ✅ Funcionalidades Core
- Editor de notas com TipTap (rich text, links wiki, suporte Markdown)
- Banco de Flashcards com algoritmo SM-2 (revisão espaçada)
- Gerador de questões (parsing de provas + geração via IA)
- Chat com IA local (LM Studio / Ollama)
- Grafo de conhecimento (vis.js)
- Modo Pomodoro integrado
- Gamificação (XP, badges, streaks)
- Suporte offline-first via Electron + SQLite
- Sincronização com Obsidian (pasta configurável)
- Importação de arquivos `.txt` e `.md`
- Exportação para `.doc`, `.txt`, `.json`
- Temas claro/escuro/sistema

---

*Mantido manualmente. Para mudanças automáticas via CI, consulte as GitHub Actions.*
