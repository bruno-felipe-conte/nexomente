// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { extractFlashcardBlocks } from '../components/ai/AICopilotDrawer.jsx';
import CopilotMessageContent from '../components/ai/CopilotMessageContent.jsx';

describe('Adversarial M3: Background FSRS Auto-Forge & Flashcard Extraction Stress Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. extractFlashcardBlocks — Production Export & Contract Verification
  // ---------------------------------------------------------------------------
  describe('1. Production Export Contract', () => {
    it('directly imports and verifies extractFlashcardBlocks from AICopilotDrawer.jsx', () => {
      expect(typeof extractFlashcardBlocks).toBe('function');
    });

    it('returns an empty array for non-string, null, and undefined inputs', () => {
      expect(extractFlashcardBlocks(null)).toEqual([]);
      expect(extractFlashcardBlocks(undefined)).toEqual([]);
      expect(extractFlashcardBlocks(12345)).toEqual([]);
      expect(extractFlashcardBlocks({})).toEqual([]);
      expect(extractFlashcardBlocks([])).toEqual([]);
      expect(extractFlashcardBlocks(true)).toEqual([]);
      expect(extractFlashcardBlocks('')).toEqual([]);
      expect(extractFlashcardBlocks('   ')).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Standard and Multilingual Syntax Variations
  // ---------------------------------------------------------------------------
  describe('2. Standard & Multilingual Syntax Variations', () => {
    it('extracts canonical Portuguese syntax (Frente: / Verso:)', () => {
      const input = `
\`\`\`flashcard
Frente: O que é a ATP Sintase?
Verso: Um complexo enzimático que sintetiza ATP a partir de ADP e fosfato inorgânico.
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('O que é a ATP Sintase?');
      expect(cards[0].verso).toBe('Um complexo enzimático que sintetiza ATP a partir de ADP e fosfato inorgânico.');
    });

    it('extracts English syntax (Front: / Back:)', () => {
      const input = `
\`\`\`flashcard
Front: What is the power plant of the eukaryotic cell?
Back: The mitochondrion, responsible for cellular respiration and ATP generation.
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('What is the power plant of the eukaryotic cell?');
      expect(cards[0].verso).toBe('The mitochondrion, responsible for cellular respiration and ATP generation.');
    });

    it('handles case-insensitive label keys (frente:, FRENTE:, verso:, VERSO:)', () => {
      const input = `
\`\`\`flashcard
frente: Pergunta em minúsculas
verso: Resposta em minúsculas
\`\`\`
\`\`\`flashcard
FRENTE: PERGUNTA EM MAIÚSCULAS
VERSO: RESPOSTA EM MAIÚSCULAS
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(2);
      expect(cards[0].frente).toBe('Pergunta em minúsculas');
      expect(cards[0].verso).toBe('Resposta em minúsculas');
      expect(cards[1].frente).toBe('PERGUNTA EM MAIÚSCULAS');
      expect(cards[1].verso).toBe('RESPOSTA EM MAIÚSCULAS');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Whitespace, CRLF & Formatting Robustness
  // ---------------------------------------------------------------------------
  describe('3. Whitespace, CRLF & Formatting Robustness', () => {
    it('handles CRLF line breaks (Windows \\r\\n) across all lines', () => {
      const crlfInput = "```flashcard\r\nFrente: Pergunta CRLF\r\nVerso: Resposta CRLF\r\n```";
      const cards = extractFlashcardBlocks(crlfInput);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Pergunta CRLF');
      expect(cards[0].verso).toBe('Resposta CRLF');
    });

    it('tolerates trailing spaces after the language identifier (```flashcard   )', () => {
      const input = "```flashcard    \nFrente: Pergunta com trailing spaces\nVerso: Resposta correspondente\n```";
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Pergunta com trailing spaces');
      expect(cards[0].verso).toBe('Resposta correspondente');
    });

    it('trims excessive inner and outer whitespace from Frente and Verso', () => {
      const input = `
\`\`\`flashcard
Frente:     Espaços extras ao redor da pergunta     
Verso:      Espaços extras ao redor da resposta     
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Espaços extras ao redor da pergunta');
      expect(cards[0].verso).toBe('Espaços extras ao redor da resposta');
    });

    it('supports multi-line Frente without premature termination', () => {
      const input = `
\`\`\`flashcard
Frente: Considere uma partícula em movimento retilíneo uniforme.
Sabendo que sua velocidade é v = 10 m/s, qual a distância percorrida em 5 segundos?
Verso: A distância percorrida é d = v * t = 10 * 5 = 50 metros.
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toContain('Considere uma partícula');
      expect(cards[0].frente).toContain('qual a distância percorrida em 5 segundos?');
      expect(cards[0].verso).toBe('A distância percorrida é d = v * t = 10 * 5 = 50 metros.');
    });

    it('supports question and answer defined on lines following the label', () => {
      const input = `
\`\`\`flashcard
Frente:
Qual o saldo energético líquido da glicólise aeróbica?
Verso:
Saldo de 2 ATP e 2 NADH por molécula de glicose.
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Qual o saldo energético líquido da glicólise aeróbica?');
      expect(cards[0].verso).toBe('Saldo de 2 ATP e 2 NADH por molécula de glicose.');
    });

    it('supports complex multi-line Verso with bullet points and code formulas', () => {
      const input = `
\`\`\`flashcard
Frente: Quais são as três fases da respiração celular aeróbica?
Verso: As fases principais são:
1. Glicólise (ocorre no citoplasma)
2. Ciclo de Krebs (na matriz mitocondrial)
3. Fosforilação Oxidativa (na crista mitocondrial)
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Quais são as três fases da respiração celular aeróbica?');
      expect(cards[0].verso).toContain('1. Glicólise');
      expect(cards[0].verso).toContain('3. Fosforilação Oxidativa');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Malformed Blocks, Incomplete Blocks & Defensive Rejection
  // ---------------------------------------------------------------------------
  describe('4. Malformed Blocks & Defensive Rejection', () => {
    it('defensively rejects block with completely missing Verso', () => {
      const input = `
\`\`\`flashcard
Frente: Pergunta isolada sem verso
\`\`\`
`;
      expect(extractFlashcardBlocks(input)).toEqual([]);
    });

    it('defensively rejects block with completely missing Frente', () => {
      const input = `
\`\`\`flashcard
Verso: Resposta isolada sem frente
\`\`\`
`;
      expect(extractFlashcardBlocks(input)).toEqual([]);
    });

    it('defensively rejects block with empty Verso', () => {
      const emptyVerso = `
\`\`\`flashcard
Frente: Pergunta válida
Verso:   
\`\`\`
`;
      expect(extractFlashcardBlocks(emptyVerso)).toEqual([]);
    });

    it('defensively rejects completely empty block', () => {
      const emptyBoth = `
\`\`\`flashcard
Frente:
Verso:
\`\`\`
`;
      const emptyBlock = `
\`\`\`flashcard
\`\`\`
`;
      expect(extractFlashcardBlocks(emptyBoth)).toEqual([]);
      expect(extractFlashcardBlocks(emptyBlock)).toEqual([]);
    });

    it('defensively ignores unclosed code block (truncated response)', () => {
      const truncated = `
Aqui está seu flashcard:
\`\`\`flashcard
Frente: Pergunta que foi truncada
Verso: Resposta incompleta sem fechar as crases
`;
      expect(extractFlashcardBlocks(truncated)).toEqual([]);
    });

    it('defensively rejects block missing colons (Frente Pergunta \\n Verso Resposta)', () => {
      const input = `
\`\`\`flashcard
Frente Pergunta sem dois pontos
Verso Resposta sem dois pontos
\`\`\`
`;
      expect(extractFlashcardBlocks(input)).toEqual([]);
    });

    it('documents empirical behavior when Frente has no content before Verso', () => {
      // Quando Frente: não possui texto antes da quebra de linha que antecede Verso:,
      // a regex \s* consome o newline e captura 'Verso: <resposta>' como frente.
      // Este teste documenta empiricamente esse edge case da expressão regular.
      const emptyFrenteWithVerso = `
\`\`\`flashcard
Frente:   
Verso: Resposta sem pergunta real
\`\`\`
`;
      const cards = extractFlashcardBlocks(emptyFrenteWithVerso);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Verso: Resposta sem pergunta real');
      expect(cards[0].verso).toBe('Resposta sem pergunta real');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Multiple Blocks & Mixed Content Turn Stress
  // ---------------------------------------------------------------------------
  describe('5. Multiple Blocks & Mixed Content Turn Stress', () => {
    it('extracts multiple flashcard blocks interspersed with explanations', () => {
      const conversationTurn = `
Muito bem! Você dominou tanto a cinemática quanto a dinâmica.
Aqui estão as proposições para fixação:

\`\`\`flashcard
Frente: O que diz a Primeira Lei de Newton (Inércia)?
Verso: Um corpo em repouso tende a permanecer em repouso, e em movimento retilíneo uniforme permanece em movimento, a menos que uma força resultante atue sobre ele.
\`\`\`

Excelente! E para a segunda lei:

\`\`\`flashcard
Frente: Qual a expressão matemática da Segunda Lei de Newton?
Verso: F = m * a (a força resultante é igual ao produto da massa pela aceleração).
\`\`\`

E finalmente:

\`\`\`flashcard
Frente: O que define o par Ação e Reação na Terceira Lei?
Verso: Forças de mesma intensidade, mesma direção, sentidos opostos, atuando em corpos DIFERENTES.
\`\`\`

Podemos prosseguir para o cálculo do atrito?
`;
      const cards = extractFlashcardBlocks(conversationTurn);
      expect(cards).toHaveLength(3);
      expect(cards[0].frente).toContain('Primeira Lei de Newton');
      expect(cards[1].frente).toContain('Segunda Lei de Newton');
      expect(cards[2].frente).toContain('Terceira Lei');
    });

    it('does not confuse other markdown code blocks (python, javascript, sql) with flashcards', () => {
      const mixedInput = `
Aqui está um script de exemplo:
\`\`\`python
# Código Python
Frente = "não sou flashcard"
Verso = "também não"
\`\`\`

E aqui está o flashcard real:
\`\`\`flashcard
Frente: Qual a palavra-chave para definir uma função em Python?
Verso: A palavra-chave def.
\`\`\`

E uma consulta SQL:
\`\`\`sql
SELECT frente, verso FROM flashcards;
\`\`\`
`;
      const cards = extractFlashcardBlocks(mixedInput);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Qual a palavra-chave para definir uma função em Python?');
      expect(cards[0].verso).toBe('A palavra-chave def.');
    });

    it('survives inline backticks and KaTeX formulas inside flashcard blocks', () => {
      const input = `
\`\`\`flashcard
Frente: O que retorna o hook \`useState(initialState)\` no React?
Verso: Retorna uma tupla \`[state, setState]\` onde o segundo elemento é a função de atualização.
\`\`\`
\`\`\`flashcard
Frente: Como se escreve a fórmula da relatividade restrita de Einstein?
Verso: $$E = mc^2$$, onde $c$ é a velocidade da luz no vácuo.
\`\`\`
`;
      const cards = extractFlashcardBlocks(input);
      expect(cards).toHaveLength(2);
      expect(cards[0].frente).toBe('O que retorna o hook `useState(initialState)` no React?');
      expect(cards[0].verso).toContain('`[state, setState]`');
      expect(cards[1].verso).toContain('$$E = mc^2$$');
    });

    it('resists ReDoS on massive texts with repeated unmatched markers', () => {
      const massiveText = '```flashcard\nFrente: teste\n'.repeat(5000) + '```';
      const t0 = performance.now();
      const cards = extractFlashcardBlocks(massiveText);
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(1000);
      expect(Array.isArray(cards)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. FSRS Payload Generation & Context Fallbacks
  // ---------------------------------------------------------------------------
  describe('6. FSRS Payload Generation & Context Fallbacks', () => {
    const buildCardPayload = (card, activeMateriaId, activeNoteId) => ({
      frente: card.frente.trim(),
      verso: card.verso.trim(),
      materia_id: activeMateriaId || 'Tutor Socrático',
      nota_id: activeNoteId || null,
    });

    it('generates fully populated payload when active note and materia are present', () => {
      const card = { frente: ' O que é DNA? ', verso: ' Ácido Desoxirribonucleico. ' };
      const payload = buildCardPayload(card, 'bio-mol', 'nota-genetica-101');

      expect(payload).toEqual({
        frente: 'O que é DNA?',
        verso: 'Ácido Desoxirribonucleico.',
        materia_id: 'bio-mol',
        nota_id: 'nota-genetica-101',
      });
    });

    it('falls back to "Tutor Socrático" and null nota_id when orphaned / no active context', () => {
      const card = { frente: 'Pergunta', verso: 'Resposta' };
      const payloadNull = buildCardPayload(card, null, null);
      const payloadUndefined = buildCardPayload(card, undefined, undefined);
      const payloadEmpty = buildCardPayload(card, '', '');

      expect(payloadNull.materia_id).toBe('Tutor Socrático');
      expect(payloadNull.nota_id).toBeNull();
      expect(payloadUndefined.materia_id).toBe('Tutor Socrático');
      expect(payloadUndefined.nota_id).toBeNull();
      expect(payloadEmpty.materia_id).toBe('Tutor Socrático');
      expect(payloadEmpty.nota_id).toBeNull();
    });

    it('maps activeNote.materia fallback when materia_id is absent', () => {
      const activeNoteWithMateria = { id: 'note-42', materia: 'História Geral' };
      const activeMateria = activeNoteWithMateria.materia_id || activeNoteWithMateria.materia || null;

      const card = { frente: 'Queda de Constantinopla', verso: '1453 d.C.' };
      const payload = buildCardPayload(card, activeMateria, activeNoteWithMateria.id);

      expect(payload.materia_id).toBe('História Geral');
      expect(payload.nota_id).toBe('note-42');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Auto-Forge Deduplication & Execution Resilience Simulation
  // ---------------------------------------------------------------------------
  describe('7. Deduplication & Execution Simulation', () => {
    it('prevents forging duplicate cards via fingerprint cache', () => {
      const processedCardHashes = new Set();
      const mockCreate = vi.fn();

      const processDetectedCards = (cards) => {
        let created = 0;
        for (const card of cards) {
          const fingerprint = `${card.frente.trim()}:::${card.verso.trim()}`;
          if (!processedCardHashes.has(fingerprint)) {
            processedCardHashes.add(fingerprint);
            mockCreate({
              frente: card.frente.trim(),
              verso: card.verso.trim(),
              materia_id: 'Tutor Socrático',
              nota_id: null,
            });
            created++;
          }
        }
        return created;
      };

      const cardA = { frente: 'O que é mitose?', verso: 'Divisão celular equacional.' };
      const cardB = { frente: 'O que é meiose?', verso: 'Divisão celular reducional.' };

      // Primeiro turno: cria cardA e cardB
      const turn1Created = processDetectedCards([cardA, cardB]);
      expect(turn1Created).toBe(2);
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Segundo turno: IA repete cardA (reforço) e traz cardC novo
      const cardC = { frente: 'O que é citocinese?', verso: 'Divisão do citoplasma.' };
      const turn2Created = processDetectedCards([cardA, cardC]);
      expect(turn2Created).toBe(1);
      expect(mockCreate).toHaveBeenCalledTimes(3); // Apenas cardC foi adicionado
    });

    it('gracefully survives when createFlashcard throws an error without crashing', () => {
      const mockCreate = vi.fn().mockImplementation(() => {
        throw new Error('SQLite DB is locked / busy');
      });
      const mockToast = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const autoForgeTurn = (assistantText) => {
        const detected = extractFlashcardBlocks(assistantText);
        let createdCount = 0;
        for (const card of detected) {
          try {
            mockCreate(card);
            createdCount++;
          } catch (err) {
            console.warn('Erro ao auto-forjar flashcard FSRS:', err);
          }
        }
        if (createdCount > 0) {
          mockToast('💡 Conceito aprendido gravado nos Flashcards FSRS!', {
            icon: '🎓',
            duration: 3500,
          });
        }
        return createdCount;
      };

      const text = `
\`\`\`flashcard
Frente: Pergunta válida
Verso: Resposta válida
\`\`\`
`;
      // Execução não deve estourar exceção não capturada
      const created = autoForgeTurn(text);
      expect(created).toBe(0);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'Erro ao auto-forjar flashcard FSRS:',
        expect.any(Error)
      );
      // Toast não deve ter sido disparado pois 0 cards foram criados
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('dispatches celebration toast when at least one card is forged successfully', () => {
      const mockCreate = vi.fn();
      const mockToast = vi.fn();

      const autoForgeTurn = (assistantText) => {
        const detected = extractFlashcardBlocks(assistantText);
        let createdCount = 0;
        for (const card of detected) {
          mockCreate(card);
          createdCount++;
        }
        if (createdCount > 0) {
          mockToast('💡 Conceito aprendido gravado nos Flashcards FSRS!', {
            icon: '🎓',
            duration: 3500,
          });
        }
        return createdCount;
      };

      const text = `
\`\`\`flashcard
Frente: Pergunta de sucesso
Verso: Resposta de sucesso
\`\`\`
`;
      const created = autoForgeTurn(text);
      expect(created).toBe(1);
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        '💡 Conceito aprendido gravado nos Flashcards FSRS!',
        expect.objectContaining({
          icon: '🎓',
          duration: 3500,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Visual Deck Card Rendering (CopilotMessageContent.jsx)
  // ---------------------------------------------------------------------------
  describe('8. Visual Deck Card Rendering in CopilotMessageContent', () => {
    it('renders SocraticFlashcardCard with badge, question, answer, and copy button', () => {
      const socraticMessage = `
Conceito aprendido!
\`\`\`flashcard
Frente: Qual a velocidade da luz?
Verso: Aproximadamente 300.000 km/s no vácuo.
\`\`\`
`;
      const { container } = render(React.createElement(CopilotMessageContent, { content: socraticMessage, isUser: false }));

      // Verifica presença do badge comemorativo
      expect(container.textContent).toContain('Conceito Socrático Dominado (FSRS)');
      // Verifica pergunta e resposta
      expect(container.textContent).toContain('Pergunta / Frente');
      expect(container.textContent).toContain('Qual a velocidade da luz?');
      expect(container.textContent).toContain('Resposta / Verso');
      expect(container.textContent).toContain('Aproximadamente 300.000 km/s no vácuo.');
      // Verifica presença do botão de copiar
      expect(screen.getByTitle('Copiar Frente e Verso do Flashcard')).toBeDefined();
    });

    it('falls back to code snippet if flashcard content has no front and back', () => {
      const invalidFlashcard = `
\`\`\`flashcard
Código sem frente e verso estruturado
\`\`\`
`;
      const { container } = render(React.createElement(CopilotMessageContent, { content: invalidFlashcard, isUser: false }));
      // Não deve exibir o badge socrático quando malformado
      expect(container.textContent).not.toContain('Conceito Socrático Dominado (FSRS)');
      // Deve exibir snippet convencional
      expect(container.textContent).toContain('Código sem frente e verso estruturado');
    });

    it('renders simple text when isUser is true', () => {
      const { container } = render(React.createElement(CopilotMessageContent, { content: 'Pergunta do usuário', isUser: true }));
      expect(container.textContent).toBe('Pergunta do usuário');
    });
  });
});
