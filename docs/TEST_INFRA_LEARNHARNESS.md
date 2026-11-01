# Test Infrastructure Architecture & 4-Tier Test Matrix
## NexoMente DLC LearnHarness Socratic Graph (R1 - R5)

**Document Version**: 1.0.0  
**Target Environment**: Vitest + JSDOM + MSW + Electron Mock  
**Integrity Mode**: Production / Development Strict  
**Author**: E2E Test Writer (`teamwork_preview_test_writer`)

---

## 1. Test Architecture & Methodology Overview

This test infrastructure implements the canonical 4-tier testing hierarchy to guarantee the architectural stability, pedagogical efficacy, and algorithmic correctness of the **DLC LearnHarness Socratic Graph** modules across NexoMente:

```
+-------------------------------------------------------------------------------+
|                 Tier 4: Real-World Application Scenarios                     |
|  - Complete Socratic Dialogue -> FSRS Card Creation -> Cosmic Graph Starlight |
|  - Offline Outage -> Seamless Gemma 4 Fallback -> Zero Session Interruption   |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 3: Cross-Feature Combinations (Pairwise)                 |
|  - HTTP Provider Auth/Header failure -> aiProvider Embedded Gemma Fallback    |
|  - Socratic Turn Check-in Mastery -> Auto-Forge Card Extraction -> Toast Bus  |
|  - New Note WikiLink Creation -> Cluster Hue Recalculation -> Hull Splat      |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 2: Boundary & Corner Cases (Stress & Faults)             |
|  - 401 Unauthorized / Rate Limits / Offline Network Timers (AbortSignal)      |
|  - Malformed ```flashcard Blocks / Empty Front / Missing Colon / Multi-blocks |
|  - 0-node Empty Graphs / 1-node Singularity Halos / Extreme Zoom Thresholds   |
|  - Vosk Speech Barge-in Collision with Neural TTS Active Playback             |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 1: Feature Coverage (Happy Path & Contracts)             |
|  - R1: Bearer Token Auth, OpenRouter Headers, Fallback Protocol, Settings UI  |
|  - R2: Socratic Mode Toggle, 5-Stage Prompt Machine, Single-Step, TTS States |
|  - R3: Regex Extraction, FSRS useFlashcards().create() Call, Golden Deck Card |
|  - R4: Deterministic djb2 HSL Cluster Hue, Hull Geometry, Zoom-Gated Labels   |
|  - R5: MAPA Parity (56+ files, 39 IPC channels), Vitest Suite, Vite Build     |
+-------------------------------------------------------------------------------+
```

---

## 2. Authoritative Output Derivation Sources

Every expected value in this test matrix is derived from explicit architectural specifications:
1. **RFC & Blueprint**: `/home/bruno/.gemini/antigravity/brain/c2fb3104-f3f6-48f7-a1d4-f9bdbf34a8b7/plan_dlc_learnharness_socratic_graph.md`
2. **System Requirements**: `.agents/teamwork/ORIGINAL_REQUEST.md`
3. **Architecture & Contract Manifest**: `PROJECT.md`
4. **Architectural Invariants & Connection Map**: `AGENTS.md`, `docs/MAPA.md`, `docs/mapa.json`
5. **Specification Survey**: `.agents/teamwork/spec_miner_survey/handoff.md`

---

## 3. Tier 1: Feature Coverage Matrix (>=5 per Feature Group)

### Feature R1: Hybrid AI Hub & Resilient Fallback
*Contracts: `httpProvider.js`, `aiProvider.js`, `Settings.jsx`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R1-01 | `httpProvider` includes `Authorization: Bearer` when API key is set | `localStorage.setItem('nexomente_ai_http_api_key', 'sk-or-v1-test')`, `httpProvider.chat([{ role: 'user', content: 'Oi' }])` | Fetch request `headers` contains `'Authorization': 'Bearer sk-or-v1-test'`. |
| T1-R1-02 | `httpProvider` includes OpenRouter headers when URL matches openrouter | `baseUrl = 'https://openrouter.ai/api/v1'`, `httpProvider.chat(...)` | Fetch request contains `'HTTP-Referer': 'https://nexomente.app'` and `'X-Title': 'NexoMente'`. |
| T1-R1-03 | `httpProvider.checkStatus` parses models array from standard OpenAI endpoint | Response `{ data: [{ id: 'anthropic/claude-3.5-sonnet' }, { id: 'meta-llama/llama-3' }] }` | Returns `{ status: 'online', available: true, models: ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3'] }`. |
| T1-R1-04 | `aiProvider.chat` seamlessly falls back to `embedded` on HTTP error | `provider = 'http'`, `httpProvider.chat` throws HTTP 500 / 401 | Intercepts error, invokes `embedded.chat()`, returns success with `{ isFallback: true, fallbackFrom: 'http' }`. |
| T1-R1-05 | `Settings.jsx` loads and persists HTTP provider credentials | User inputs `http://localhost:11434/v1` and `sk-secret-123` in settings form | `localStorage.getItem('nexomente_ai_http_url') === 'http://localhost:11434/v1'` and `localStorage.getItem('nexomente_ai_http_api_key') === 'sk-secret-123'`. |

### Feature R2: Adaptive Socratic Tutor & State Machine
*Contracts: `socraticPrompts.js`, `AICopilotDrawer.jsx`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R2-01 | Socratic mode toggle in Copilot persists to storage | User clicks `[ 🎓 Tutor Socrático ]` button in header | `localStorage.getItem('nexomente_copilot_mode') === 'socratic'`. |
| T1-R2-02 | Socratic system prompt contains the 5 didactic phases | Inspect `SOCRATIC_SYSTEM_PROMPT` string | Prompt explicitly specifies Sondagem (Probing), Árvore Mínima (Minimal Tree 3-5), Passo Único (1 fato), Checagem Obrigatória (1 pergunta), and Reparo Imediato. |
| T1-R2-03 | Socratic single-step deduction enforcement | User asks: "Como funciona a mitocôndria e todo o ciclo de Krebs?" | Response focuses on exactly 1 deductive proposition (ATP generation baseline) ending with 1 verification question. |
| T1-R2-04 | Mandatory check-in verification terminal question | Assistant response text generated in Socratic mode | Response terminates with a check-in question mark `?` and asks student for their understanding or deduction. |
| T1-R2-05 | TTS audio state and Vosk speech recognition intact | Toggle Socratic mode while `ttsEnabled === true` and `selectedVoice === 'pt-BR-FranciscaNeural'` | Audio settings and voice subscription handlers remain intact without component re-mount loss. |

### Feature R3: Background FSRS Auto-Forge
*Contracts: `AICopilotDrawer.jsx`, `CopilotMessageContent.jsx`, `useFlashcards.js`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R3-01 | Declarative ```flashcard markdown block parsing | String with ```flashcard\nFrente: O que é mitocôndria?\nVerso: Organela que produz ATP.\n``` | Extractor returns `{ frente: 'O que é mitocôndria?', verso: 'Organela que produz ATP.' }`. |
| T1-R3-02 | Auto-forge invokes `useFlashcards().create()` | Copilot receives response containing verified ```flashcard block | `create` method called with `{ frente, verso, materia_id, nota_id }`. |
| T1-R3-03 | Celebratory toast notification dispatch | Successful creation of flashcard via Socratic block | `toast('💡 Conceito aprendido gravado nos Flashcards FSRS!', { icon: '🎓' })` triggered. |
| T1-R3-04 | Visual deck card renders in `CopilotMessageContent.jsx` | Message content contains ```flashcard block | Renders terracotta/gold styled container with "Flashcard FSRS Criado", Question, and Answer. |
| T1-R3-05 | Visual deck card copy button functionality | Click "Copiar" button on rendered flashcard | `navigator.clipboard.writeText` called with formatted question and answer. |

### Feature R4: Cosmic Graph 2D Canvas Viewer
*Contracts: `clusterGeometry.js`, `CosmicGraphCanvas.jsx`, `Graph.jsx`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R4-01 | Deterministic djb2 HSL cluster hue calculation | `getClusterHue('Biologia')` run multiple times across sessions | Consistently returns exact same integer between 0 and 359; different clusters (e.g. 'Física') yield different hues. |
| T1-R4-02 | Cluster hull geometry computation for point sets | Given 4 coordinates `[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]` | Returns convex boundary polygon points padded by configured margin. |
| T1-R4-03 | Native 2D Canvas high-DPR scaling | Canvas initialized with container width 800, height 600 on DPR=2 screen | `canvas.width === 1600`, `canvas.height === 1200`, `ctx.scale(2, 2)` executed. |
| T1-R4-04 | Zoom-gated label visibility thresholds | Camera zoom factor `k = 0.5` (zoomed out) vs `k = 1.2` (zoomed in) | At `k < 0.8`: galaxy/cluster titles visible, note titles suppressed. At `k >= 0.8`: note titles visible. |
| T1-R4-05 | Radiant gold Socratic star node highlighting | Node with `hasSocraticConcept: true` or `flashcardCount > 0` | Rendered with golden starlight halo gradient (`#F59E0B`) and star particle accent. |

### Feature R5: MAPA Synchronization & Release Quality
*Contracts: `docs/MAPA.md`, `docs/mapa.json`, `scripts/verificar-mapa.js`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R5-01 | `docs/mapa.json` catalog includes all new DLC modules | Check entries in `nos` and `hubs` for `socraticPrompts.js`, `clusterGeometry.js`, `CosmicGraphCanvas.jsx` | All files exist in `docs/mapa.json` with correct relative paths. |
| T1-R5-02 | `docs/MAPA.md` documents all new DLC components | Check markdown documentation in `docs/MAPA.md` | New nodes documented with connections, hooks, and IPC relations. |
| T1-R5-03 | `node scripts/verificar-mapa.js` passes with zero discrepancies | Run script in Node CLI | Exit code 0, "SUCESSO: O mapa de conexões está 100% sincronizado e íntegro!". |
| T1-R5-04 | Vitest automated test suite execution | Run `npx vitest run app/src/test/socraticDLC.test.js` | All test suites pass with 0 failures. |
| T1-R5-05 | Production build compilation | Run `npx vite build` | Exit code 0, zero transpilation or bundle errors. |

---

## 4. Tier 2: Boundary, Stress & Corner Cases Matrix (>=5 per Feature Group)

### Corner Cases R1: Hybrid AI Hub & Fallback
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R1-01 | HTTP 401 Unauthorized from external API | Remote server responds with `HTTP 401: Invalid API Key` | `httpProvider.chat` flags failure; `aiProvider` initiates silent fallback to `embedded` Gemma 4 without UI crash. |
| T2-R1-02 | Network Offline / DNS Failure | `fetch` throws `TypeError: Failed to fetch` or timeout (30s) | Immediate fallback to offline embedded model; user receives response generated by local Gemma 4. |
| T2-R1-03 | Non-standard or Malformed API Response Body | External API returns `{ choices: [] }` or empty string | Defensive parsing prevents `Cannot read properties of undefined`; triggers fallback or controlled error. |
| T2-R1-04 | Empty API Key with Bearer Config | `nexomente_ai_http_api_key` is `''` or whitespace only | Omits `Authorization: Bearer` header cleanly (allows unauthenticated local proxies like Ollama). |
| T2-R1-05 | Extreme Token Budget Boundary | Options with `max_tokens: 0`, `max_tokens: -1`, or `max_tokens: 999999` | Sanitized to safe minimum (1) or clamp to model ceiling without crashing. |

### Corner Cases R2: Socratic Pedagogical Machine
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R2-01 | Student gives completely wrong deduction | Student states: "A mitocôndria produz clorofila" | Immediate Repair: Tutor gently corrects misconception with simple counter-example; does NOT advance tree; asks new check-in. |
| T2-R2-02 | Student attempts to bypass pedagogy ("Me dê a resposta toda") | User requests full essay or test answer directly | Tutor politely declines bulk answer, grounds the first core axiom, and asks 1 check-in question. |
| T2-R2-03 | User sends empty or whitespace message | Input `""` or `"    "` | Copilot input button remains disabled; no API invocation dispatched. |
| T2-R2-04 | Rapid Mode Toggling Mid-Stream | User clicks `Assistente` then `Tutor Socrático` during active streaming | AbortController halts prior stream; prompt correctly resets to target mode without corrupting UI state. |
| T2-R2-05 | Vosk Audio Barge-in Collision | User speaks 3+ words while Neural TTS is actively speaking | Voice recognition triggers `stopSpeaking()`, immediately silencing TTS and capturing user input. |

### Corner Cases R3: FSRS Auto-Forge
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R3-01 | Malformed ```flashcard Block (Missing Front) | Block contains only `Verso: Resposta sem pergunta` | Regex parser ignores block; does NOT create corrupt card; renders fallback code block. |
| T2-R3-02 | Malformed ```flashcard Block (Missing Back) | Block contains only `Frente: Pergunta sem resposta` | Parser safely discards; does NOT invoke `useFlashcards().create()`. |
| T2-R3-03 | Multi-Card Output in Single Turn | Response contains 2 distinct ```flashcard blocks | Parser processes both valid cards iteratively, creating both in FSRS store with toast count feedback. |
| T2-R3-04 | Idempotent Session Re-render | Message history re-renders or drawer re-opened | Cards already created (`cardCreated: true`) are NOT duplicated in database. |
| T2-R3-05 | Socratic Dialogue with No Active Note Selected | `activeNoteId === null`, `activeMateriaId === null` | Card created with default `materia_id: 'Tutor Socrático'` and `nota_id: null` in global deck. |

### Corner Cases R4: Cosmic Graph 2D Canvas
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R4-01 | Empty Graph (0 notes in vault) | `nodes = []`, `edges = []` | Displays clean empty state ("Nenhum nó no campo de visão"); RAF loop halts with 0% CPU usage. |
| T2-R4-02 | Single Node Singularity | `nodes = [{ id: '1', label: 'Sol' }]` | Hull algorithm renders soft circular aura instead of crashing convex hull polygon calculation. |
| T2-R4-03 | Ultra-Dense Cluster (1000+ nodes) | 1,000 nodes clustered under one tag | Dirty-flag rendering and viewport culling prevent frame drops; non-visible labels skipped. |
| T2-R4-04 | Extreme Zoom In / Zoom Out | Camera zoom `k = 0.01` or `k = 50.0` | Math clamps prevent NaN transforms; labels smoothly fade out instead of text distortion. |
| T2-R4-05 | Rapid Canvas/Cytoscape Engine Switching | User clicks toggle 10 times consecutively | Previous RAF loops cancelled (`cancelAnimationFrame`); Cytoscape instances destroyed (`cy.destroy()`) without memory leaks. |

### Corner Cases R5: MAPA & Quality Integrity
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R5-01 | Orphaned / Missing File in mapa.json | A file listed in `mapa.json` is deleted from disk | `scripts/verificar-mapa.js` immediately detects discrepancy and exits with code 1. |
| T2-R5-02 | IPC Channel Mismatch | An IPC handler in `electron/ipc/` lacks entry in `mapa.json` | `scripts/verificar-mapa.js` fails with clear diff of unmapped channel. |
| T2-R5-03 | Corrupt JSON in mapa.json | Trailing comma or syntax error in `docs/mapa.json` | Script fails fast with JSON parsing error. |
| T2-R5-04 | JSDOM Canvas Mock Absence | `HTMLCanvasElement.prototype.getContext('2d')` missing | Test suite gracefully provides lightweight 2D context stub for headless environments. |
| T2-R5-05 | Non-ASCII and Special Character Cluster Names | Cluster named `Matemática & Física / Quântica 🚀` | djb2 hashing generates valid HSL hue (0-359) without NaN or string encoding errors. |

---

## 5. Tier 3: Cross-Feature Combinations (Pairwise Interaction Matrix)

| Pairwise ID | Modules Involved | Interaction Flow | Verified Contract |
|-------------|------------------|------------------|-------------------|
| T3-01 | **R1 (AI Hub) + R2 (Socratic)** | User in Socratic Mode -> HTTP provider fails with 429 Rate Limit -> Fallback to Gemma 4 | Socratic conversation continues seamlessly without losing the pedagogical stage or conversational context. |
| T3-02 | **R2 (Socratic) + R3 (FSRS Forge)** | Student masters single-step check-in -> Socratic prompt outputs ```flashcard -> Copilot intercepts and invokes `useFlashcards().create()` | SQLite/IndexedDB gains 1 new FSRS card with initial intervals; celebratory toast displayed. |
| T3-03 | **R3 (FSRS Forge) + R4 (Cosmic Graph)** | FSRS card created from Socratic dialogue -> Note receives `hasSocraticConcept: true` | In `CosmicGraphCanvas`, the corresponding note node transforms into a radiant golden star with starlight aura. |
| T3-04 | **R1 (AI Hub) + R3 (FSRS Forge)** | Fallback Gemma 4 generates Socratic answer with ```flashcard block | Interceptor parses block generated by local engine identically to cloud engine; card forged into FSRS. |
| T3-05 | **R2 (Socratic) + R4 (Cosmic Graph)** | User clicks "Explorar no Copiloto" from Cosmic Graph node inspector | Copilot opens with active note context pre-loaded into Socratic conversation history. |
| T3-06 | **R4 (Cosmic Graph) + R5 (MAPA)** | Cosmic Graph canvas and geometry modules registered in MAPA | `verificar-mapa.js` confirms bidirectional connection from `Graph.jsx` -> `CosmicGraphCanvas.jsx` -> `clusterGeometry.js`. |

---

## 6. Tier 4: Real-World Application Scenarios (End-to-End User Journeys)

### Journey E2E-01: Complete Socratic Discovery to FSRS Review & Cosmic Galaxy
**Scenario Objective**: Validate the entire learner lifecycle from cognitive confusion to mastery, automated spaced repetition scheduling, and visual galaxy map reflection.

1. **Step 1: Configuration**: Student navigates to Settings -> Inteligência Artificial. Configures external OpenRouter model (`anthropic/claude-3.5-sonnet`) with Bearer token.
2. **Step 2: Socratic Exploration**: Student opens Copilot Drawer via `Ctrl+J`, toggles mode to `🎓 Tutor Socrático`. Enters topic: *"Como funciona a geração de energia na respiração celular?"*.
3. **Step 3: Pedagogical Turn 1 (Probing & Anchor)**: Tutor anchors concept on Glycolysis, delivers 1 deductive axiom, and poses check-in: *"Onde ocorre a quebra inicial da glicose?"*.
4. **Step 4: Check-in Response**: Student answers correctly: *"No citoplasma"*.
5. **Step 5: Pedagogical Turn 2 & Mastery**: Tutor validates answer, advances 1 step to Krebs cycle in the mitochondria, and emits the verified proposition:
   ````markdown
   ```flashcard
   Frente: Onde ocorre a quebra inicial da glicose e qual organela processa o piruvato?
   Verso: A quebra inicial (glicólise) ocorre no citoplasma, e o piruvato é processado na mitocôndria.
   ```
   ````
6. **Step 6: Background Auto-Forge**: Copilot intercepts block, invokes `useFlashcards().create()`, displays `"💡 Conceito aprendido gravado nos Flashcards FSRS!"`, and renders the terracotta deck card with copy action.
7. **Step 7: Cosmic Graph Galaxy**: Student opens the Knowledge Graph (`/graph`). The view defaults to `🌌 Cósmico`. The cluster `Biologia Celular` glows with its deterministic HSL nebula; the note glows as a radiant golden star. Zooming out displays the galaxy title; zooming in reveals the note details.

### Journey E2E-02: Resilient Offline Continuity
**Scenario Objective**: Verify zero cognitive interruption when internet drops during active study.

1. **Step 1**: Student in Socratic session with HTTP provider active.
2. **Step 2**: WiFi disconnection occurs. Student sends answer.
3. **Step 3**: `httpProvider.chat()` fails with network timeout.
4. **Step 4**: `aiProvider.chat()` automatically delegates to local embedded Gemma 4 (`embeddedService.js`).
5. **Step 5**: Response arrives smoothly with `{ isFallback: true }`; student continues Socratic dialogue without interruption or data loss.

---

## 7. Execution Commands & Verification Protocols

```bash
# 1. Run the dedicated Socratic DLC test suite
npx vitest run app/src/test/socraticDLC.test.js

# 2. Run MAPA integrity validation
npm run mapa:check
# (or: node scripts/verificar-mapa.js)

# 3. Verify production compilation
npx vite build
```
