import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import GeradorPage from '../pages/Gerador';
import AIChatPage from '../pages/AIChat';
import PoemasGerenciador from '../components/poemas/PoemasGerenciador';
import { useDBStore } from '../store/useDBStore';

describe('Refactored UI Pages & Components (Gerador, AIChat, PoemasGerenciador)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await useDBStore.getState().init();
  });

  it('GeradorPage renderiza e alterna entre abas (Criação, Banco, Desempenho, Organização)', () => {
    const { getByText } = render(<GeradorPage />);
    expect(getByText(/Gerador de Questões/i)).toBeDefined();

    // Aba Banco
    fireEvent.click(getByText(/Banco \(/i));
    expect(getByText(/Nenhuma questão encontrada/i)).toBeDefined();

    // Aba Desempenho
    fireEvent.click(getByText(/Desempenho/i));
    expect(getByText(/Por Matéria/i)).toBeDefined();

    // Aba Organização
    fireEvent.click(getByText(/Organização/i));
    expect(getByText(/Bancas/i)).toBeDefined();
  });

  it('AIChatPage renderiza estado inicial, templates e abre popovers de nota e modelo', async () => {
    let utils;
    await act(async () => {
      utils = render(<AIChatPage />);
    });
    const { getByText, getByPlaceholderText, getByTitle } = utils;
    expect(getByPlaceholderText(/Como posso ajudar você hoje\?/i)).toBeDefined();
    expect(getByText(/Estratégias/i)).toBeDefined();

    // Abre NoteAttachPopover
    fireEvent.click(getByTitle(/Anexar nota/i));
    expect(getByPlaceholderText(/Buscar nota para anexo/i)).toBeDefined();

    // Abre ModelSelectorPopover
    fireEvent.click(getByText(/gemma-4-E2B-it|gemini-1\.5-flash|Auto/i));
    expect(getByText(/Modelos Disponíveis/i)).toBeDefined();
  });

  it('PoemasGerenciador renderiza lista de poemas, alterna para Novo Poema e Importar com IA', () => {
    const { getByText } = render(
      <PoemasGerenciador onLeitura={() => {}} onSelectPoema={() => {}} />
    );
    expect(getByText(/Biblioteca Poética/i)).toBeDefined();

    // Alterna para Importar com IA
    fireEvent.click(getByText(/Importar com IA/i));
    expect(getByText(/Extração de Poemas/i)).toBeDefined();

    // Volta para gerenciador e abre Novo Poema
    fireEvent.click(getByText(/Cancelar/i));
    fireEvent.click(getByText(/Novo Poema/i));
    expect(getByText(/Corpo do Poema/i)).toBeDefined();
  });
});
