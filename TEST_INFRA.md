# Test Infrastructure Architecture & 4-Tier Test Matrix
## NexoMente Core Enhancements: Auto-Tagging, Socratic Mermaid, Neural TTS & MAPA (R1 - R4)

**Document Version**: 1.0.0  
**Target Environment**: Vitest + JSDOM + MSW + Electron IPC Mock  
**Integrity Mode**: Production / Development Strict  
**Author**: E2E Test Writer (`test_writer_e2e`)

---

## 1. Test Architecture & Methodology Overview

This test infrastructure implements a rigorous 4-tier testing hierarchy to guarantee the architectural stability, pedagogical efficacy, and algorithmic correctness of the **NexoMente Core Enhancements** (R1 - R4) across both browser (SQLite WASM) and desktop (Electron) execution environments:

```
+-------------------------------------------------------------------------------+
|                 Tier 4: Real-World Application Scenarios                     |
|  - Complete Study Session: Note -> Auto-Tag -> Socratic Mermaid -> Voice TTS   |
|  - Offline-to-Online Resilience: Disconnect -> Enqueue -> Reconnect -> Drain  |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 3: Cross-Feature Combinations (Pairwise)                 |
|  - Auto-Tagging Note Context + Socratic Mermaid Interactive Tutoring          |
|  - Socratic Mermaid Step Highlight + Neural TTS Voice Explanation Playback    |
|  - Offline Note Queueing + Voice Selection Persistence + Background Auto-Drain|
|  - Socratic Check-in Turn + Flashcard Auto-Forge + Tagging Integration        |
|  - Mermaid Syntax Error Code Fallback + Audio Synthesis Continuity           |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 2: Boundary & Corner Cases (Stress & Faults)             |
|  - Empty / Whitespace Notes (<10 chars) Suppression of Tag Generation         |
|  - Tag Sanitization: Non-ASCII, Accents, Emoji, Punctuation Normalization     |
|  - Huge Mermaid Flowcharts (50+ nodes) & Deep Subgraphs Rendering Stability   |
|  - Corrupted / Malformed Mermaid Syntax Graceful CodeSnippet Degradation      |
|  - Malicious SVG / Script Injection Neutralization via DOMPurify              |
|  - Unknown / Stale TTS Voice Graceful Fallback to Francisca                   |
|  - Offline-to-Online Rapid Flapping & AsyncMutex Reentrancy Prevention        |
|  - MAPA Discrepancy Detection: Missing Files or Unregistered IPC Channels     |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                 Tier 1: Feature Coverage (Happy Path & Contracts)             |
|  - R1: Cloud Auto-Tagging (Gemini/Groq/OpenRouter), Persistent Queue, Toast   |
|  - R2: Socratic Prompt Tree, Mermaid SVG Rendering, "Você está aqui", Zoom   |
|  - R3: 9 Brazilian Neural Voices, Preview Audio, Persistence, Endpoint Parity |
|  - R4: MAPA Parity (100% Files & IPC Channels), verificar-mapa.js, Zero-Error |
+-------------------------------------------------------------------------------+
```

---

## 2. Authoritative Output Derivation Sources

Every expected value, contract, and assertion in this test matrix is derived from explicit authoritative specifications:
1. **Original User Request**: `.agents/teamwork/ORIGINAL_REQUEST.md` (Requirements R1, R2, R3, R4)
2. **Project Contract Manifest**: `PROJECT.md` (§ Feature Inventory, § Interface Contracts, § Code Layout)
3. **Architectural Constitution**: `AGENTS.md` (Constituição de Engenharia & Diretrizes UI/UX)
4. **Architectural Connection Map**: `docs/MAPA.md` and `docs/mapa.json` (verified via `scripts/verificar-mapa.js`)
5. **Explorer Survey Reports**:
   - `.agents/teamwork/explorer_survey_1/handoff.md` (Auto-tagging & Queue Contracts)
   - `.agents/teamwork/explorer_survey_2/handoff.md` (Mermaid.js & Socratic Contracts)
   - `.agents/teamwork/explorer_survey_3/handoff.md` (Neural TTS & Voice Parity Contracts)

---

