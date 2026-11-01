# Project: NexoMente DLC LearnHarness Socratic Graph

## Architecture
Modular DLC extension system enabled via Feature Flags, bringing the pedagogical power and aesthetic elegance of LearnHarness (`amosblomqvist/learnharness`) into the NexoMente desktop ecosystem.

```
+---------------------------------------------------------------------------------------+
|                                    NexoMente Core                                     |
|  +------------------+   +-------------------+   +------------------+   +-----------+  |
|  | SQLite WASM DB   |   | FSRS Anki Engine  |   | Vault Notes Data |   | App Store |  |
|  +--------+---------+   +---------+---------+   +--------+---------+   +-----+-----+  |
+-----------|-----------------------|----------------------|-------------------|--------+
            |                       |                      |                   |
            v                       v                      v                   v
+---------------------------------------------------------------------------------------+
|                         DLC LearnHarness Engine (Feature Flags)                       |
|                                                                                       |
|  [M1] Hybrid AI Hub & Fallback                                                        |
|    - httpProvider.js (Bearer Auth, OpenRouter headers, custom baseUrl & model)        |
|    - aiProvider.js (Resilient auto-fallback to embedded Gemma 4 on error/offline)     |
|    - Settings.jsx (DLC AI controls with API key masking and connection test)          |
|                                                                                       |
|  [M2] Adaptive Socratic Tutor                                                         |
|    - socraticPrompts.js (Probing -> Minimal Tree -> 1-Step -> Check-in -> Repair)     |
|    - AICopilotDrawer.jsx (Mode toggle [ Assistente | Socratic ], preserve TTS/audio)  |
|                                                                                       |
|  [M3] Background FSRS Auto-Forge                                                      |
|    - AICopilotDrawer.jsx (Intercept ```flashcard blocks -> useFlashcards().create())  |
|    - CopilotMessageContent.jsx (Visual gold/terracotta deck card with copy action)    |
|    - Toast celebration feedback                                                       |
|                                                                                       |
|  [M4] 2D Canvas Cosmic Graph Viewer                                                   |
|    - clusterGeometry.js (Deterministic djb2 HSL clusterHue & organic hull splats)     |
|    - CosmicGraphCanvas.jsx (High-DPR 2D canvas, dirty-flag RAF 0% idle CPU, pan/zoom, |
|                             zoom-gated labels, golden Socratic star nodes)            |
|    - Graph.jsx (Default Cosmic view + toggle to classic Cytoscape)                    |
|                                                                                       |
|  [M5] Connection Map (MAPA) & Production Quality Gate                                 |
|    - docs/MAPA.md & docs/mapa.json updated with 100% parity                           |
|    - node scripts/verificar-mapa.js exit code 0                                       |
|    - Comprehensive vitest suite passed & npx vite build exit code 0                   |
+---------------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Bearer Token Auth in httpProvider | Support `Authorization: Bearer <apiKey>` in HTTP calls | M1 | ORIGINAL_REQUEST §16, RFC §84-87 |
| 2 | OpenRouter Metadata Headers | Add `HTTP-Referer` and `X-Title` headers for OpenRouter compliance | M1 | RFC §86 |
| 3 | Resilient Local Fallback | Automatic fallback from HTTP to embedded Gemma 4 on failure/offline | M1 | ORIGINAL_REQUEST §18, RFC §88-89 |
| 4 | External Provider Controls in Settings | Secure UI inputs for API Key, Base URL, Model ID, and Test button | M1 | ORIGINAL_REQUEST §19, RFC §90-92 |
| 5 | Copilot Socratic Mode Toggle | Header switch `[ Assistente | 🎓 Tutor Socrático ]` in AICopilotDrawer | M2 | ORIGINAL_REQUEST §22, RFC §109-113 |
| 6 | Socratic Pedagogical State Machine | Probing -> Minimal Tree (3-5 nodes) -> Single Step -> Mandatory Check-in -> Immediate Repair | M2 | ORIGINAL_REQUEST §23-28, RFC §97-108 |
| 7 | TTS Audio State Preservation | Preserve `voiceMenuOpen`, `ttsEnabled`, `speechRate`, Vosk barge-in, no standalone routes | M2 | ORIGINAL_REQUEST §29, AGENTS.md |
| 8 | Declarative Flashcard Block Format | Tutor emits propositions in ````flashcard` markdown block | M3 | ORIGINAL_REQUEST §32, RFC §120-125 |
| 9 | Response Interception & FSRS Forge | Intercept ````flashcard` in Copilot and invoke `useFlashcards().create()` | M3 | ORIGINAL_REQUEST §33, RFC §127-130 |
| 10 | Celebratory Toast Notification | Show `"💡 Conceito aprendido gravado nos Flashcards FSRS!"` on auto-forge | M3 | ORIGINAL_REQUEST §34, RFC §130 |
| 11 | Visual Deck Card Renderer | Render ````flashcard` block in `CopilotMessageContent.jsx` with copy action | M3 | ORIGINAL_REQUEST §35, RFC §131-133 |
| 12 | Deterministic Cluster Hues | djb2 HSL color hashing per cluster in `clusterGeometry.js` | M4 | ORIGINAL_REQUEST §39, RFC §148-150 |
| 13 | Organic Translucent Cluster Hulls | Convex hull / nebula splats per tag/folder subject cluster | M4 | ORIGINAL_REQUEST §41, RFC §141,154 |
| 14 | Native 2D Canvas with Dirty-Flag | High-DPR canvas, RAF loop with 0% CPU when idle, pan/zoom camera | M4 | ORIGINAL_REQUEST §40, RFC §140,150-154 |
| 15 | Zoom-Gated Labels | Dynamic label visibility: galaxy/cluster titles zoomed out, note titles zoomed in | M4 | ORIGINAL_REQUEST §42, RFC §142-144 |
| 16 | Socratic Star Nodes | Highlight nodes with learned Socratic concepts as radiant gold stars | M4 | ORIGINAL_REQUEST §43, RFC §145 |
| 17 | View Engine Switch in Graph.jsx | Toggle `[ 🌌 Cósmico | 🕸️ Clássico ]` defaulting to `'cosmic'` | M4 | ORIGINAL_REQUEST §44, RFC §155-159 |
| 18 | MAPA Synchronization | Full registration of new nodes/files in `MAPA.md` and `mapa.json` | M5 | ORIGINAL_REQUEST §47-48, AGENTS.md |
| 19 | Comprehensive Automated Test Suite | Vitest tests for Socratic dialogue, FSRS auto-creation, AI fallback, Cosmic Graph | M5 | ORIGINAL_REQUEST §49, RFC §170 |
| 20 | Vite Production Build Verification | Transpilation with `npx vite build` with 0 errors | M5 | ORIGINAL_REQUEST §50, RFC §170 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Hybrid AI Hub & Settings | `httpProvider.js`, `aiProvider.js`, `Settings.jsx` | None | DONE |
| M2 | Adaptive Socratic Tutor | `socraticPrompts.js`, `AICopilotDrawer.jsx` | M1 | DONE |
| M3 | Background FSRS Auto-Forge | `AICopilotDrawer.jsx`, `CopilotMessageContent.jsx` | M2 | DONE |
| M4 | 2D Canvas Cosmic Graph | `clusterGeometry.js`, `CosmicGraphCanvas.jsx`, `Graph.jsx` | None | DONE |
| M5 | MAPA Sync, E2E Verification & Build | `docs/MAPA.md`, `docs/mapa.json`, test suite, production build | M1, M2, M3, M4, TEST_READY | IN_PROGRESS |

## Interface Contracts

### 1. External AI Provider & Fallback (`httpProvider.js` <-> `aiProvider.js`)
- `httpProvider.getBaseUrl()`: Returns configured URL or `http://localhost:1234/v1`.
- `httpProvider.getApiKey()`: Returns `localStorage.getItem('nexomente_ai_http_api_key') || ''`.
- `httpProvider.chat(messages, options)`: Sends POST with `Authorization: Bearer <key>` (if key present) and OpenRouter headers if URL contains `openrouter`.
- `aiProvider.chat(messages, options)`: If active provider is `http` and fails, catches error and immediately delegates to `embedded.chat(messages, options)` with `{ isFallback: true }`.

