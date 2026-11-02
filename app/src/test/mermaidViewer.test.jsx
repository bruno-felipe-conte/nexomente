import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MermaidViewer, {
  CodeSnippet,
  getMermaidInstance,
  resetMermaidState,
} from '../components/ai/MermaidViewer';
import CopilotMessageContent from '../components/ai/CopilotMessageContent';
import {
  SOCRATIC_SYSTEM_PROMPT,
  isCompliantSocraticTurn,
  buildSocraticPrompt,
} from '../lib/ai/socraticPrompts';

// Mock do módulo mermaid dinâmico
let mockInitialize = vi.fn();
let mockRender = vi.fn(async (id, code) => {
  if (code.includes('INVALID_SYNTAX')) {
    // Simula elemento de erro injetado pelo Mermaid no DOM
    const dangling = document.createElement('div');
    dangling.id = 'dmermaid';
    dangling.textContent = 'Syntax error';
    document.body.appendChild(dangling);
    throw new Error('Parse error on line 2: unexpected token');
  }
  return {
    svg: `<svg id="${id}" class="mermaid-svg" viewBox="0 0 500 200"><g class="node"><rect width="120" height="40" fill="#1e293b" /><text fill="#f8fafc">Proposição A</text></g></svg>`,
  };
});

vi.mock('mermaid', () => ({
  default: {
    initialize: (...args) => mockInitialize(...args),
    render: (...args) => mockRender(...args),
  },
}));

