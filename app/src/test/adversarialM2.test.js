// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SOCRATIC_MODE_KEY,
  SOCRATIC_SYSTEM_PROMPT,
  isCompliantSocraticTurn,
  isCleanPedagogicalResponse,
  buildSocraticPrompt
} from '../lib/ai/socraticPrompts.js';

describe('Adversarial M2: Socratic Machine & LearnHarness Pedagogical Stress Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. SOCRATIC_SYSTEM_PROMPT Rigorous Contract & Pedagogical Invariants
  // -------------------------------------------------------------------------
  describe('1. SOCRATIC_SYSTEM_PROMPT Pedagogical Invariants', () => {
    it('enforces Stage 1: Sondagem (Probing) with diagnostic requirement', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/1\.\s*Sondagem\s*\(Probing\)/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/diagnóstico|compreensão atual|objetivo/i);
    });

    it('enforces Stage 2: Árvore Mínima (Minimal Tree) with 3 to 5 propositions', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/2\.\s*Árvore Mínima\s*\(Minimal Tree\)/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/3 a 5 proposições/i);
    });

    it('enforces Stage 3: Passo Único (Single-Step) with 1 new fact restriction', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/3\.\s*Passo Único\s*\(Single-Step\)/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/EXATAMENTE 1 fato novo/i);
    });

    it('enforces Stage 4: Checagem Obrigatória (Check-in) ending in question mark', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/4\.\s*Checagem Obrigatória\s*\(Check-in\)/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/rigorosamente com '\?'/i);
    });

    it('enforces Stage 5: Reparo Imediato de Erros before advancing', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/5\.\s*Reparo Imediato de Erros/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/NÃO avance para o próximo passo/i);
    });

    it('enforces strict prohibition of meta-narration preambles', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/PROIBIDA META-NARRAÇÃO/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Como assistente/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Sou um modelo/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Aqui está o resumo/i);
    });

    it('specifies declarative flashcard code block upon student mastery', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toContain('```flashcard');
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Frente:\s*<pergunta/i);
      expect(SOCRATIC_SYSTEM_PROMPT).toMatch(/Verso:\s*<explicação/i);
    });

    it('defines SOCRATIC_MODE_KEY as nexomente_copilot_mode', () => {
      expect(SOCRATIC_MODE_KEY).toBe('nexomente_copilot_mode');
    });
  });

  // -------------------------------------------------------------------------
  // 2. isCompliantSocraticTurn Edge Cases & Stress Harness
  // -------------------------------------------------------------------------
  describe('2. isCompliantSocraticTurn Edge Cases & Robustness', () => {
    it('accepts valid single question mark with and without trailing whitespace', () => {
      expect(isCompliantSocraticTurn('Qual é a função da ATP sintase?')).toBe(true);
      expect(isCompliantSocraticTurn('Qual é a função da ATP sintase?  \t ')).toBe(true);
      expect(isCompliantSocraticTurn('Qual é a função da ATP sintase?\n\n')).toBe(true);
      expect(isCompliantSocraticTurn('Qual é a função da ATP sintase?\r\n')).toBe(true);
    });

    it('accepts question marks enclosed in markdown italic, bold, and quotes', () => {
      expect(isCompliantSocraticTurn('Entendeu esse mecanismo?*')).toBe(true);
      expect(isCompliantSocraticTurn('Entendeu esse mecanismo?**')).toBe(true);
      expect(isCompliantSocraticTurn('O professor perguntou: "Qual o próximo passo?"')).toBe(true);
    });

    it('rejects declarative statements ending in period, exclamation, or ellipsis', () => {
      expect(isCompliantSocraticTurn('A mitocôndria produz ATP.')).toBe(false);
      expect(isCompliantSocraticTurn('Muito bem, você acertou!')).toBe(false);
      expect(isCompliantSocraticTurn('Vejamos o que acontece a seguir...')).toBe(false);
      expect(isCompliantSocraticTurn('A resposta correta é:')).toBe(false);
    });

    it('rejects questions placed earlier in text when response ends in statement', () => {
      expect(isCompliantSocraticTurn('Você sabe o que é ATP? Bem, é a molécula energética celular.')).toBe(false);
    });

    it('handles non-string, null, undefined, and empty inputs gracefully', () => {
      expect(isCompliantSocraticTurn(null)).toBe(false);
      expect(isCompliantSocraticTurn(undefined)).toBe(false);
      expect(isCompliantSocraticTurn('')).toBe(false);
      expect(isCompliantSocraticTurn('   ')).toBe(false);
      expect(isCompliantSocraticTurn(12345)).toBe(false);
      expect(isCompliantSocraticTurn({ text: 'pergunta?' })).toBe(false);
      expect(isCompliantSocraticTurn(['pergunta?'])).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. isCleanPedagogicalResponse Meta-Narration Defense
  // -------------------------------------------------------------------------
  describe('3. isCleanPedagogicalResponse Meta-Narration Filter', () => {
    it('rejects forbidden meta-narration preambles regardless of casing and spacing', () => {
      expect(isCleanPedagogicalResponse('Como assistente de IA, posso explicar...')).toBe(false);
      expect(isCleanPedagogicalResponse('como assistente virtual, recomendo...')).toBe(false);
      expect(isCleanPedagogicalResponse('  \n  Como assistente, vamos começar')).toBe(false);
      expect(isCleanPedagogicalResponse('Sou um modelo de linguagem treinado...')).toBe(false);
      expect(isCleanPedagogicalResponse('Olá! Como posso ajudar você hoje?')).toBe(false);
      expect(isCleanPedagogicalResponse('A pergunta refere-se ao conceito de...')).toBe(false);
    });

    it('allows genuine didactic responses containing words mid-sentence', () => {
      expect(isCleanPedagogicalResponse('Pense na organela como um assistente invisível que limpa resíduos.')).toBe(true);
      expect(isCleanPedagogicalResponse('Criamos um modelo mental para visualizar a membrana fosfolipídica.')).toBe(true);
      expect(isCleanPedagogicalResponse('Excelente dedução! Agora observe o gradiente de prótons.')).toBe(true);
    });

    it('handles invalid non-string inputs safely without throwing', () => {
      expect(isCleanPedagogicalResponse(null)).toBe(false);
      expect(isCleanPedagogicalResponse(undefined)).toBe(false);
      expect(isCleanPedagogicalResponse(42)).toBe(false);
      expect(isCleanPedagogicalResponse({})).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. buildSocraticPrompt Context Composition & Injection Safety
  // -------------------------------------------------------------------------
  describe('4. buildSocraticPrompt Context Composition', () => {
    it('returns canonical prompt unchanged when context is empty or absent', () => {
      expect(buildSocraticPrompt('')).toBe(SOCRATIC_SYSTEM_PROMPT);
      expect(buildSocraticPrompt(null)).toBe(SOCRATIC_SYSTEM_PROMPT);
      expect(buildSocraticPrompt(undefined)).toBe(SOCRATIC_SYSTEM_PROMPT);
    });

    it('appends vault context with explicit delimiter without modifying base prompt', () => {
      const snippet = 'Nota: Bioquímica celular - ATP sintase F0F1';
      const fullPrompt = buildSocraticPrompt(snippet);
      expect(fullPrompt.startsWith(SOCRATIC_SYSTEM_PROMPT)).toBe(true);
      expect(fullPrompt).toContain('[Contexto do Vault / Notas Ativas]:');
      expect(fullPrompt).toContain(snippet);
    });

    it('survives complex markdown context snippets (code, latex, tables)', () => {
      const complexSnippet = '```markdown\n# Equação\n$$E = mc^2$$\n| Elemento | Valor |\n|---|---|\n| C | 12 |\n```';
      const fullPrompt = buildSocraticPrompt(complexSnippet);
      expect(fullPrompt).toContain(complexSnippet);
      expect(fullPrompt).toContain(SOCRATIC_SYSTEM_PROMPT);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Multi-turn Dialogue Simulation & Socratic Flow
  // -------------------------------------------------------------------------
  describe('5. Socratic Dialogue Flow Simulation', () => {
    it('validates a complete 3-turn deductive chain with mastery and flashcard block', () => {
      const turn1 = 'A mitocôndria gera energia celular. Onde ocorre a quebra inicial da glicose?';
      const turn2 = 'Exato, no citosol! E como se chama esse primeiro processo de quebra da glicose?';
      const turn3 = `Perfeito! Você dominou o conceito de glicólise.

\`\`\`flashcard
Frente: Onde ocorre a glicólise e qual sua finalidade?
Verso: Ocorre no citosol celular, quebrando a glicose em duas moléculas de piruvato com saldo líquido de 2 ATPs.
\`\`\`

Para onde seguem essas moléculas de piruvato na presença de oxigênio?`;

      // Turn 1
      expect(isCleanPedagogicalResponse(turn1)).toBe(true);
      expect(isCompliantSocraticTurn(turn1)).toBe(true);

      // Turn 2
      expect(isCleanPedagogicalResponse(turn2)).toBe(true);
      expect(isCompliantSocraticTurn(turn2)).toBe(true);

      // Turn 3 (Mastery with Flashcard)
      expect(isCleanPedagogicalResponse(turn3)).toBe(true);
      expect(isCompliantSocraticTurn(turn3)).toBe(true);
      expect(turn3).toContain('```flashcard');
      expect(turn3).toContain('Frente:');
      expect(turn3).toContain('Verso:');
    });

    it('validates an immediate error repair turn without advancing tree', () => {
      const repairTurn = 'Atenção: o núcleo armazena o DNA, não a produção de ATP. Qual é a organela citoplasmática apelidada de "usina da célula"?';
      expect(isCleanPedagogicalResponse(repairTurn)).toBe(true);
      expect(isCompliantSocraticTurn(repairTurn)).toBe(true);
    });
  });
});