## 3. Tier 1: Feature Coverage Matrix (>=5 per Feature Group)

### Feature R1: Intelligent Note Auto-Tagging & Persistent Background Queue
*Contracts: `tagQueueService.js`, `tagsQueueRepo.js`, `wasmEngine.js`, `useNotes.js`, `useNotaEditor.js`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R1-01 | Cloud AI immediate note auto-tagging when online | `aiProvider` active with online provider (`http`), network online, note created with title "Fotossíntese" and rich botanical content | Invokes AI auto-tagging, generates up to 6 semantic tags (e.g., `["fotossintese", "cloroplasto", "botanica"]`), merges into note record. |
| T1-R1-02 | Silent toast notification on successful auto-tagging | Note successfully auto-tagged via background service | Emits `react-hot-toast` toast with message `🏷️ Tags automáticas adicionadas` and subtle styling. |
| T1-R1-03 | Offline note creation enqueues into `tags_queue` | Local engine active (`embedded`) or `navigator.onLine === false` | Inserts note ID into `tags_queue` SQLite WASM table without blocking UI thread or invoking heavy local LLM. |
| T1-R1-04 | Background queue auto-drain on provider switch to online | `tags_queue` contains pending notes; user switches provider to `http` (`useAIStore.setProvider('http')`) | Automatically drains pending queue items sequentially, calls AI, applies tags, and removes from `tags_queue`. |
| T1-R1-05 | Serialized drain execution with `AsyncMutex` and rate limiting | Multiple drain triggers fired simultaneously (e.g. network reconnection + window online event) | Single execution stream enforced via `AsyncMutex` or `isDraining` guard; >=250ms spacing between batch items to prevent HTTP 429 rate limits. |

### Feature R2: Pedagogical Mermaid Diagrams in Socratic Tutor
*Contracts: `socraticPrompts.js`, `MermaidViewer.jsx`, `CopilotMessageContent.jsx`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T2-R2-01 | Socratic prompt instructs Mermaid flowchart with current step highlight | Inspect `SOCRATIC_SYSTEM_PROMPT` in `socraticPrompts.js` | Prompt specifies emitting ````mermaid deductive reasoning flowcharts with current node highlighted via `classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px; class N current`. |
| T2-R2-02 | Message renderer intercepts `lang === 'mermaid'` and mounts `MermaidViewer` | Content with ````mermaid\nflowchart TD\nA[Origem] --> B[Destino]\n```` | `CopilotMessageContent.jsx` renders `<MermaidViewer code="..." />` instead of plain text code block. |
| T2-R2-03 | Dark theme SVG rendering matching NexoMente UI | Valid Mermaid code rendered into SVG | Container applies `#0f172a` (slate-950) dark background, rounded subtle border, and monospace font styling. |
| T2-R2-04 | Interactive zoom controls and copy code button | Click zoom in (+), zoom out (-), reset (1x), and "Copiar código" | Zoom scale updates within [0.5x, 2.5x] bounds; clipboard API receives raw diagram syntax with confirmation feedback. |
| T2-R2-05 | Graceful fallback on syntax error to `<CodeSnippet>` | Malformed Mermaid syntax (e.g. unclosed brackets `flowchart TD\nA[-->B`) | Catches error, renders formatted `<CodeSnippet language="mermaid" />` with non-blocking error badge without crashing Copilot window. |

### Feature R3: Expanded Brazilian Edge TTS Neural Voices (9 Voices)
*Contracts: `neuralTTS.js`, `AICopilotDrawer.jsx`, `vite.config.js`, `audioHandlers.js`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R3-01 | Complete 9 Brazilian neural voice catalog registration | Inspect `NEURAL_VOICES` array in `neuralTTS.js` | Contains all 9 voices: Francisca, Antonio, ThalitaMultilingual, Manuela, Nicolau, Brenda, Donato, Elza, Fabio. |
| T1-R3-02 | FabioNeural alias correction | Check `VOICE_ALIAS_MAP` for `'pt-BR-FabioNeural'` | FabioNeural maps to itself or resolves natively; does NOT alias to Francisca. |
| T1-R3-03 | Sample audio preview button in voice selector | User clicks sample preview button on any voice in `AICopilotDrawer.jsx` | Invokes `neuralTTS.speak(sampleText, { voice: v.id, messageId: 'preview-' + v.id })` with play/stop toggle state. |
| T1-R3-04 | Persistent voice selection in `localStorage` | Select voice e.g. `pt-BR-DonatoNeural` and re-mount drawer | `localStorage.getItem('nexomente_copilot_voice') === 'pt-BR-DonatoNeural'` and initializes without fallback reset. |
| T1-R3-05 | Backend dev server and Electron IPC voice parity | Post `/api/tts/synthesize` or IPC `audio:synthesizeSpeech` with any of the 9 voice IDs | Successfully recognized as valid voice without fallback to Francisca. |

