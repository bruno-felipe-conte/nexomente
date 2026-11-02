# Project: NexoMente Core Enhancements (R1-R4)

## Architecture
NexoMente is a local-first, privacy-respecting cognitive productivity platform built with React, Vite, Tailwind CSS, SQLite WASM, and Electron.
The current enhancement project integrates four primary functional pillars:
1. **Intelligent Tag Queue (R1)**: A hybrid online/offline auto-tagging system for notes that immediately tags notes via cloud AI (Gemini, Groq, OpenRouter) when online, or enqueues them in SQLite WASM (`tags_queue`) when offline/local, with an automatic non-blocking background drain using an `AsyncMutex` and subtle toast feedback (`react-hot-toast`).
2. **Pedagogical Mermaid Diagrams (R2)**: Socratic Tutor enhancement in `socraticPrompts.js` emitting deductive reasoning trees with a prominent "Você está aqui" highlight (`classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px; class N current`), rendered reactively via dynamic `import('mermaid')` in `MermaidViewer.jsx` with dark theme (`#0f172a`), zoom/pan, SVG sanitization (`dompurify`), and graceful code fallback.
3. **Brazilian Edge TTS Neural Voices (R3)**: Expansion from 3 to all 9 Brazilian neural voices across frontend catalog (`NEURAL_VOICES` in `neuralTTS.js`), dev server middleware (`vite.config.js`), Electron IPC (`audioHandlers.js`), and voice selector with sample preview and persistent `localStorage` selection in `AICopilotDrawer.jsx`.
4. **Architectural Parity & Quality Verification (R4 & E2E Track)**: Strict synchronization of `docs/MAPA.md` and `docs/mapa.json` (verified via `node scripts/verificar-mapa.js`), 100% Vitest test suite execution, 0-error `npx vite build`, and an independent 4-tier E2E testing track.

---

## Feature Inventory
Every feature identified during the Survey phase is mapped to a specific milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SQLite WASM `tags_queue` Table | Migration in `wasmEngine.js` creating `tags_queue` table with indexes for pending note tagging | M1 | Survey R1 |
| 2 | `tagsQueueRepo.js` Repository | Database repository implementing `enqueue(notaId)`, `peek(limit)`, `dequeue(notaId)`, `count()` | M1 | Survey R1 |
| 3 | `tagQueueService.js` Background Drain | Auto-tagging coordinator detecting online status, processing batch queue with `AsyncMutex` & rate-limiting | M1 | Survey R1 |
| 4 | Notes Editor & Creation Hook Wireup | Intercept note creation and saves in `useNotes.js` and `useNotaEditor.js` without blocking UI | M1 | Survey R1 |
| 5 | Silent Toast Notification | Emit `🏷️ Tags automáticas adicionadas` upon successful note tagging via `react-hot-toast` | M1 | Survey R1 |
| 6 | Mermaid Dependency & Dynamic Loader | Add `mermaid` to `package.json` and load dynamically via `import('mermaid')` to preserve chunk budget | M2 | Survey R2 |
| 7 | `MermaidViewer.jsx` Component | Dark theme SVG renderer with DOMPurify sanitization, zoom/pan controls, copy code button, and error fallback | M2 | Survey R2 |
| 8 | `CopilotMessageContent.jsx` Wireup | Route `lang === 'mermaid'` code blocks to `MermaidViewer.jsx` while maintaining existing card renderers | M2 | Survey R2 |
| 9 | Socratic Prompt Invariants & Diagrams | Augment `SOCRATIC_SYSTEM_PROMPT` in `socraticPrompts.js` to emit deductive flowcharts with "Você está aqui" highlight | M2 | Survey R2 |
| 10 | 9 Brazilian Neural Voices Catalog | Register all 9 voices in `neuralTTS.js` and remove erroneous Fabio->Francisca fallback in `VOICE_ALIAS_MAP` | M3 | Survey R3 |
| 11 | Backend & Dev Server Voice Parity | Support all 9 voices in `vite.config.js` (`/api/tts/synthesize`) and `electron/ipc/audioHandlers.js` | M3 | Survey R3 |
| 12 | Voice Selector Preview & Storage | Add sample preview button and reliable `localStorage` initialization in `AICopilotDrawer.jsx` | M3 | Survey R3 |
| 13 | Connection Map Synchronization | Register all new components, repos, and services in `docs/MAPA.md` and `docs/mapa.json` | M4 | Survey R4 |
| 14 | Verification Scripts & Suite Pass | Ensure `node scripts/verificar-mapa.js` passes 100%, new and existing Vitest suites pass, `npx vite build` 0 errors | M4 | Survey R4 |
| 15 | Opaque-Box E2E Test Suite | 4-Tier test suite verifying Auto-Tagging, Mermaid diagrams, Edge TTS voices, and regression boundaries | E2E | Dual Track |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fila Inteligente de Auto-Tagging (R1) | `wasmEngine.js`, `tagsQueueRepo.js`, `tagQueueService.js`, `useNotes.js`, `useNotaEditor.js`, toast | None | DONE (17/17 tests passing, build 0 errors) |
| M2 | Diagramas Mermaid no Tutor Socrático (R2) | `package.json` (mermaid), `MermaidViewer.jsx`, `CopilotMessageContent.jsx`, `socraticPrompts.js` | None | DONE (19/19 tests passing, build 0 errors) |
| M3 | Expansão de Vozes Neurais Edge TTS (R3) | `neuralTTS.js`, `VOICE_ALIAS_MAP`, `vite.config.js`, `audioHandlers.js`, `AICopilotDrawer.jsx` | None | DONE (15/15 tests passing, build 0 errors) |
| M4 | Mapa de Conexões e Verificação Integrada (R4) | `docs/MAPA.md`, `docs/mapa.json`, `verificar-mapa.js`, Vitest integration, `vite build` | M1, M2, M3 | PLANNED |
| M5 | Final Milestone: E2E Suite Pass & Hardening | Pass 100% E2E test suite (Tiers 1-4) & Tier 5 adversarial coverage hardening | M4, TEST_READY | PLANNED |
| E2E | E2E Testing Track | Independent opaque-box test suite across Tiers 1-4, `TEST_INFRA.md`, publish `TEST_READY.md` | Survey | IN_PROGRESS |