describe('MermaidViewer & Socratic Deductive Flowcharts Test Suite (M2 / R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMermaidState();
    // Mock do clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    // Limpa eventuais nós criados no body
    const dangling = document.getElementById('dmermaid');
    if (dangling) dangling.remove();
  });

  // ---------------------------------------------------------------------------
  // 1. Renderização de SVG e Sanitização DOMPurify
  // ---------------------------------------------------------------------------
  describe('1. SVG Rendering & DOMPurify Sanitization', () => {
    it('renders valid Mermaid flowchart and mounts sanitized SVG into container', async () => {
      const sampleCode = `flowchart TD
        A[Oxidação da Glicose] --> B[Piruvato]
        classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
        class B current`;

      render(<MermaidViewer code={sampleCode} />);

      // Aguarda conclusão do dynamic import e renderização
      await waitFor(() => {
        expect(screen.getByTestId('mermaid-svg-container')).toBeDefined();
      });

      const container = screen.getByTestId('mermaid-svg-container');
      expect(container.innerHTML).toContain('mermaid-svg');
      expect(container.innerHTML).toContain('Proposição A');
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(mockRender.mock.calls[0][1]).toBe(sampleCode);
    });

    it('sanitizes malicious script injections in SVG string via DOMPurify', async () => {
      // Força o mock a retornar SVG com script malicioso
      mockRender.mockResolvedValueOnce({
        svg: `<svg viewBox="0 0 100 100"><script>window.__xss = true;</script><rect width="50" height="50" /></svg>`,
      });

      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-svg-container')).toBeDefined();
      });

      const container = screen.getByTestId('mermaid-svg-container');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('<rect');
    });

    it('handles empty or whitespace-only code with fallback gracefully', async () => {
      render(<MermaidViewer code="   " />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-fallback')).toBeDefined();
      });
      expect(screen.getByTestId('mermaid-error-badge')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Tema Escuro e Estilo Consistente com NexoMente (#0f172a)
  // ---------------------------------------------------------------------------
  describe('2. Dark Theme Visual Contract', () => {
    it('applies dark theme background (#0f172a), border and font-mono styles', async () => {
      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-viewer')).toBeDefined();
      });

      const viewer = screen.getByTestId('mermaid-viewer');
      expect(viewer.className).toContain('bg-[#0f172a]');
      expect(viewer.className).toContain('border-slate-800');
      expect(viewer.className).toContain('font-mono');
    });

    it('initializes Mermaid with dark theme configuration and suppressErrorRendering: true', async () => {
      await getMermaidInstance();

      expect(mockInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          themeVariables: expect.objectContaining({
            darkMode: true,
            background: '#0f172a',
          }),
          suppressErrorRendering: true,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Controles Interativos de Zoom e Drag-to-Pan
  // ---------------------------------------------------------------------------
  describe('3. Zoom & Pan Controls (0.5x to 2.5x)', () => {
    it('increments scale on zoom-in up to maximum 2.5x and disables button', async () => {
      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('100%');
      });

      const zoomInBtn = screen.getByTestId('zoom-in-btn');

      // Clica 6 vezes para ultrapassar 2.5x (100% + 6 * 25% = 250% = 2.5x)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(zoomInBtn);
      }

      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('250%');
      expect(zoomInBtn.disabled).toBe(true);

      // SVG container deve refletir scale(2.5)
      const svgContainer = screen.getByTestId('mermaid-svg-container');
      expect(svgContainer.style.transform).toContain('scale(2.5)');
    });

    it('decrements scale on zoom-out down to minimum 0.5x and disables button', async () => {
      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('100%');
      });

      const zoomOutBtn = screen.getByTestId('zoom-out-btn');

      // Clica 3 vezes (100% -> 75% -> 50% = 0.5x)
      fireEvent.click(zoomOutBtn);
      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('75%');

      fireEvent.click(zoomOutBtn);
      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('50%');
      expect(zoomOutBtn.disabled).toBe(true);

      const svgContainer = screen.getByTestId('mermaid-svg-container');
      expect(svgContainer.style.transform).toContain('scale(0.5)');
    });

    it('resets scale to 100% and pan to (0, 0) upon clicking reset button or double-clicking viewport', async () => {
      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-in-btn')).toBeDefined();
      });

      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('125%');

      // Clica em resetar
      const resetBtn = screen.getByTestId('zoom-reset-btn');
      fireEvent.click(resetBtn);

      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('100%');
      const svgContainer = screen.getByTestId('mermaid-svg-container');
      expect(svgContainer.style.transform).toBe('translate(0px, 0px) scale(1)');

      // Testa duplo clique no viewport
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('125%');

      const viewport = screen.getByTestId('mermaid-viewport');
      fireEvent.doubleClick(viewport);
      expect(screen.getByTestId('zoom-level-indicator').textContent).toBe('100%');
    });

    it('updates pan coordinates during drag-to-pan interaction', async () => {
      render(<MermaidViewer code="flowchart TD\n A-->B" />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-svg-container')).toBeDefined();
      });

      const viewport = screen.getByTestId('mermaid-viewport');

      // Inicia arrasto
      fireEvent.mouseDown(viewport, { button: 0, clientX: 100, clientY: 100 });
      // Move 50px em X e 30px em Y
      fireEvent.mouseMove(viewport, { clientX: 150, clientY: 130 });

      const svgContainer = screen.getByTestId('mermaid-svg-container');
      expect(svgContainer.style.transform).toContain('translate(50px, 30px)');

      // Solta o arrasto
      fireEvent.mouseUp(viewport);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Alternância de Código Raw e Cópia para Área de Transferência
  // ---------------------------------------------------------------------------
  describe('4. Raw Code Toggle & Clipboard Copying', () => {
    it('toggles between graphical diagram and raw code view', async () => {
      const code = 'flowchart LR\n A[Start] --> B[End]';
      render(<MermaidViewer code={code} />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-svg-container')).toBeDefined();
      });

      const toggleBtn = screen.getByTestId('toggle-code-btn');
      expect(toggleBtn.textContent).toContain('Código');

      // Alterna para código raw
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('raw-code-block').textContent).toContain('A[Start] --> B[End]');
      expect(toggleBtn.textContent).toContain('Diagrama');

      // Alterna de volta para diagrama
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('mermaid-svg-container')).toBeDefined();
    });

    it('copies raw Mermaid code to clipboard and shows tactile feedback', async () => {
      const code = 'flowchart TD\n X --> Y';
      render(<MermaidViewer code={code} />);

      await waitFor(() => {
        expect(screen.getByTestId('copy-code-btn')).toBeDefined();
      });

      const copyBtn = screen.getByTestId('copy-code-btn');
      expect(copyBtn.textContent).toContain('Copiar');

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code);
      expect(screen.getByText('Copiado!')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Fallback Gracioso em Erros de Sintaxe
  // ---------------------------------------------------------------------------
  describe('5. Graceful Fallback on Syntax Failure', () => {
    it('degrades to formatted CodeSnippet with non-blocking error badge on invalid syntax', async () => {
      const invalidCode = 'flowchart INVALID_SYNTAX [[[broken';

      render(<MermaidViewer code={invalidCode} />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-fallback')).toBeDefined();
      });

      // Verifica presença do CodeSnippet
      expect(screen.getByTestId('mermaid-code-snippet')).toBeDefined();
      // Verifica presença do badge não-bloqueante
      const badge = screen.getByTestId('mermaid-error-badge');
      expect(badge.textContent).toMatch(/sintaxe/i);

      // Verifica que o código original está legível
      expect(screen.getByText(invalidCode)).toBeDefined();

      // Verifica que elemento parasita #dmermaid foi removido
      expect(document.getElementById('dmermaid')).toBeNull();
    });

    it('CodeSnippet copy button works in error fallback view', async () => {
      const invalidCode = 'flowchart INVALID_SYNTAX [[[broken';

      render(<MermaidViewer code={invalidCode} />);

      await waitFor(() => {
        expect(screen.getByTestId('snippet-copy-btn')).toBeDefined();
      });

      const copyBtn = screen.getByTestId('snippet-copy-btn');
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(invalidCode);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Validação do Prompt Socrático com Mermaid (R2 Invariants)
  // ---------------------------------------------------------------------------
  describe('6. Socratic System Prompt & LearnHarness Invariants with Mermaid', () => {
    it('contains Mermaid flowchart instructions with flowchart TD/LR support', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/DIAGRAMAS E FLUXOGRAMAS CONCEITUAIS \(MERMAID\)/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/flowchart TD|flowchart LR/i);
    });

    it('instructs explicit highlight for the current step with classDef current', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toContain(
        'classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px; class N current'
      );
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Você está aqui/i);
    });

    it('strictly enforces placing Mermaid block BEFORE the final check-in question', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/ANTES da pergunta final de checagem/i);
    });

    it('confirms isCompliantSocraticTurn accepts a Socratic turn with Mermaid diagram and trailing question', () => {
      const socraticTurnWithDiagram = `Muito bem! Observe a hierarquia dos conceitos até agora:

\`\`\`mermaid
flowchart TD
  A[Glicose no citosol] --> B[2 Piruvatos gerados]
  classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
  class B current
\`\`\`

Qual organela celular receberá esse piruvato na presença de oxigênio?`;

      expect(isCompliantSocraticTurn(socraticTurnWithDiagram)).toBe(true);
    });

    it('confirms isCompliantSocraticTurn rejects a turn if Mermaid diagram was wrongly placed at the end', () => {
      const invalidEndingTurn = `Aqui está o diagrama:

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\``;

      expect(isCompliantSocraticTurn(invalidEndingTurn)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Integração CopilotMessageContent com Blocos Mermaid
  // ---------------------------------------------------------------------------
  describe('7. CopilotMessageContent Routing with Mermaid Blocks', () => {
    it('routes ```mermaid blocks to MermaidViewer while rendering surrounding text', async () => {
      const messageContent = `Olá! Vamos estruturar o seu raciocínio.

\`\`\`mermaid
flowchart TD
  A[Fotossíntese] --> B[Clorofila]
  classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
  class B current
\`\`\`

Qual comprimento de onda da luz a clorofila absorve com maior eficácia?`;

      render(<CopilotMessageContent content={messageContent} />);

      // Verifica texto ao redor
      expect(screen.getByText(/Vamos estruturar o seu raciocínio/i)).toBeDefined();
      expect(screen.getByText(/Qual comprimento de onda/i)).toBeDefined();

      // Verifica que o MermaidViewer foi montado para o bloco
      await waitFor(() => {
        expect(screen.getByTestId('mermaid-viewer')).toBeDefined();
      });
    });
  });
});
