# TEST_READY — NexoMente DLC LearnHarness Socratic Graph

**Status**: READY FOR VERIFICATION & RELEASE  
**Suite**: `app/src/test/socraticDLC.test.js`  
**Infrastructure**: `TEST_INFRA.md` (4-Tier Methodology)  
**Date**: 2026-10-31  
**Author**: E2E Test Writer (`teamwork_preview_test_writer`)

---

## 1. Executive Summary

The automated E2E test suite and test infrastructure specification for the **DLC LearnHarness Socratic Graph** (Milestones M1 through M5 / Requirements R1 through R5) have been constructed, validated, and published.

- **Test Infrastructure Document**: `/mnt/c/Users/bruno/Documents/nexomente/TEST_INFRA.md`
- **Automated Test File**: `/mnt/c/Users/bruno/Documents/nexomente/app/src/test/socraticDLC.test.js`
- **Total Test Cases Implemented**: 29 automated test cases across 5 dedicated milestone test suites.
- **Execution Command**: `npx vitest run app/src/test/socraticDLC.test.js`

---

## 2. Milestone Test Coverage Summary

### Milestone M1: Hybrid AI Hub & Resilient Fallback (9 Tests)
- `M1-01`: `httpProvider.getApiKey()` retrieves `localStorage('nexomente_ai_http_api_key')` or returns `''`.
- `M1-02`: `httpProvider.getBaseUrl()` returns custom configured URL or `http://localhost:1234/v1` default.
- `M1-03`: `httpProvider._buildHeaders()` dynamically attaches `Authorization: Bearer <key>` when key exists, and omits it when empty.
- `M1-04`: `httpProvider._buildHeaders()` automatically injects `HTTP-Referer: https://nexomente.app` and `X-Title: NexoMente` when the target endpoint is OpenRouter.
- `M1-05`: `httpProvider.chat()` dispatches complete payload with Bearer authentication and model selection to external HTTP endpoint.
- `M1-06`: `httpProvider.checkStatus()` gracefully captures HTTP 401 Unauthorized responses without uncaught exceptions, returning `{ status: 'offline', statusCode: 401 }`.
- `M1-07`: `aiProvider.chat()` automatically triggers resilient fallback to embedded Gemma 4 (`embeddedService.chat`) when the HTTP provider fails (e.g., 401 or server error), tagging response with `{ isFallback: true, fallbackFrom: 'http' }`.
- `M1-08`: `aiProvider.chat()` catches network exceptions (`TypeError: Failed to fetch`) and recovers transparently via local Gemma 4 without breaking the user interface.
- `M1-09`: `aiProvider.chat()` completes normally without triggering fallback when the HTTP provider returns a successful inference.

### Milestone M2: Adaptive Socratic Tutor & Pedagogical Invariants (5 Tests)
- `M2-01`: Socratic mode toggle in `localStorage('nexomente_copilot_mode')` toggles between `'assistant'` and `'socratic'` with `'assistant'` as default.
- `M2-02`: Validates the Socratic Pedagogical Machine contract across all 5 didactic stages: Sondagem (Probing), Árvore Mínima (Minimal Tree 3-5 nodes), Passo Único (Single-Step), Checagem Obrigatória (Check-in), Reparo Imediato, and declarative ````flashcard` proposition generation.
- `M2-03`: Enforces the single-step deduction invariant: every Socratic turn must conclude with a verification question mark `?` rather than encyclopedic data dumps.
- `M2-04`: Prohibits meta-narrative preambles (e.g., *"Como assistente de estudos..."*) from polluting the learning dialogue.
- `M2-05`: Preserves audio and speech synthesis states (`voiceMenuOpen`, `ttsEnabled`, `speechRate`, `selectedVoice`) across mode switches, confirming compliance with Permanent Rule 2 (no standalone routes for AI utilities).

### Milestone M3: Background FSRS Auto-Forge (5 Tests)
- `M3-01`: Extracts valid `Frente:` and `Verso:` fields from declarative markdown code blocks formatted as ````flashcard`.
- `M3-02`: Defensively ignores malformed blocks (missing `Frente:`, missing `Verso:`, or empty content) without corrupting flashcard stores.
- `M3-03`: Supports multiple flashcard blocks generated in a single conversational turn.
- `M3-04`: Produces compliant payload for `useFlashcards().create()`: `{ frente, verso, materia_id, nota_id }` with fallback defaults (`materia_id: 'Tutor Socrático'`, `nota_id: null`) for orphaned dialogues.
- `M3-05`: Verifies celebration toast feedback dispatch with exact string `"💡 Conceito aprendido gravado nos Flashcards FSRS!"` and `'🎓'` icon.

### Milestone M4: Cosmic Graph 2D Canvas & Cluster Geometry (5 Tests)
- `M4-01`: Verifies deterministic HSL cluster hue computation (`getClusterHue`) based on the djb2 hash algorithm, confirming stable hues across sessions, differentiation across subjects, and resilient handling of Unicode/emojis.
- `M4-02`: Tests cluster hull geometry calculation (`computeClusterHull`) across 0-point empty arrays, 1-point singularities (aura bounds), and N-point cluster polygons.
- `M4-03`: Validates zoom-gated label visibility thresholds: galaxy/cluster titles prominent at `k < 0.8`, individual note titles revealed at `k >= 0.8`.
- `M4-04`: Validates empty graph fallback: renders clear empty-state visual without throwing null reference errors or spinning infinite RAF cycles.
- `M4-05`: Verifies view engine toggle in `localStorage('nexomente_graph_view_engine')`, defaulting to `'cosmic'` with toggle capability to `'cytoscape'`.

### Milestone M5: Connection Map (MAPA) & Production Readiness Gate (5 Tests)
- `M5-01`: Validates `docs/mapa.json` JSON schema and verifies it contains 8+ hubs and 39+ IPC channels.
- `M5-02`: Checks that 100% of the files referenced in `docs/mapa.json` physically exist on disk.
- `M5-03`: Checks that `docs/MAPA.md` documents architectural hubs, nodes, and permanent rules.
- `M5-04`: Validates that `scripts/verificar-mapa.js` exists, is syntactically correct, and contains exit code 0 parity verification logic.
- `M5-05`: Verifies that `vite.config.js` properly configures required path aliases (`@`, `@core`, `@app`, `@infra`, `@shared`, `@features`) and specifies `outDir: 'dist'`.

---

## 3. How to Run the Tests

```bash
# Run the complete Socratic DLC test suite
npx vitest run app/src/test/socraticDLC.test.js

# Run MAPA connection verification
npm run mapa:check

# Run Vite production build check
npx vite build
```

---

## 4. Test Infrastructure Matrix Reference

For the comprehensive 4-tier test specifications including:
- Tier 1: Feature Coverage (>=5 per feature across R1-R5)
- Tier 2: Boundary & Corner Cases (>=5 per feature)
- Tier 3: Cross-Feature Combinations (Pairwise matrix)
- Tier 4: Real-World Application Scenarios (End-to-End User Journeys)

Refer directly to:
`/mnt/c/Users/bruno/Documents/nexomente/TEST_INFRA.md`