### Feature R4: Architectural Parity, MAPA Synchronization & Build Integrity
*Contracts: `docs/MAPA.md`, `docs/mapa.json`, `scripts/verificar-mapa.js`*

| Test ID | Test Case Name | Input / Condition | Authoritative Expected Output |
|---------|----------------|-------------------|--------------------------------|
| T1-R4-01 | All new components registered in `docs/mapa.json` | Verify `tagsQueueRepo.js`, `tagQueueService.js`, `MermaidViewer.jsx` in `docs/mapa.json` | All new files present in the map catalog with valid existing paths. |
| T1-R4-02 | `docs/MAPA.md` documents new modules and connections | Inspect `docs/MAPA.md` for R1-R4 architecture | All modules and hooks clearly documented with architectural relationships. |
| T1-R4-03 | `node scripts/verificar-mapa.js` passes with 100% success | Execute verification script | Returns Exit Code 0 with "✨ SUCESSO: O mapa de conexões está 100% sincronizado e íntegro!". |
| T1-R4-04 | IPC channel parity between Electron and MAPA | Compare `electron/ipc/` registered handlers with `docs/mapa.json` | 100% parity across all 39+ IPC channels. |
| T1-R4-05 | Clean production compilation without errors | Run `npx vite build` | Exit Code 0, dist bundle successfully created with 0 errors. |

---

## 4. Tier 2: Boundary, Stress & Corner Cases Matrix (>=5 per Feature Group)

### Corner Cases R1: Auto-Tagging & Queue Resilience
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R1-01 | Empty or Minimal Note Content | Note title and content combined < 10 characters (e.g. "Oi") | Auto-tagging safely skips execution; no wasteful AI calls or hallucinations. |
| T2-R1-02 | Tag Sanitization & Special Characters | AI returns tags with accents, spaces, uppercase: `["Inteligência Artificial", "C++", "Criação de #Tags!"]` | Normalizes to lowercase kebab-case `["inteligencia-artificial", "c", "criacao-de-tags"]`. |
| T2-R1-03 | Offline-to-Online Rapid Flapping | Online/offline events fired rapidly in 50ms succession | Mutex lock serializes drain execution; only one active worker drains queue. |
| T2-R1-04 | Database Lock / Concurrency Retry | SQLite database busy during background tag write | Handles retry with exponential backoff; does not crash UI thread. |
| T2-R1-05 | Queue Overflow Boundary | 500+ notes enqueued while offline for days | Batch drain processes in chunks (e.g. limit 10 per step) with UI responsiveness preserved. |

### Corner Cases R2: Socratic Mermaid Viewer
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R2-01 | Huge Mermaid Flowchart | Diagram with 50+ nodes and dense connections | Renders without crashing; pan/zoom allows full navigation; bounding box scales properly. |
| T2-R2-02 | Malicious SVG / Script Injection | Diagram label containing `<script>alert('xss')</script>` or `onload="malicious()"` | DOMPurify strips unsafe tags and event attributes; safe SVG rendered. |
| T2-R2-03 | Corrupted / Truncated Mermaid Syntax | Incomplete markdown block `flowchart TD\nA[Incompleto` | Degrades gracefully to formatted `<CodeSnippet>` with error badge; no uncaught exception. |
| T2-R2-04 | Multiple Mermaid Blocks in Single Turn | Response containing 2 distinct ````mermaid blocks | Both diagrams rendered as independent, isolated viewers with their own zoom/pan states. |
| T2-R2-05 | Socratic Pedagogical Check-in Invariant with Mermaid | Socratic response includes diagram followed by text | Diagram placed before final check-in question; response still ends with `?` fulfilling `isCompliantSocraticTurn`. |