---

## Interface Contracts

### M1: `tagQueueService.js` ↔ Notes & Stores
- `tagQueueService.enqueueNote(notaId, content)`:
  - Input: `notaId: string`, `content: { titulo: string, conteudo: string }`
  - Output: `Promise<void>`
  - Behavior: If provider is online and network is up, tags immediately via AI and emits toast. If offline or local engine, writes to `tags_queue`.
- `tagQueueService.drainQueue()`:
  - Invoked on: `useAIStore.setProvider('http')`, `window.addEventListener('online')`, successful `aiProvider.chat()`.
  - Mutex: Serialized via `AsyncMutex` or `isDraining` atomic flag. Rate-limited to 250ms per item.
  - Updates: `NotasRepo.update(id, { tags: mergedTags })`, then dequeues from `tags_queue`.

### M2: `MermaidViewer.jsx` ↔ `CopilotMessageContent.jsx`
- Component: `<MermaidViewer code={cleanCode} />`
- Props: `code: string` (raw Mermaid diagram text)
- Theme: Dark background (`#0f172a`), border `var(--nx-border)`, font `monospace`.
- Interactions: Zoom in/out/reset (0.5x to 2.5x), Drag-to-pan, Toggle raw code / Copy code.
- Fallback: On syntax error, render formatted `<CodeSnippet language="mermaid" code={code} />` with non-blocking error badge.

### M3: `neuralTTS.js` ↔ `AICopilotDrawer.jsx` & Endpoints
- Catalog: `NEURAL_VOICES` array containing all 9 items with `{ id, name, gender, description, sampleText }`.
- Method: `neuralTTS.speak(text, { voice, messageId })`
- Method: `neuralTTS.stop()`
- Endpoints:
  - Web/Dev: `POST /api/tts/synthesize` with `{ text, voice }` in `vite.config.js`
  - Desktop: IPC `audio:synthesizeSpeech` with `(event, { text, voice })` in `audioHandlers.js`

---

## Code Layout
- `app/src/lib/db/wasmEngine.js`: SQLite WASM schema initialization (`tags_queue` table)
- `app/src/lib/db/repositories/tagsQueueRepo.js`: Queue data access methods
- `app/src/lib/ai/tagQueueService.js`: Queue orchestration and background drain logic
- `app/src/lib/ai/socraticPrompts.js`: Socratic system prompt with Mermaid flowchart guidelines
- `app/src/components/ai/MermaidViewer.jsx`: Dedicated Mermaid diagram renderer
- `app/src/components/ai/CopilotMessageContent.jsx`: Dispatcher for markdown and code blocks
- `app/src/lib/audio/neuralTTS.js`: Edge TTS voice registry and synthesis client
- `app/src/components/ai/AICopilotDrawer.jsx`: Voice selector with preview audio buttons
- `vite.config.js`: Dev server TTS proxy supporting all 9 Brazilian voices
- `electron/ipc/audioHandlers.js`: Electron IPC speech synthesis handler
- `docs/MAPA.md` & `docs/mapa.json`: Architectural connectivity and symbol inventory
- `app/src/test/`: Vitest test suites