### 2. Socratic Machine & Copilot Drawer (`socraticPrompts.js` <-> `AICopilotDrawer.jsx`)
- `SOCRATIC_SYSTEM_PROMPT`: Strictly enforces 1 step per turn, mandatory check-in question, immediate repair, and ````flashcard` proposition output format upon mastery.
- `localStorage('nexomente_copilot_mode')`: `'assistant'` | `'socratic'`.
- In Socratic mode, drawer injects `SOCRATIC_SYSTEM_PROMPT` into chat context.

### 3. FSRS Auto-Forge (`AICopilotDrawer.jsx` <-> `useFlashcards` & `CopilotMessageContent.jsx`)
- Flashcard markdown format:
  ````text
  ```flashcard
  Frente: <question>
  Verso: <answer>
  ```
  ````
- Interceptor extracts `frente` and `verso` and calls `useFlashcards().create({ frente, verso, materia_id, nota_id })`.
- Toast: `toast('💡 Conceito aprendido gravado nos Flashcards FSRS!', { icon: '🎓' })`.
- `CopilotMessageContent.jsx`: Intercepts `lang === 'flashcard'` and renders visual terracotta/gold deck card.

### 4. Cosmic Graph (`clusterGeometry.js` <-> `CosmicGraphCanvas.jsx` <-> `Graph.jsx`)
- `getClusterHue(name)`: Returns deterministic HSL hue (0-359).
- `computeClusterHull(points, padding)`: Returns organic cluster boundary geometry.
- `CosmicGraphCanvas`: Props `{ nodes, edges, onSelectNode, selectedNodeId, searchFilter, activeTag }`.
  - Uses DPR-scaled 2D canvas context.
  - Dirty-flag RAF loop for 0% CPU consumption when idle.
  - Zoom-gated text: galaxy titles when `k < 0.8`, note titles when `k >= 0.8`.
  - Socratic concept nodes rendered with radiant gold particle glow.
- `Graph.jsx`: Toggle switch `[ 🌌 Cósmico | 🕸️ Clássico ]` with `localStorage('nexomente_graph_view_engine')` defaulting to `'cosmic'`.

### 5. MAPA Integrity Contract
- Every new file or node MUST be registered in `docs/mapa.json` (`nos` or `hubs`) and documented in `docs/MAPA.md`.
- `node scripts/verificar-mapa.js` must exit 0.

## Code Layout
- `app/src/lib/ai/httpProvider.js` (modified)
- `app/src/lib/ai/aiProvider.js` (modified)
- `app/src/lib/ai/socraticPrompts.js` (NEW)
- `app/src/pages/Settings.jsx` (modified)
- `app/src/components/ai/AICopilotDrawer.jsx` (modified)
- `app/src/components/ai/CopilotMessageContent.jsx` (modified)
- `app/src/components/graph/clusterGeometry.js` (NEW)
- `app/src/components/graph/CosmicGraphCanvas.jsx` (NEW)
- `app/src/pages/Graph.jsx` (modified)
- `docs/MAPA.md` (modified)
- `docs/mapa.json` (modified)
- `app/src/test/socraticDLC.test.js` (NEW)