### Corner Cases R3: Edge TTS Voices
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R3-01 | Stale / Unknown Voice Identifier in Storage | `localStorage` contains `'pt-BR-VozInexistente'` | Resiliently falls back to default `pt-BR-FranciscaNeural`. |
| T2-R3-02 | Empty or Whitespace Speech Text | `neuralTTS.speak("   ")` | Returns immediately without triggering network request or throwing exception. |
| T2-R3-03 | Network Synthesis Timeout | Backend synthesis exceeds timeout (5000ms) | Falls back gracefully to Web Speech API or rejects gracefully without unhandled promise rejection. |
| T2-R3-04 | Rapid Concurrent Speech Invocations | User clicks speech button on multiple messages in rapid succession | Cancels previous audio playback (`stop()`) before initiating new synthesis stream; zero audio overlap. |
| T2-R3-05 | Voice Sample Preview Interruption | User starts preview of Antonio and immediately clicks preview of Thalita | Previous preview audio is halted; new preview starts smoothly. |

### Corner Cases R4: MAPA & System Parity
| Test ID | Scenario | Stress Input / Corner Condition | Required System Behavior |
|---------|----------|---------------------------------|--------------------------|
| T2-R4-01 | Missing File Detection in MAPA | A registered file is temporarily missing or misnamed | `scripts/verificar-mapa.js` exits with non-zero exit code, pinpointing missing file. |
| T2-R4-02 | Unregistered IPC Channel Detection | An IPC channel is present in code but missing in `mapa.json` | Verification script fails, alerting developer to update map documentation. |
| T2-R4-03 | Non-ASCII Path Handling | Paths or identifiers with special characters | Script verifies accurately without regex or path parsing bugs. |
| T2-R4-04 | Clean Map Validation | All files and channels synchronized | Script exits with 0 and prints full integrity confirmation. |
| T2-R4-05 | Build Warning / Chunk Size Control | Build with lazy dynamic import of Mermaid | Mermaid split into separate lazy chunk; main bundle avoids critical size blowout. |

---

## 5. Tier 3: Cross-Feature Combinations (Pairwise Interaction Matrix)

| Pairwise ID | Modules Involved | Interaction Flow | Verified Contract |
|-------------|------------------|------------------|-------------------|
| T3-01 | **R1 (Auto-Tag) + R2 (Socratic Mermaid)** | Note auto-tagged with semantic tags (e.g. `bioquimica`, `respiracao`) -> User opens Socratic Tutor with note attached | Socratic Tutor prompt ingests note tags & content; emits tailored Mermaid flowchart representing concept tree with current step highlighted. |
| T3-02 | **R2 (Socratic Mermaid) + R3 (Edge TTS)** | Socratic Tutor generates response with concept text and Mermaid flowchart -> User clicks TTS listen | Neural TTS synthesizes the pedagogical explanation using selected Brazilian voice; Mermaid diagram remains fully interactive with pan/zoom during playback. |
| T3-03 | **R1 (Auto-Tag) + R3 (Edge TTS)** | User creates note offline -> Queued in `tags_queue` -> Voice selection persisted -> Online restored -> Drain runs while voice preview plays | Background drain executes concurrently without stalling or interrupting audio playback; toast notification appears smoothly. |
| T3-04 | **R2 (Socratic Mermaid) + R1 (Auto-Tag)** | Socratic Tutor session concludes with mastery -> Emits flashcard and concept summary -> Concept summary saved as note | Auto-tagging immediately tags newly saved summary note with consistent conceptual tags. |
| T3-05 | **R2 (Mermaid Error) + R3 (Edge TTS)** | Copilot response has malformed Mermaid block -> Falls back to `<CodeSnippet>` -> User plays audio | Code snippet renders cleanly with warning badge; audio plays explanation text without interference from the Mermaid error. |

---

