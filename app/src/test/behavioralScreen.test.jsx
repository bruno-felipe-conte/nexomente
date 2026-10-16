import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Study from '../pages/Study';
import FlashcardsPage from '../pages/Flashcards';
import NotasPage from '../pages/Notas';
import { useDBStore } from '../store/useDBStore';

describe('Validação Comportamental de Tela (Study, Flashcards, Notas)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await useDBStore.getState().init();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Fluxo 1 — Study.jsx (Timer de Contagem Regressiva e Sessões)', () => {
    it('inicia contagem, decresce a cada segundo, pausa sem perder tempo e conclui aos 0 segundos sob StrictMode', async () => {
      vi.useFakeTimers();

      const { XP, SessoesEstudo } = useDBStore.getState();
      const xpAddSpy = vi.spyOn(XP, 'add');
      const completarSpy = vi.spyOn(SessoesEstudo, 'completar');

      let utils;
      await act(async () => {
        utils = render(
          <React.StrictMode>
            <Study />
          </React.StrictMode>
        );
      });
      const { getByText } = utils;

      // 1. Muda para modo "Pausa Curta" (descanso de 5 min = 300s) para não exigir seleção prévia de matéria
      const btnDescanso = getByText(/Pausa Curta/i);
      fireEvent.click(btnDescanso);
      expect(getByText('05:00')).toBeDefined();

      // 2. Inicia o timer
      const btnIniciar = getByText(/Iniciar/i);
      act(() => {
        fireEvent.click(btnIniciar);
      });

      // Verifica que o botão virou "Pausar"
      expect(getByText(/Pausar/i)).toBeDefined();

      // 3. Avança o tempo em 3 segundos reais de timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 05:00 - 3s = 04:57
      expect(getByText('04:57')).toBeDefined();

      // 4. Pausa o timer
      const btnPausar = getByText(/Pausar/i);
      act(() => {
        fireEvent.click(btnPausar);
      });
      expect(getByText(/Iniciar/i)).toBeDefined();

      // Avança mais 5 segundos enquanto pausado: tempo NÃO deve mudar
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(getByText('04:57')).toBeDefined();

      // 5. Retoma o timer e avança até zerar (297 segundos restantes)
      act(() => {
        fireEvent.click(getByText(/Iniciar/i));
      });
      expect(getByText(/Pausar/i)).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(297000);
      });
      act(() => {
        vi.runOnlyPendingTimers();
      });

      // Ao zerar, timer para e botão volta para Iniciar
      expect(getByText(/Iniciar/i)).toBeDefined();

      // Confirma que XP.add e SessoesEstudo.completar foram chamados EXATAMENTE UMA VEZ na 1ª sessão
      expect(xpAddSpy).toHaveBeenCalledTimes(1);
      expect(completarSpy).toHaveBeenCalledTimes(1);

      // 6. Inicia uma SEGUNDA sessão logo em seguida
      act(() => {
        fireEvent.click(getByText(/Iniciar/i));
      });
      expect(getByText(/Pausar/i)).toBeDefined();

      // Avança a 2ª sessão até o fim
      act(() => {
        vi.advanceTimersByTime(300000);
      });
      act(() => {
        vi.runOnlyPendingTimers();
      });

      // Confirma que a 2ª sessão também concedeu XP com sucesso
      expect(xpAddSpy).toHaveBeenCalledTimes(2);
      expect(completarSpy).toHaveBeenCalledTimes(2);

      xpAddSpy.mockRestore();
      completarSpy.mockRestore();
    });

    it('marca sessão ativa como abandonada ao desmontar a tela antes da conclusão', async () => {
      vi.useFakeTimers();
      const { SessoesEstudo } = useDBStore.getState();
      const abandonarSpy = vi.spyOn(SessoesEstudo, 'abandonar');

      let utils;
      await act(async () => {
        utils = render(<Study />);
      });

      // Inicia sessão no modo descanso
      fireEvent.click(utils.getByText(/Pausa Curta/i));
      act(() => {
        fireEvent.click(utils.getByText(/Iniciar/i));
      });

      // Desmonta o componente com o timer ainda em andamento
      utils.unmount();

      // Deve ter chamado abandonar() para a sessão órfã
      expect(abandonarSpy).toHaveBeenCalledTimes(1);
      abandonarSpy.mockRestore();
    });
  });

  describe('Fluxo 2 — Flashcards.jsx (Estado Inicial, SM-2, Virar e Trocar Abas)', () => {
    it('renderiza card inicial, vira frente/verso, revisa e alterna abas de modo', async () => {
      // Cria 2 cards de teste no banco
      const { Flashcards } = useDBStore.getState();
      Flashcards.create({ frente: 'O que é IPC?', verso: 'Inter-Process Communication', materia: 'geral' });
      Flashcards.create({ frente: 'O que é Zustand?', verso: 'Gerenciador de estado', materia: 'geral' });

      let utils;
      await act(async () => {
        utils = render(<FlashcardsPage />);
      });
      const { getByText, getAllByText } = utils;

      // 1. Estado inicial em modo Revisar: exibe a frente do primeiro card
      expect(getByText(/O que é IPC\?/i)).toBeDefined();

      // 2. Vira o card (clica no card ou botão virar)
      const cardEl = getByText(/O que é IPC\?/i);
      act(() => {
        fireEvent.click(cardEl);
      });
      // Agora o verso está visível
      expect(getByText(/Inter-Process Communication/i)).toBeDefined();

      // 3. Avalia o card como "Fácil" (qualidade 5)
      const btnFacil = getByText(/Fácil/i);
      act(() => {
        fireEvent.click(btnFacil);
      });

      // Avançou para o próximo card: "O que é Zustand?"
      expect(getByText(/O que é Zustand\?/i)).toBeDefined();
      // O primeiro card disparou notificação de desfazer
      expect(getByText(/Desfazer/i)).toBeDefined();

      // 4. Alterna para a aba "Ver Todos"
      const btnVerTodos = getByText(/Ver Todos/i);
      act(() => {
        fireEvent.click(btnVerTodos);
      });
      expect(utils.getByPlaceholderText(/Buscar cards\.\.\./i)).toBeDefined();

      // 5. Alterna para a aba "Gerenciar"
      const btnGerenciar = getByText(/Gerenciar/i);
      act(() => {
        fireEvent.click(btnGerenciar);
      });
      expect(utils.getByPlaceholderText(/Buscar cards\.\.\./i)).toBeDefined();

      // 6. Volta para "Revisar"
      const btnRevisar = getAllByText(/^Revisar$/i)[0];
      act(() => {
        fireEvent.click(btnRevisar);
      });
      // Permanece funcional no modo revisão
      expect(utils.queryByPlaceholderText(/Buscar cards\.\.\./i)).toBeNull();
    });
  });

  describe('Fluxo 3 — Notas.jsx (Atalhos de Teclado)', () => {
    it('dispara Ctrl+Shift+N para criar nova nota e Escape para fechar painéis', async () => {
      let utils;
      await act(async () => {
        utils = render(<NotasPage />);
      });
      const { getByText, getAllByText, queryByText } = utils;

      // Estado inicial sem nota selecionada
      expect(getByText(/Selecione uma nota/i)).toBeDefined();

      // 1. Pressiona Ctrl+Shift+N globalmente
      act(() => {
        fireEvent.keyDown(window, {
          key: 'n',
          ctrlKey: true,
          shiftKey: true,
        });
      });

      // Nova nota criada e título "Nova Nota" passa a ser renderizado no editor e na lista
      expect(getAllByText(/Nova Nota/i).length).toBeGreaterThan(1);

      // 2. Abre painel de Informações (Info)
      const btnInfo = getAllByText(/^Info$/i)[0];
      act(() => {
        fireEvent.click(btnInfo);
      });
      expect(getByText(/Metadados/i)).toBeDefined();

      // 3. Pressiona Escape globalmente: deve fechar o painel de Metadados
      act(() => {
        fireEvent.keyDown(window, {
          key: 'Escape',
        });
      });
      expect(queryByText(/Metadados/i)).toBeNull();
    });

    it('cria nota dentro de uma biblioteca específica (ex: Livros) e preserva o conteúdo ao editar o título', async () => {
      let utils;
      await act(async () => {
        utils = render(<NotasPage />);
      });
      const { getByText, getByLabelText } = utils;

      // 1. Seleciona a biblioteca "Livros"
      const btnLivros = getByText('Livros');
      act(() => {
        fireEvent.click(btnLivros);
      });

      // 2. Clica em "+ Nova Nota" dentro da biblioteca Livros
      const btnNovaNota = getByText(/Nova Nota/i);
      act(() => {
        fireEvent.click(btnNovaNota);
      });

      // A nota criada deve aparecer listada na biblioteca Livros (não ficar vazia)
      const { Notas } = useDBStore.getState();
      const livros = Notas.getAll().filter(n => n.tipo === 'livro');
      expect(livros).toHaveLength(1);
      expect(livros[0].tipo).toBe('livro');

      // 3. Edita o título da nota e clica em Salvar
      const inputTitulo = getByLabelText('Título da nota');
      act(() => {
        fireEvent.change(inputTitulo, { target: { value: 'Dom Casmurro' } });
      });

      const btnSalvar = getByText('Salvar');
      act(() => {
        fireEvent.click(btnSalvar);
      });

      const notaSalva = Notas.getById(livros[0].id);
      expect(notaSalva.titulo).toBe('Dom Casmurro');
      expect(notaSalva.tipo).toBe('livro');
    });
  });
});
