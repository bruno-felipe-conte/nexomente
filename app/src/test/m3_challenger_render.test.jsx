import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CopilotMessageContent from '../components/ai/CopilotMessageContent';

describe('Empirical Challenger: SocraticFlashcardCard Visual Rendering & Interactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders SocraticFlashcardCard with deck styling, amber badge, and separated Frente/Verso', () => {
    const content = `Aqui está o conceito dominado:
\`\`\`flashcard
Frente: O que é o gradiente eletroquímico?
Verso: É a combinação do gradiente químico de concentração e do gradiente elétrico de potencial através de uma membrana.
\`\`\`
Continue assim!`;

    const { container } = render(<CopilotMessageContent content={content} />);

    // 1. Badge verification
    const badge = screen.getByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i);
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('text-amber-300');

    // 2. Deck styling verification
    const cardContainer = badge.closest('.rounded-xl');
    expect(cardContainer).toBeTruthy();
    expect(cardContainer.className).toContain('border-amber-500/40');
    expect(cardContainer.className).toContain('bg-gradient-to-br');
    expect(cardContainer.className).toContain('shadow-lg');

    // 3. Separated Frente / Verso verification
    expect(screen.getByText(/Pergunta \/ Frente/i)).toBeTruthy();
    expect(screen.getByText(/O que é o gradiente eletroquímico\?/i)).toBeTruthy();

    expect(screen.getByText(/Resposta \/ Verso/i)).toBeTruthy();
    expect(screen.getByText(/É a combinação do gradiente químico de concentração/i)).toBeTruthy();

    // 4. Quick copy action button verification
    const copyBtn = screen.getByTitle('Copiar Frente e Verso do Flashcard');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.textContent).toContain('Copiar');
  });

  it('handles quick copy action and updates state to "Copiado!" with clipboard payload', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const content = `\`\`\`flashcard
Frente: 2 + 2?
Verso: 4
\`\`\``;

    render(<CopilotMessageContent content={content} />);

    const copyBtn = screen.getByTitle('Copiar Frente e Verso do Flashcard');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith('Frente: 2 + 2?\nVerso: 4');

    await waitFor(() => {
      expect(copyBtn.textContent).toContain('Copiado!');
    });
  });

  it('supports Front/Back aliases and multiline rich content with formatting', () => {
    const content = `\`\`\`flashcard
Front: Qual é a equação de **Einstein**?
Back: A equação é $E = mc^2$, onde:
* $E$ é energia
* $m$ é massa
\`\`\``;

    const { container } = render(<CopilotMessageContent content={content} />);

    expect(screen.getByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i)).toBeTruthy();
    expect(screen.getByText(/Qual é a equação de/i)).toBeTruthy();
    expect(container.querySelector('strong')?.textContent).toBe('Einstein');
    expect(screen.getByText(/A equação é/i)).toBeTruthy();
  });

  it('falls back to CodeSnippet when flashcard content is malformed (no frente and no verso)', () => {
    const malformedContent = `\`\`\`flashcard
Conteudo arbitrario sem campos de frente ou verso
\`\`\``;

    render(<CopilotMessageContent content={malformedContent} />);

    // Should not render the socratic badge
    expect(screen.queryByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i)).toBeNull();
    // Should render as standard code snippet with language "flashcard"
    expect(screen.getByText('flashcard')).toBeTruthy();
    expect(screen.getByText(/Conteudo arbitrario sem campos/i)).toBeTruthy();
  });

  it('checks behavior when only Frente is present without Verso', () => {
    const onlyFrente = `\`\`\`flashcard
Frente: Pergunta isolada sem verso
\`\`\``;
    const { container } = render(<CopilotMessageContent content={onlyFrente} />);
    const badge = screen.queryByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i);
    // If !frente && !verso is used, badge is rendered even when verso is completely absent!
    expect(badge).toBeTruthy();
    // The verso container is rendered empty:
    const versoContainer = container.querySelector('.border-emerald-500\\/20');
    expect(versoContainer).toBeTruthy();
  });


  it('renders multiple flashcards independently within the same assistant message', () => {
    const content = `\`\`\`flashcard
Frente: Cartão Alpha
Verso: Resposta Alpha
\`\`\`
Texto intermediário
\`\`\`flashcard
Frente: Cartão Beta
Verso: Resposta Beta
\`\`\``;

    render(<CopilotMessageContent content={content} />);

    const badges = screen.getAllByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i);
    expect(badges).toHaveLength(2);

    expect(screen.getByText(/Cartão Alpha/i)).toBeTruthy();
    expect(screen.getByText(/Resposta Alpha/i)).toBeTruthy();
    expect(screen.getByText(/Cartão Beta/i)).toBeTruthy();
    expect(screen.getByText(/Resposta Beta/i)).toBeTruthy();
  });

  it('does not format regular javascript code blocks as socratic cards', () => {
    const jsContent = `\`\`\`javascript
const answer = 42;
console.log(answer);
\`\`\``;

    render(<CopilotMessageContent content={jsContent} />);

    expect(screen.queryByText(/🎓 Conceito Socrático Dominado \(FSRS\)/i)).toBeNull();
    expect(screen.getByText('javascript')).toBeTruthy();
  });
});