## 6. Tier 4: Real-World Application Scenarios (End-to-End User Journeys)

### Journey E2E-01: Complete Pedagogical Study Session
**Scenario Objective**: Validate the full student workflow: note creation with cloud auto-tagging, interactive Socratic tutoring with dynamic Mermaid concept tree ("Você está aqui"), diagram manipulation, and voice audio review with selected Brazilian neural voice.

1. **Step 1: Note Creation & Auto-Tagging**:
   - Student creates note on *"Ciclo de Krebs e Fosforilação Oxidativa"*.
   - Online AI generates 4 tags: `["bioquimica", "respiracao-celular", "ciclo-de-krebs", "mitocondria"]`.
   - Tags saved to SQLite WASM; toast `🏷️ Tags automáticas adicionadas` displayed.
2. **Step 2: Socratic Exploration**:
   - Student clicks *"Tutor Socrático"* in Copilot Drawer with note attached.
   - Student asks: *"Por que o ciclo de Krebs precisa de oxigênio se ele não consome O2 diretamente?"*.
3. **Step 3: Mermaid Diagram & Socratic Step**:
   - Tutor generates response with deductive reasoning flowchart in Mermaid:
     - Root: `Glicólise (Citoplasma)`
     - Step 2: `Piruvato -> Acetil-CoA`
     - Step 3 [Highlighted]: `Ciclo do Ácido Cítrico (Matriz Mitocondrial)` ("Você está aqui" via `classDef current`)
     - Step 4: `Cadeia Transportadora de Elétrons`
   - Closes with check-in question: *"O que aconteceria com os carreadores NADH e FADH2 se a cadeia respiratória parasse?"*.
4. **Step 4: Diagram Interaction**:
   - Student zooms into Step 3 node (scale 1.5x), copies Mermaid source code.
5. **Step 5: Voice Audio Review**:
   - Student selects `pt-BR-AntonioNeural` (Didático e formal) from voice selector.
   - Previews voice sample.
   - Listens to tutor explanation via neural Edge TTS.
6. **Step 6: Socratic Turn Mastery & Flashcard Generation**:
   - Student answers check-in correctly.
   - Tutor validates and generates ````flashcard block.

### Journey E2E-02: Offline-to-Online Resilience & Recovery
**Scenario Objective**: Validate uninterrupted learning when internet drops: notes enqueued offline with 0 CPU waste, Socratic diagrams rendered locally, and seamless background drain when network reconnects.

1. **Step 1: Offline Study Session**:
   - Network goes offline (`navigator.onLine = false`).
   - Student creates 3 study notes: *"Termodinâmica"*, *"Entropia"*, *"Segunda Lei"*.
2. **Step 2: Queue Verification**:
   - All 3 note IDs persisted to `tags_queue` in SQLite WASM.
   - UI remains snappy (0 CPU wasted on local heavy models).
3. **Step 3: Local Socratic Study**:
   - Student continues Socratic dialogue; tutor displays structured diagrams.
4. **Step 4: Network Reconnection**:
   - Network connectivity restored (`window.dispatchEvent(new Event('online'))`).
5. **Step 5: Automated Non-Blocking Drain**:
   - `tagQueueService.drainQueue()` acquires mutex lock.
   - Processes notes with >=250ms rate-limiting.
   - Generates and applies tags to all 3 notes in SQLite database.
   - Queue count reaches 0.
   - Toast notification `🏷️ Tags automáticas adicionadas` confirms completion.

---

## 7. Execution Commands & Verification Protocols

```bash
# 1. Run the entire E2E test suite across all 4 tiers
npx vitest run app/src/test/e2e/

# 2. Run specific tier suites
npx vitest run app/src/test/e2e/tier1_featureCoverage.test.jsx
npx vitest run app/src/test/e2e/tier2_boundaryStress.test.jsx
npx vitest run app/src/test/e2e/tier3_pairwiseCombinations.test.jsx
npx vitest run app/src/test/e2e/tier4_realWorldScenarios.test.jsx

# 3. Verify Connection Map (MAPA) synchronization
node scripts/verificar-mapa.js

# 4. Verify clean Vite production compilation
npx vite build
```
